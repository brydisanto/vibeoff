import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { INITIAL_CHARACTERS } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Optimize character lookup
const characterMap = new Map(INITIAL_CHARACTERS.map(c => [c.id, c]));

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
        return NextResponse.json([]);
    }

    const ids = idsParam.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0);

    if (ids.length === 0) {
        return NextResponse.json([]);
    }

    try {
        const pipeline = kv.pipeline();

        // Fetch last 20 matches for each GVC to ensure we get a good recent mix
        ids.forEach(id => {
            pipeline.lrange(`history:${id}`, 0, 19);
        });

        const results = await pipeline.exec();

        let allHistory: any[] = [];

        results.forEach((list: any, index: number) => {
            const myId = ids[index];
            if (Array.isArray(list)) {
                const parsedList = list.map(item => {
                    try {
                        const data = typeof item === 'string' ? JSON.parse(item) : item;
                        // Enrich with own ID since history items don't strictly contain "myId" (implied by key)
                        // Actually they might not, so let's ensure we know who "we" are in this context
                        // The history item typically has: { opponentId, result, timestamp, ... }
                        // We need to know who the "owner" GVC was for rendering.

                        // Let's add 'gvcId' to the object for the frontend to know which of my GVCs this was
                        return { ...data, gvcId: myId };
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);
                allHistory = allHistory.concat(parsedList);
            }
        });

        // Dedup by unique event ID if possible, or just simple sort
        // If I own GVC A and GVC B, and A fought B:
        // A's history: { opponent: B, result: W }
        // B's history: { opponent: A, result: L }
        // We will have both.
        // We can keep both? "GVC A beat GVC B" and "GVC B lost to GVC A".
        // It's technically two perspective events. Let's keep both for now, consistent with "Recent Activity" for EACH gvc.

        // Sort by timestamp descending
        allHistory.sort((a, b) => b.timestamp - a.timestamp);

        // Limit to 50
        const recentHistory = allHistory.slice(0, 50);

        // Enrich opponent data
        const enrichedHistory = recentHistory.map(item => {
            const opponent = characterMap.get(item.opponentId);
            const me = characterMap.get(item.gvcId); // Also enrich 'me' for display

            return {
                ...item,
                opponentName: opponent ? opponent.name : `GVC #${item.opponentId}`,
                opponentUrl: opponent ? opponent.url : '',
                gvcName: me ? me.name : `GVC #${item.gvcId}`, // Name of the user's GVC
                gvcUrl: me ? me.url : '' // URL of the user's GVC
            };
        });

        return NextResponse.json(enrichedHistory);

    } catch (error) {
        console.error('Profile Activity API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
