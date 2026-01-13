/**
 * GET /api/duos/my-duos
 * Get all Duos submitted by a wallet address
 */

import { kv } from '@/lib/kv';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
    createdAt: number;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const wallet = searchParams.get('wallet');

        if (!wallet) {
            return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
        }

        const normalizedWallet = wallet.toLowerCase();

        // Get all Duo IDs for this wallet
        const duoIds = await kv.smembers(`duos:wallet:${normalizedWallet}`) as string[];

        if (duoIds.length === 0) {
            return NextResponse.json({ duos: [], count: 0 });
        }

        // Fetch all Duo data
        const pipeline = kv.pipeline();
        duoIds.forEach(id => {
            pipeline.hgetall(`duos:${id}`);
        });

        const results = await pipeline.exec();

        const duos = duoIds.map((id, index) => {
            const data = results[index] as DuoData;
            if (!data) return null;

            return {
                id,
                gvc1: {
                    id: data.gvc1Id,
                    name: data.gvc1Name,
                    url: data.gvc1Url
                },
                gvc2: {
                    id: data.gvc2Id,
                    name: data.gvc2Name,
                    url: data.gvc2Url
                },
                stats: {
                    wins: data.wins || 0,
                    losses: data.losses || 0,
                    matches: data.matches || 0,
                    elo: data.elo || 1000
                },
                createdAt: data.createdAt
            };
        }).filter(Boolean);

        return NextResponse.json({
            duos,
            count: duos.length
        });

    } catch (error) {
        console.error('My duos error:', error);
        return NextResponse.json({ error: 'Failed to fetch Duos' }, { status: 500 });
    }
}
