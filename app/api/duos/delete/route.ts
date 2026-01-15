/**
 * DELETE /api/duos/delete
 * Delete a Duo (only owner can delete)
 */

import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

export const dynamic = 'force-dynamic';

interface DeleteRequest {
    duoId: string;
    walletAddress: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: DeleteRequest = await request.json();
        const { duoId, walletAddress } = body;

        if (!duoId || !walletAddress) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const normalizedWallet = walletAddress.toLowerCase();

        // Get Duo data
        const duoData = await kv.hgetall(`duos:${duoId}`) as {
            gvc1Id: number;
            gvc2Id: number;
            owner: string;
        } | null;

        if (!duoData) {
            return NextResponse.json({ error: 'Duo not found' }, { status: 404 });
        }

        // Check ownership
        if (duoData.owner.toLowerCase() !== normalizedWallet) {
            return NextResponse.json({ error: 'You can only delete your own Duos' }, { status: 403 });
        }

        // Delete all associated keys
        await Promise.all([
            kv.del(`duos:${duoId}`),
            kv.del(`duos:gvc:${duoData.gvc1Id}`),
            kv.del(`duos:gvc:${duoData.gvc2Id}`),
            kv.zrem('duos:all', duoId),
            kv.srem(`duos:wallet:${normalizedWallet}`, duoId)
        ]);

        return NextResponse.json({ success: true, deletedDuoId: duoId });

    } catch (error) {
        console.error('Delete Duo error:', error);
        return NextResponse.json({ error: 'Failed to delete Duo' }, { status: 500 });
    }
}
