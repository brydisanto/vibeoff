/**
 * GET /api/owners
 * Returns owner data from Redis for specified GVC IDs
 * Used by the Leaderboard component for accurate collector grouping
 */

import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface OwnerData {
    address: string;
    username: string | null;
    lastSynced: number;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
        return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (ids.length === 0) {
        return NextResponse.json({ owners: {} });
    }

    // Limit to 500 IDs per request
    const limitedIds = ids.slice(0, 500);

    try {
        // Batch fetch from Redis
        const pipeline = kv.pipeline();
        limitedIds.forEach(id => {
            pipeline.hgetall(`owner:${id}`);
        });

        const results = await pipeline.exec();

        const owners: Record<number, OwnerData | null> = {};
        limitedIds.forEach((id, index) => {
            const data = results[index] as OwnerData | null;
            if (data && data.address) {
                owners[id] = {
                    address: data.address,
                    username: data.username || null,
                    lastSynced: Number(data.lastSynced) || 0
                };
            } else {
                owners[id] = null;
            }
        });

        return NextResponse.json({ owners });
    } catch (error) {
        console.error('Owners API error:', error);
        return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 });
    }
}
