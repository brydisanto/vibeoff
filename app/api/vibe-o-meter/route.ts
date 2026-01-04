import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const now = Date.now();
        const currentBucket = Math.floor(now / (10 * 60 * 1000));
        const HISTORY_POINTS = 24; // 4 hours of history (24 * 10m)

        // Generate keys for the last 4 hours
        const keys: string[] = [];
        for (let i = HISTORY_POINTS - 1; i >= 0; i--) {
            keys.push(`stats:vol:${currentBucket - i}`);
        }

        const [globalCount, feedData, volumeCountsRaw] = await Promise.all([
            kv.get('global:votes'),
            kv.lrange('history:global', 0, 19), // Fetch last 20 matches for feed
            keys.length > 0 ? kv.mget(...keys) : []
        ]);

        const safeCount = globalCount ? parseInt(globalCount as string) : 0;

        // Format history
        // volumeCountsRaw is the array of strings (or nulls) from mget
        const volumeCounts = (volumeCountsRaw as (string | null)[] || []);

        const graphHistory = volumeCounts.map((val, index) => ({
            bucket: keys[index],
            value: val ? parseInt(val) : 0
        }));

        // Parse feed
        const feed = (feedData as string[] || []).map(itemStr => {
            try {
                return typeof itemStr === 'string' ? JSON.parse(itemStr) : itemStr;
            } catch (e) { return null; }
        }).filter(Boolean);

        return NextResponse.json({
            count: safeCount,
            history: graphHistory,
            feed
        });
    } catch (error) {
        console.error('Vibe Meter API Error:', error);
        return NextResponse.json({ count: 0, history: [] });
    }
}
