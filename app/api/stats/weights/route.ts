/**
 * GET /api/stats/weights
 * Returns match counts for all characters to enable weighted matchup selection
 * Characters with fewer matches get higher selection weight
 */

import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Cache the weights for 5 minutes to avoid hammering Redis
let cachedWeights: Record<number, number> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const TOTAL_GVCS = 6969;

export async function GET() {
    const now = Date.now();

    // Return cached weights if still valid
    if (cachedWeights && (now - cacheTimestamp) < CACHE_TTL) {
        return NextResponse.json({
            weights: cachedWeights,
            cached: true,
            cacheAge: Math.round((now - cacheTimestamp) / 1000)
        });
    }

    try {
        // Fetch match counts in batches to avoid timeout
        const matchCounts: Record<number, number> = {};
        const BATCH_SIZE = 500;

        for (let start = 1; start <= TOTAL_GVCS; start += BATCH_SIZE) {
            const end = Math.min(start + BATCH_SIZE - 1, TOTAL_GVCS);
            const pipeline = kv.pipeline();

            for (let id = start; id <= end; id++) {
                pipeline.hget(`stats:alltime:${id}`, 'matches');
            }

            const results = await pipeline.exec();

            for (let i = 0; i < results.length; i++) {
                const id = start + i;
                const matches = typeof results[i] === 'number' ? results[i] :
                    typeof results[i] === 'string' ? parseInt(results[i]) : 0;
                matchCounts[id] = matches || 0;
            }
        }

        // Calculate weights: inverse of (matches + 1)
        // Characters with 0 matches get weight 1.0
        // Characters with 10 matches get weight ~0.09
        // Characters with 50 matches get weight ~0.02
        const weights: Record<number, number> = {};
        for (let id = 1; id <= TOTAL_GVCS; id++) {
            weights[id] = 1 / (matchCounts[id] + 1);
        }

        // Cache the result
        cachedWeights = weights;
        cacheTimestamp = now;

        return NextResponse.json({
            weights,
            cached: false,
            totalGVCs: TOTAL_GVCS
        });
    } catch (error) {
        console.error('Failed to calculate weights:', error);
        return NextResponse.json({ error: 'Failed to calculate weights' }, { status: 500 });
    }
}
