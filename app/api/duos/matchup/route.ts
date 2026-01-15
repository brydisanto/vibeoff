/**
 * GET /api/duos/matchup
 * Get a random 2v2 matchup for voting
 */

import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

export const dynamic = 'force-dynamic';

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

export async function GET() {
    try {
        // Get all Duo IDs
        const allDuoIds = await kv.zrange('duos:all', 0, -1) as string[];

        if (allDuoIds.length < 2) {
            return NextResponse.json({
                error: 'Not enough Duos',
                message: 'Need at least 2 Duos to start matchups',
                duoCount: allDuoIds.length
            }, { status: 400 });
        }

        // Pick 2 random distinct Duos
        const idx1 = Math.floor(Math.random() * allDuoIds.length);
        let idx2 = Math.floor(Math.random() * allDuoIds.length);
        while (idx2 === idx1) {
            idx2 = Math.floor(Math.random() * allDuoIds.length);
        }

        const duo1Id = allDuoIds[idx1];
        const duo2Id = allDuoIds[idx2];

        // Fetch both Duos' data
        const [duo1Raw, duo2Raw] = await Promise.all([
            kv.hgetall(`duos:${duo1Id}`),
            kv.hgetall(`duos:${duo2Id}`)
        ]);

        const duo1Data = duo1Raw as DuoData | null;
        const duo2Data = duo2Raw as DuoData | null;

        if (!duo1Data || !duo2Data) {
            return NextResponse.json({ error: 'Failed to load Duo data' }, { status: 500 });
        }

        return NextResponse.json({
            matchup: [
                {
                    id: duo1Id,
                    gvc1: { id: duo1Data.gvc1Id, name: duo1Data.gvc1Name, url: duo1Data.gvc1Url },
                    gvc2: { id: duo1Data.gvc2Id, name: duo1Data.gvc2Name, url: duo1Data.gvc2Url },
                    owner: duo1Data.owner,
                    stats: { wins: duo1Data.wins || 0, losses: duo1Data.losses || 0, elo: duo1Data.elo || 1000 }
                },
                {
                    id: duo2Id,
                    gvc1: { id: duo2Data.gvc1Id, name: duo2Data.gvc1Name, url: duo2Data.gvc1Url },
                    gvc2: { id: duo2Data.gvc2Id, name: duo2Data.gvc2Name, url: duo2Data.gvc2Url },
                    owner: duo2Data.owner,
                    stats: { wins: duo2Data.wins || 0, losses: duo2Data.losses || 0, elo: duo2Data.elo || 1000 }
                }
            ],
            totalDuos: allDuoIds.length
        });

    } catch (error) {
        console.error('Matchup error:', error);
        return NextResponse.json({ error: 'Failed to get matchup' }, { status: 500 });
    }
}
