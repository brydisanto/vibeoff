
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_CHARACTERS } from '@/lib/data';

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { walletAddress, gvc1Id, gvc2Id } = body;

        if (!walletAddress || !gvc1Id || !gvc2Id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const lowerWallet = walletAddress.toLowerCase();

        // 1. Verify GVCs exist in metadata
        const char1 = INITIAL_CHARACTERS.find(c => c.id === gvc1Id);
        const char2 = INITIAL_CHARACTERS.find(c => c.id === gvc2Id);

        if (!char1 || !char2) {
            return NextResponse.json({ error: 'Invalid GVC IDs' }, { status: 400 });
        }

        // 2. Check if specific GVCs are already in a Duo (optional, but good practice to keep data clean)
        // Admin override can skip this, but let's warn or fail? Let's fail for data integrity.
        const [inDuo1, inDuo2] = await Promise.all([
            kv.exists(`duos:gvc:${gvc1Id}`),
            kv.exists(`duos:gvc:${gvc2Id}`)
        ]);

        if (inDuo1 || inDuo2) {
            return NextResponse.json({ error: 'One or both GVCs are already in a Duo' }, { status: 400 });
        }

        // 3. Create Duo
        const duoId = `${gvc1Id}-${gvc2Id}`; // Deterministic ID
        const now = Date.now();

        const duoData = {
            id: duoId,
            gvc1Id,
            gvc2Id,
            gvc1Name: char1.name,
            gvc2Name: char2.name,
            gvc1Url: char1.url,
            gvc2Url: char2.url,
            owner: lowerWallet,
            wins: 0,
            losses: 0,
            matches: 0,
            elo: 1000,
            createdAt: now
        };

        const pipeline = kv.pipeline();

        // Main record
        pipeline.hset(`duos:${duoId}`, duoData);

        // Global list (Sorted Set by creation time)
        pipeline.zadd('duos:all', { score: now, member: duoId });

        // Wallet list (Set)
        pipeline.sadd(`duos:wallet:${lowerWallet}`, duoId);

        // Indices for uniqueness check
        pipeline.set(`duos:gvc:${gvc1Id}`, duoId);
        pipeline.set(`duos:gvc:${gvc2Id}`, duoId);

        await pipeline.exec();

        return NextResponse.json({ success: true, duo: duoData });

    } catch (error) {
        console.error('Admin Create Error:', error);
        return NextResponse.json({ error: 'Failed to create Duo' }, { status: 500 });
    }
}
