import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';
import { INITIAL_CHARACTERS, Character } from '@/lib/data';

// Helper to get character bio data by ID (from static data)
// Optimize lookup
const characterMap = new Map(INITIAL_CHARACTERS.map(c => [c.id, c]));
const getCharacterBase = (id: number) => characterMap.get(id);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    // Hardcode to allTime as requested
    const timeFrame = 'allTime';
    const redisKey = 'leaderboard:alltime';
    const statKeyPrefix = 'stats:alltime';

    try {
        // Fetch ALL ranked characters to support accurate Collector stats
        // zrange 0 -1 returns all elements
        const count = await kv.zcard(redisKey);
        const topIds: string[] = await kv.zrange(redisKey, 0, count > 0 ? count - 1 : -1, { rev: true });

        if (!topIds || topIds.length === 0) {
            return NextResponse.json({ characters: [] });
        }

        // For each ID, fetch their full stats
        // Batch requests to avoid hitting Upstash payload limits (avg pipeline limit is often 1-2MB/request)
        const batchSize = 250;
        const statsResults: any[] = [];

        for (let i = 0; i < topIds.length; i += batchSize) {
            const batch = topIds.slice(i, i + batchSize);
            const pipeline = kv.pipeline();
            batch.forEach(id => {
                pipeline.hgetall(`${statKeyPrefix}:${id}`);
            });
            const results = await pipeline.exec();
            statsResults.push(...(results || []));
        }

        // Merge static data with dynamic stats
        const characters: Character[] = topIds.map((idStr, index) => {
            const id = parseInt(idStr);
            const base = getCharacterBase(id);
            const stats: any = statsResults[index] || { wins: 0, losses: 0, matches: 0 };

            if (!base) return null;

            return {
                ...base,
                owner: stats.owner || base.owner,
                allTime: {
                    wins: Number(stats.wins || 0),
                    losses: Number(stats.losses || 0),
                    matches: Number(stats.matches || 0)
                },
                // Keep weekly zeroed out or mimic allTime if we remove weekly support
                weekly: { wins: 0, losses: 0, matches: 0 }
            };
        }).filter(Boolean) as Character[];

        return NextResponse.json({ characters }, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59'
            }
        });
    } catch (error) {
        console.error('Leaderboard API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
