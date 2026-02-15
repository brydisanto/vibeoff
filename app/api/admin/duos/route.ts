
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch all Duo IDs (reverse order for newest first)
        const duoIds = await kv.zrange('duos:all', 0, -1, { rev: true });

        if (!duoIds.length) {
            return NextResponse.json({ duos: [] });
        }

        const pipeline = kv.pipeline();
        duoIds.forEach((id) => pipeline.hgetall(`duos:${id}`));
        const results = await pipeline.exec();

        const duos = results.map((d: any, i) => ({
            id: duoIds[i],
            ...d
        })).filter(d => d.gvc1Id); // Basic filter for valid objects

        return NextResponse.json({ duos });
    } catch (error) {
        console.error('Admin List Error:', error);
        return NextResponse.json({ error: 'Failed to fetch duos' }, { status: 500 });
    }
}
