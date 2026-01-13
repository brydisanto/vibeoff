/**
 * POST /api/duos/vote
 * Vote for a Duo in a matchup
 * 
 * Rate limited to 10 votes per day per device
 */

import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const DAILY_LIMIT = 10;

function getDateKey(): string {
    // Use EST timezone for day boundary
    const now = new Date();
    const estOffset = -5 * 60;
    const utcOffset = now.getTimezoneOffset();
    const estTime = new Date(now.getTime() + (utcOffset + estOffset) * 60 * 1000);
    return estTime.toISOString().split('T')[0];
}

interface VoteRequest {
    winnerDuoId: string;
    loserDuoId: string;
}

export async function POST(request: Request) {
    try {
        const body: VoteRequest = await request.json();
        const { winnerDuoId, loserDuoId } = body;

        if (!winnerDuoId || !loserDuoId) {
            return NextResponse.json({ error: 'Missing Duo IDs' }, { status: 400 });
        }

        if (winnerDuoId === loserDuoId) {
            return NextResponse.json({ error: 'Invalid vote' }, { status: 400 });
        }

        // Get device ID from cookie
        const cookieStore = cookies();
        let deviceId = cookieStore.get('device_id')?.value;

        if (!deviceId) {
            deviceId = crypto.randomUUID();
        }

        const dateKey = getDateKey();
        const voteCountKey = `duos:votes:${dateKey}:${deviceId}`;

        // Check vote count
        const currentVotes = await kv.get(voteCountKey) as number || 0;

        if (currentVotes >= DAILY_LIMIT) {
            return NextResponse.json({
                error: 'Daily vote limit reached',
                limit: DAILY_LIMIT,
                votesUsed: currentVotes
            }, { status: 429 });
        }

        // Verify both Duos exist
        const [winnerData, loserData] = await Promise.all([
            kv.hgetall(`duos:${winnerDuoId}`),
            kv.hgetall(`duos:${loserDuoId}`)
        ]);

        if (!winnerData || !loserData) {
            return NextResponse.json({ error: 'Duo not found' }, { status: 404 });
        }

        // Get current Elo ratings
        const winnerElo = typeof winnerData.elo === 'number' ? winnerData.elo : 1000;
        const loserElo = typeof loserData.elo === 'number' ? loserData.elo : 1000;

        // Calculate new Elo ratings
        const K = 32;
        const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
        const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

        const newWinnerElo = Math.round(winnerElo + K * (1 - expectedWinner));
        const newLoserElo = Math.round(loserElo + K * (0 - expectedLoser));

        // Update stats
        await Promise.all([
            // Winner stats
            kv.hincrby(`duos:${winnerDuoId}`, 'wins', 1),
            kv.hincrby(`duos:${winnerDuoId}`, 'matches', 1),
            kv.hset(`duos:${winnerDuoId}`, { elo: newWinnerElo }),
            // Loser stats
            kv.hincrby(`duos:${loserDuoId}`, 'losses', 1),
            kv.hincrby(`duos:${loserDuoId}`, 'matches', 1),
            kv.hset(`duos:${loserDuoId}`, { elo: newLoserElo }),
            // Increment vote count
            kv.incr(voteCountKey),
            // Set expiry on vote count key (2 days)
            kv.expire(voteCountKey, 86400 * 2)
        ]);

        const newVoteCount = currentVotes + 1;

        // Set device cookie if new
        const response = NextResponse.json({
            success: true,
            votesRemaining: DAILY_LIMIT - newVoteCount,
            winnerNewElo: newWinnerElo,
            loserNewElo: newLoserElo
        });

        if (!cookieStore.get('device_id')) {
            response.cookies.set('device_id', deviceId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365 // 1 year
            });
        }

        return response;

    } catch (error) {
        console.error('Duo vote error:', error);
        return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
    }
}

// GET endpoint to check remaining votes
export async function GET() {
    try {
        const cookieStore = cookies();
        const deviceId = cookieStore.get('device_id')?.value;

        if (!deviceId) {
            return NextResponse.json({ votesRemaining: DAILY_LIMIT, limit: DAILY_LIMIT });
        }

        const dateKey = getDateKey();
        const voteCountKey = `duos:votes:${dateKey}:${deviceId}`;
        const currentVotes = await kv.get(voteCountKey) as number || 0;

        return NextResponse.json({
            votesRemaining: Math.max(0, DAILY_LIMIT - currentVotes),
            votesUsed: currentVotes,
            limit: DAILY_LIMIT
        });

    } catch (error) {
        return NextResponse.json({ votesRemaining: DAILY_LIMIT, limit: DAILY_LIMIT });
    }
}
