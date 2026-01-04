/**
 * POST /api/sync-owners
 * Syncs GVC ownership data from OpenSea to Redis
 * 
 * Designed to be called by Vercel cron or manually triggered.
 * Processes in batches to respect rate limits.
 */

import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { headers } from 'next/headers';

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || '003c902b643e4b06b14ae18bda215739';
const GVC_CONTRACT = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';
const TOTAL_GVCS = 6969;

// Process in batches to avoid rate limits
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 1000; // 1 second

interface OwnerData {
    address: string;
    username: string | null;
    lastSynced: number;
}

async function fetchOwnerFromOpenSea(tokenId: number): Promise<OwnerData | null> {
    try {
        const response = await fetch(
            `https://api.opensea.io/api/v2/chain/ethereum/contract/${GVC_CONTRACT}/nfts/${tokenId}`,
            {
                headers: {
                    'X-API-KEY': OPENSEA_API_KEY,
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            console.error(`OpenSea API error for ${tokenId}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const owners = data?.nft?.owners || [];

        if (owners.length > 0) {
            const owner = owners[0];
            return {
                address: owner.address?.toLowerCase() || '',
                username: owner.username || null,
                lastSynced: Date.now()
            };
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch owner for ${tokenId}:`, error);
        return null;
    }
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
    try {
        // Optional auth check for cron
        const headersList = headers();
        const authHeader = headersList.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // If CRON_SECRET is set, require it
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const startId = body.startId || 1;
        const endId = body.endId || TOTAL_GVCS;
        const forceSync = body.force || false;

        let synced = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches
        for (let batchStart = startId; batchStart <= endId; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, endId);
            const batchPromises: Promise<void>[] = [];

            for (let tokenId = batchStart; tokenId <= batchEnd; tokenId++) {
                batchPromises.push((async () => {
                    // Check if we already have recent data (less than 24 hours old)
                    if (!forceSync) {
                        const existing = await kv.hgetall(`owner:${tokenId}`);
                        if (existing && existing.lastSynced) {
                            const lastSynced = Number(existing.lastSynced);
                            const age = Date.now() - lastSynced;
                            if (age < 24 * 60 * 60 * 1000) {
                                skipped++;
                                return;
                            }
                        }
                    }

                    const ownerData = await fetchOwnerFromOpenSea(tokenId);
                    if (ownerData) {
                        await kv.hset(`owner:${tokenId}`, ownerData as unknown as Record<string, unknown>);
                        synced++;
                    } else {
                        errors++;
                    }
                })());
            }

            await Promise.all(batchPromises);

            // Delay between batches to respect rate limits
            if (batchEnd < endId) {
                await sleep(DELAY_BETWEEN_BATCHES);
            }
        }

        return NextResponse.json({
            success: true,
            synced,
            skipped,
            errors,
            range: { startId, endId }
        });

    } catch (error) {
        console.error('Sync owners error:', error);
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}

// GET endpoint to check sync status
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sampleIds = [1, 100, 500, 1000, 2000, 3000, 4000, 5000, 6000, 6969];

    const samples: any[] = [];
    for (const id of sampleIds) {
        const data = await kv.hgetall(`owner:${id}`);
        samples.push({
            id,
            hasData: !!data,
            address: data?.address || null,
            lastSynced: data?.lastSynced ? new Date(Number(data.lastSynced)).toISOString() : null
        });
    }

    // Count total synced
    let totalSynced = 0;
    const checkBatch = [1, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 6969];
    for (const id of checkBatch) {
        const data = await kv.hgetall(`owner:${id}`);
        if (data?.address) totalSynced++;
    }

    return NextResponse.json({
        estimatedCoverage: `${Math.round((totalSynced / checkBatch.length) * 100)}%`,
        samples
    });
}
