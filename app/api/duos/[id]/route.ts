/**
 * GET /api/duos/[id]
 * Get detailed stats for a specific DUO including battle history
 */

import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Normalize ID format: convert underscores to hyphens
        const duoId = params.id.replace(/_/g, '-');

        // Fetch DUO data
        const duoData = await kv.hgetall(`duos:${duoId}`) as DuoData | null;

        if (!duoData) {
            return NextResponse.json({ error: 'DUO not found' }, { status: 404 });
        }

        // Fetch history and rank
        const pipeline = kv.pipeline();

        // 1. Match History (Last 50)
        pipeline.lrange(`duos:history:${duoId}`, 0, 49);

        // 2. Get all DUO IDs to calculate rank
        pipeline.zrange('duos:all', 0, -1);

        const results = await pipeline.exec();

        const rawHistory = results[0] as any[] || [];
        const allDuoIds = results[1] as string[] || [];

        // Calculate rank by sorting all DUOs by wins
        const duosPipeline = kv.pipeline();
        allDuoIds.forEach(id => {
            duosPipeline.hgetall(`duos:${id}`);
        });
        const allDuosData = await duosPipeline.exec();

        const sortedDuos = allDuoIds
            .map((id, index) => {
                const data = allDuosData[index] as DuoData | null;
                return { id, wins: data?.wins || 0 };
            })
            .sort((a, b) => b.wins - a.wins);

        const rank = sortedDuos.findIndex(d => d.id === duoId) + 1;

        // Parse History
        const history = rawHistory.map((item: any) => {
            try {
                const data = typeof item === 'string' ? JSON.parse(item) : item;
                return {
                    opponentId: data.opponentId,
                    opponentGvc1: data.opponentGvc1 || null,
                    opponentGvc2: data.opponentGvc2 || null,
                    result: data.result,
                    timestamp: data.timestamp
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        const matches = (duoData.wins || 0) + (duoData.losses || 0);
        const winRate = matches > 0 ? Math.round(((duoData.wins || 0) / matches) * 100) : 0;

        return NextResponse.json({
            duo: {
                id: duoId,
                gvc1: { id: duoData.gvc1Id, name: duoData.gvc1Name, url: duoData.gvc1Url },
                gvc2: { id: duoData.gvc2Id, name: duoData.gvc2Name, url: duoData.gvc2Url },
                owner: duoData.owner
            },
            stats: {
                wins: duoData.wins || 0,
                losses: duoData.losses || 0,
                matches,
                winRate,
                elo: duoData.elo || 1000,
                rank: rank || 'Unranked'
            },
            history,
            totalDuos: allDuoIds.length
        });

    } catch (error) {
        console.error('DUO Details API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
