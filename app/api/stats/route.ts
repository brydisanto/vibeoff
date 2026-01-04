import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',').filter(Boolean);

    if (!ids || ids.length === 0) {
        return NextResponse.json({ stats: {} });
    }

    try {
        const pipeline = kv.pipeline();
        ids.forEach(id => {
            pipeline.hgetall(`stats:alltime:${id}`);
        });

        const results = await pipeline.exec();
        const stats: Record<string, any> = {};

        ids.forEach((id, index) => {
            stats[id] = results[index] || { wins: 0, losses: 0, matches: 0 };
        });

        return NextResponse.json({ stats });
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
