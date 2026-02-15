
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

import { checkAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    if (!checkAdminAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { duoId } = body;

        if (!duoId) {
            return NextResponse.json({ error: 'Missing duoId' }, { status: 400 });
        }

        // Get Duo data to find owner and GVCs
        const duoData = await kv.hgetall(`duos:${duoId}`) as any;

        if (!duoData) {
            return NextResponse.json({ error: 'Duo not found' }, { status: 404 });
        }

        const owner = duoData.owner;
        const normalizedOwner = owner.toLowerCase();

        // Delete all associated keys
        const pipeline = kv.pipeline();

        pipeline.del(`duos:${duoId}`);
        pipeline.del(`duos:history:${duoId}`);
        pipeline.zrem('duos:all', duoId);
        pipeline.srem(`duos:wallet:${normalizedOwner}`, duoId);
        pipeline.del(`duos:gvc:${duoData.gvc1Id}`);
        pipeline.del(`duos:gvc:${duoData.gvc2Id}`);

        await pipeline.exec();

        return NextResponse.json({ success: true, deletedDuoId: duoId });

    } catch (error) {
        console.error('Admin Delete Error:', error);
        return NextResponse.json({ error: 'Failed to delete Duo' }, { status: 500 });
    }
}
