import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';
import { INITIAL_CHARACTERS } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Optimize character lookup
const characterMap = new Map(INITIAL_CHARACTERS.map(c => [c.id, c]));

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        if (isNaN(id) || !characterMap.has(id)) {
            return NextResponse.json({ error: 'GVC not found' }, { status: 404 });
        }

        const character = characterMap.get(id)!;

        // Fetch Stats (Pipeline for efficiency)
        const pipeline = kv.pipeline();

        // 1. All Time Stats
        pipeline.hgetall(`stats:alltime:${id}`);

        // 2. Weekly Stats
        pipeline.hgetall(`stats:weekly:${id}`);

        // 3. Match History (Last 50)
        pipeline.lrange(`history:${id}`, 0, 49);

        // 4. Rank (ZREVREANK returns 0-based index, so +1)
        pipeline.zrevrank('leaderboard:alltime', String(id));

        const results = await pipeline.exec();

        const allTimeStats = (results[0] as any) || { wins: 0, losses: 0, matches: 0 };
        const weeklyStats = (results[1] as any) || { wins: 0, losses: 0, matches: 0 };
        const rawHistory = results[2] as any[] || [];
        const rankIndex = results[3] as number | null;

        // Parse History
        const history = rawHistory.map((item: any) => {
            try {
                const data = typeof item === 'string' ? JSON.parse(item) : item;
                const opponent = characterMap.get(data.opponentId);
                return {
                    ...data,
                    opponent: opponent ? {
                        id: opponent.id,
                        name: opponent.name,
                        url: opponent.url
                    } : null
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        const rank = rankIndex !== null ? rankIndex + 1 : 'Unranked';

        return NextResponse.json({
            character: {
                ...character,
                owner: allTimeStats.owner || character.owner
            },
            stats: {
                allTime: allTimeStats,
                weekly: weeklyStats,
                rank
            },
            history
        });

    } catch (error) {
        console.error('GVC Details API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
