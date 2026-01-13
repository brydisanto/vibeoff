/**
 * GET /api/duos/matchup
 * Get a random 2v2 matchup for voting
 */

import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';

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
}

export async function GET() {
    try {
        // Get all Duo IDs
        const allDuoIds = await kv.zrange('duos:all', 0, -1) as string[];

        if (allDuoIds.length < 2) {
            return NextResponse.json({
                error: 'Not enough Duos submitted yet. Need at least 2 Duos to start matchups.',
                duoCount: allDuoIds.length
            }, { status: 404 });
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

        // Format response
        const formatDuo = (id: string, data: DuoData) => ({
            id,
            gvc1: {
                id: data.gvc1Id,
                name: data.gvc1Name,
                url: data.gvc1Url
            },
            gvc2: {
                id: data.gvc2Id,
                name: data.gvc2Name,
                url: data.gvc2Url
            },
            owner: data.owner,
            stats: {
                wins: data.wins || 0,
                losses: data.losses || 0,
                matches: data.matches || 0,
                elo: data.elo || 1000
            }
        });

        return NextResponse.json({
            duo1: formatDuo(duo1Id, duo1Data),
            duo2: formatDuo(duo2Id, duo2Data),
            totalDuos: allDuoIds.length
        });

    } catch (error) {
        console.error('Matchup error:', error);
        return NextResponse.json({ error: 'Failed to generate matchup' }, { status: 500 });
    }
}
