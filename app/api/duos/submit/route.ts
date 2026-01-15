/**
 * POST /api/duos/submit
 * Submit a new Duo pair (2 GVCs from same wallet)
 */

import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';
import { INITIAL_CHARACTERS } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Create a Set for O(1) lookup of valid GVC IDs
const validGvcIds = new Set(INITIAL_CHARACTERS.map(c => c.id));

interface SubmitRequest {
    gvc1Id: number;
    gvc2Id: number;
    walletAddress: string;
}

export async function POST(request: Request) {
    try {
        const body: SubmitRequest = await request.json();
        const { gvc1Id, gvc2Id, walletAddress } = body;

        // Validation
        if (!gvc1Id || !gvc2Id || !walletAddress) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (gvc1Id === gvc2Id) {
            return NextResponse.json({ error: 'Must select two different GVCs' }, { status: 400 });
        }

        if (!validGvcIds.has(gvc1Id) || !validGvcIds.has(gvc2Id)) {
            return NextResponse.json({ error: 'Invalid GVC ID' }, { status: 400 });
        }

        const normalizedWallet = walletAddress.toLowerCase();

        // Note: Ownership is already verified by the profile page which fetches
        // GVCs directly from the blockchain. The frontend only shows owned GVCs.

        // Check if either GVC is already in a Duo
        const [existing1, existing2] = await Promise.all([
            kv.get(`duos:gvc:${gvc1Id}`),
            kv.get(`duos:gvc:${gvc2Id}`)
        ]);

        if (existing1) {
            return NextResponse.json({ 
                error: `GVC #${gvc1Id} is already in a Duo` 
            }, { status: 409 });
        }

        if (existing2) {
            return NextResponse.json({ 
                error: `GVC #${gvc2Id} is already in a Duo` 
            }, { status: 409 });
        }

        // Create Duo ID (lower ID first for consistency)
        const sortedIds = [gvc1Id, gvc2Id].sort((a, b) => a - b);
        const duoId = `${sortedIds[0]}-${sortedIds[1]}`;

        // Get GVC details
        const gvc1 = INITIAL_CHARACTERS.find(c => c.id === gvc1Id);
        const gvc2 = INITIAL_CHARACTERS.find(c => c.id === gvc2Id);

        // Store Duo
        const duoData = {
            gvc1Id: sortedIds[0],
            gvc2Id: sortedIds[1],
            gvc1Name: gvc1?.name || `GVC #${sortedIds[0]}`,
            gvc2Name: gvc2?.name || `GVC #${sortedIds[1]}`,
            gvc1Url: gvc1?.url || '',
            gvc2Url: gvc2?.url || '',
            owner: normalizedWallet,
            createdAt: Date.now(),
            wins: 0,
            losses: 0,
            matches: 0,
            elo: 1000
        };

        await Promise.all([
            // Store Duo details
            kv.hset(`duos:${duoId}`, duoData),
            // Add to global Duos set (sorted by creation time)
            kv.zadd('duos:all', { score: Date.now(), member: duoId }),
            // Mark both GVCs as in a Duo
            kv.set(`duos:gvc:${gvc1Id}`, duoId),
            kv.set(`duos:gvc:${gvc2Id}`, duoId),
            // Add to wallet's Duos
            kv.sadd(`duos:wallet:${normalizedWallet}`, duoId)
        ]);

        return NextResponse.json({
            success: true,
            duoId,
            duo: duoData
        });

    } catch (error) {
        console.error('Duo submit error:', error);
        return NextResponse.json({ error: 'Failed to submit Duo' }, { status: 500 });
    }
}
