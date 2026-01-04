import { kv } from '@/lib/kv';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const gvcsParam = searchParams.get('gvcs'); // Comma-separated GVC IDs
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
        // Fetch recent activity from global history
        const feedData = await kv.lrange('history:global', 0, 99); // Fetch more to filter

        // Parse feed
        const allFeed = (feedData as string[] || []).map(itemStr => {
            try {
                return typeof itemStr === 'string' ? JSON.parse(itemStr) : itemStr;
            } catch (e) { return null; }
        }).filter(Boolean);

        let feed = allFeed;

        // Filter by GVC IDs if provided
        if (gvcsParam) {
            const gvcIds = gvcsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

            if (gvcIds.length > 0) {
                feed = allFeed.filter((item: any) => {
                    const winnerId = parseInt(item.winnerId || item.winner?.id || '0');
                    const loserId = parseInt(item.loserId || item.loser?.id || '0');
                    return gvcIds.includes(winnerId) || gvcIds.includes(loserId);
                });
            }
        }

        // Apply limit
        feed = feed.slice(0, limit);

        return NextResponse.json({ feed });
    } catch (error) {
        console.error('Activity API Error:', error);
        return NextResponse.json({ feed: [] });
    }
}
