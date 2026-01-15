/**
 * GET /api/duos/leaderboard
 * Get the DUOS leaderboard (separate from regular Vibe Off stats)
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
}

export async function GET() {
    try {
        // Get all Duo IDs
        const allDuoIds = await kv.zrange('duos:all', 0, -1) as string[];

        if (allDuoIds.length === 0) {
            return NextResponse.json({ duos: [], totalDuos: 0 });
        }

        // Fetch all Duo data
        const pipeline = kv.pipeline();
        allDuoIds.forEach(id => {
            pipeline.hgetall(`duos:${id}`);
        });

        const results = await pipeline.exec();

        const duos = allDuoIds.map((id, index) => {
            const data = results[index] as DuoData | null;
            if (!data) return null;

            const matches = (data.wins || 0) + (data.losses || 0);
            const winRate = matches > 0 ? Math.round(((data.wins || 0) / matches) * 100) : 0;

            return {
                id,
                gvc1: { id: data.gvc1Id, name: data.gvc1Name, url: data.gvc1Url },
                gvc2: { id: data.gvc2Id, name: data.gvc2Name, url: data.gvc2Url },
                owner: data.owner,
                wins: data.wins || 0,
                losses: data.losses || 0,
                matches,
                winRate,
                elo: data.elo || 1000
            };
        }).filter(Boolean);

        // Sort by wins, then by win rate
        duos.sort((a, b) => {
            if (!a || !b) return 0;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.winRate - a.winRate;
        });

        return NextResponse.json({
            duos,
            totalDuos: duos.length
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 });
    }
}
