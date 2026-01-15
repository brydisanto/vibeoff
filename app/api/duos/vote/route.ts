/**
 * POST /api/duos/vote
 * Vote on a Duo matchup (10 votes/day limit)
 * GET /api/duos/vote - Get remaining votes for today
 */

import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

export const dynamic = 'force-dynamic';

const DAILY_VOTE_LIMIT = 10;
const K_FACTOR = 32;

function getDateKey(): string {
    return new Date().toISOString().split('T')[0];
}

function calculateExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export async function GET() {
    try {
        const cookieStore = cookies();
        let deviceId = cookieStore.get('duos_device_id')?.value;

        if (!deviceId) {
            return NextResponse.json({
                remainingVotes: DAILY_VOTE_LIMIT,
                totalVotes: DAILY_VOTE_LIMIT
            });
        }

        const dateKey = getDateKey();
        const voteCount = await kv.get(`duos:votes:${dateKey}:${deviceId}`) as number || 0;
        const remaining = Math.max(0, DAILY_VOTE_LIMIT - voteCount);

        return NextResponse.json({
            remainingVotes: remaining,
            totalVotes: DAILY_VOTE_LIMIT,
            votesToday: voteCount
        });

    } catch (error) {
        console.error('Get votes error:', error);
        return NextResponse.json({ error: 'Failed to get vote count' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { winnerId, loserId } = body;

        if (!winnerId || !loserId) {
            return NextResponse.json({ error: 'Missing winnerId or loserId' }, { status: 400 });
        }

        // Get or create device ID
        const cookieStore = cookies();
        let deviceId = cookieStore.get('duos_device_id')?.value;

        if (!deviceId) {
            deviceId = `duos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }

        const dateKey = getDateKey();
        const voteKey = `duos:votes:${dateKey}:${deviceId}`;

        // Check vote limit
        const currentVotes = await kv.get(voteKey) as number || 0;
        if (currentVotes >= DAILY_VOTE_LIMIT) {
            return NextResponse.json({
                error: 'Daily vote limit reached',
                remainingVotes: 0
            }, { status: 429 });
        }

        // Get current Duo stats
        const [winnerData, loserData] = await Promise.all([
            kv.hgetall(`duos:${winnerId}`),
            kv.hgetall(`duos:${loserId}`)
        ]) as [{ wins?: number; losses?: number; matches?: number; elo?: number } | null, { wins?: number; losses?: number; matches?: number; elo?: number } | null];

        if (!winnerData || !loserData) {
            return NextResponse.json({ error: 'Invalid Duo IDs' }, { status: 400 });
        }

        const winnerElo = winnerData.elo || 1000;
        const loserElo = loserData.elo || 1000;

        // Calculate new Elo ratings
        const expectedWinner = calculateExpectedScore(winnerElo, loserElo);
        const expectedLoser = calculateExpectedScore(loserElo, winnerElo);
        const newWinnerElo = Math.round(winnerElo + K_FACTOR * (1 - expectedWinner));
        const newLoserElo = Math.round(loserElo + K_FACTOR * (0 - expectedLoser));

        // Update stats
        await Promise.all([
            kv.hincrby(`duos:${winnerId}`, 'wins', 1),
            kv.hincrby(`duos:${winnerId}`, 'matches', 1),
            kv.hset(`duos:${winnerId}`, { elo: newWinnerElo }),
            kv.hincrby(`duos:${loserId}`, 'losses', 1),
            kv.hincrby(`duos:${loserId}`, 'matches', 1),
            kv.hset(`duos:${loserId}`, { elo: newLoserElo }),
            kv.incr(voteKey),
            kv.expire(voteKey, 86400 * 2) // 2 days TTL
        ]);

        const newVoteCount = currentVotes + 1;
        const response = NextResponse.json({
            success: true,
            winner: { id: winnerId, newElo: newWinnerElo },
            loser: { id: loserId, newElo: newLoserElo },
            remainingVotes: Math.max(0, DAILY_VOTE_LIMIT - newVoteCount)
        });

        // Set device cookie
        response.cookies.set('duos_device_id', deviceId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365 // 1 year
        });

        return response;

    } catch (error) {
        console.error('Vote error:', error);
        return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
    }
}
