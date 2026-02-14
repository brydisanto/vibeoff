/**
 * GET /api/duos/matchup
 * OPTIMIZED: Uses Redis pipeline, non-blocking writes, and Edge Runtime
 * Get a random 2v2 matchup for voting
 */

import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Enable Edge Runtime for faster cold starts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

const DAILY_VOTE_LIMIT = 30;

function getDateKey(): string {
    return new Date().toISOString().split('T')[0];
}

interface DuoData {
    gvc1Id: number;
    gvc2Id: number;
    gvc1Name: string;
    gvc2Name: string;
    gvc1Url: string;
    gvc2Url: string;
    owner: string;
    wins: number;
    losses: number;
    matches: number;
    elo: number;
    createdAt: number;
}

export async function GET(request: NextRequest) {
    try {
        // Get or create device ID for vote tracking
        const cookieStore = cookies();
        let deviceId = cookieStore.get('duos_device_id')?.value;
        let isNewDevice = false;

        if (!deviceId) {
            deviceId = `duos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            isNewDevice = true;
        }

        const dateKey = getDateKey();
        const voteKey = `duos:votes:${dateKey}:${deviceId}`;
        const sessionId = request.headers.get('x-duos-session-id');
        const stateKey = sessionId ? `duos:state:${dateKey}:${sessionId}` : null;

        // ============================================================
        // OPTIMIZATION 1: Pipeline all initial reads into ONE round-trip
        // ============================================================
        const pipeline = kv.pipeline();
        if (stateKey) {
            pipeline.get(stateKey);
        }
        pipeline.get(voteKey);
        pipeline.zrange('duos:all', 0, -1);

        const pipelineResults = await pipeline.exec();

        // Parse pipeline results
        let resultIndex = 0;
        const lastAction = stateKey ? pipelineResults[resultIndex++] as string | null : null;
        const currentVotes = (pipelineResults[resultIndex++] as number) || 0;
        const allDuoIds = pipelineResults[resultIndex++] as string[];

        // ============================================================
        // OPTIMIZATION 2: Non-blocking writes (don't await)
        // ============================================================
        // Calculate refresh penalty
        const refreshPenalty = (sessionId && lastAction === 'fetch') ? 1 : 0;

        // Fire-and-forget writes (don't block response)
        if (stateKey) {
            kv.set(stateKey, 'fetch', { ex: 60 * 60 * 24 }); // Don't await
        }
        if (refreshPenalty > 0) {
            kv.incr(voteKey); // Don't await
            kv.expire(voteKey, 60 * 60 * 24); // Don't await
        }

        // Adjust vote count for penalty that will be applied
        const effectiveVotes = currentVotes + refreshPenalty;
        const remainingVotes = Math.max(0, DAILY_VOTE_LIMIT - effectiveVotes);

        // If user has no votes remaining, return early
        if (effectiveVotes >= DAILY_VOTE_LIMIT) {
            const response = NextResponse.json({
                error: 'No votes remaining',
                message: 'Daily vote limit reached. Come back tomorrow!',
                remainingVotes: 0,
                totalDuos: allDuoIds.length
            }, { status: 429 });

            if (isNewDevice) {
                response.cookies.set('duos_device_id', deviceId, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 365
                });
            }

            return response;
        }

        // Shuffle and pick candidates
        const shuffledIds = [...allDuoIds].sort(() => Math.random() - 0.5);
        const BATCH_SIZE = 4;
        const candidates = shuffledIds.slice(0, BATCH_SIZE);

        // Fetch all candidates in parallel
        const duoResults = await Promise.all(
            candidates.map(id => kv.hgetall(`duos:${id}`))
        );

        // Find 2 valid duos
        const validDuos: { id: string; data: DuoData }[] = [];
        for (let i = 0; i < duoResults.length; i++) {
            if (validDuos.length >= 2) break;

            const duoData = duoResults[i] as DuoData | null;
            const duoId = candidates[i];

            if (!duoData) {
                kv.zrem('duos:all', duoId); // Fire and forget cleanup
                continue;
            }

            validDuos.push({ id: duoId, data: duoData });
        }

        if (validDuos.length < 2) {
            const response = NextResponse.json({
                error: 'Not enough Duos',
                message: 'Need at least 2 valid Duos to start matchups',
                duoCount: allDuoIds.length,
                remainingVotes
            }, { status: 400 });

            if (isNewDevice) {
                response.cookies.set('duos_device_id', deviceId, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 365
                });
            }

            return response;
        }

        const [duo1, duo2] = validDuos;

        const response = NextResponse.json({
            matchup: [
                {
                    id: duo1.id,
                    gvc1: { id: duo1.data.gvc1Id, name: duo1.data.gvc1Name, url: duo1.data.gvc1Url },
                    gvc2: { id: duo1.data.gvc2Id, name: duo1.data.gvc2Name, url: duo1.data.gvc2Url },
                    owner: duo1.data.owner,
                    stats: { wins: duo1.data.wins || 0, losses: duo1.data.losses || 0, elo: duo1.data.elo || 1000 }
                },
                {
                    id: duo2.id,
                    gvc1: { id: duo2.data.gvc1Id, name: duo2.data.gvc1Name, url: duo2.data.gvc1Url },
                    gvc2: { id: duo2.data.gvc2Id, name: duo2.data.gvc2Name, url: duo2.data.gvc2Url },
                    owner: duo2.data.owner,
                    stats: { wins: duo2.data.wins || 0, losses: duo2.data.losses || 0, elo: duo2.data.elo || 1000 }
                }
            ],
            totalDuos: allDuoIds.length,
            remainingVotes
        });

        if (isNewDevice) {
            response.cookies.set('duos_device_id', deviceId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365
            });
        }

        return response;

    } catch (error) {
        console.error('Matchup error:', error);
        return NextResponse.json({ error: 'Failed to get matchup' }, { status: 500 });
    }
}
