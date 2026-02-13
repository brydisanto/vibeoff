import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { INITIAL_CHARACTERS } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Optimize character lookup
const characterMap = new Map(INITIAL_CHARACTERS.map(c => [c.id, c]));

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get('ids');
    const duoIdsParam = searchParams.get('duoIds');

    if (!idsParam && !duoIdsParam) {
        return NextResponse.json([]);
    }

    const ids = idsParam ? idsParam.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0) : [];
    const duoIds = duoIdsParam ? duoIdsParam.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];

    if (ids.length === 0 && duoIds.length === 0) {
        return NextResponse.json([]);
    }

    try {
        const pipeline = kv.pipeline();

        // Fetch last 20 matches for each GVC
        ids.forEach(id => {
            pipeline.lrange(`history:${id}`, 0, 19);
        });

        // Fetch last 20 matches for each DUO
        duoIds.forEach(id => {
            pipeline.lrange(`duos:history:${id}`, 0, 19);
        });

        const results = await pipeline.exec();

        let allHistory: any[] = [];
        let resultIndex = 0;

        // Process GVC History
        ids.forEach(myId => {
            const list = results[resultIndex++];
            if (Array.isArray(list)) {
                const parsedList = list.map(item => {
                    try {
                        const data = typeof item === 'string' ? JSON.parse(item) : item;
                        return { ...data, gvcId: myId, type: 'gvc' };
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);
                allHistory = allHistory.concat(parsedList);
            }
        });

        // Process Duo History
        duoIds.forEach(myDuoId => {
            const list = results[resultIndex++];
            if (Array.isArray(list)) {
                const parsedList = list.map(item => {
                    try {
                        const data = typeof item === 'string' ? JSON.parse(item) : item;
                        return { ...data, duoId: myDuoId, type: 'duo' };
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);
                allHistory = allHistory.concat(parsedList);
            }
        });

        // Sort by timestamp descending
        allHistory.sort((a, b) => b.timestamp - a.timestamp);

        // Limit to 50
        const recentHistory = allHistory.slice(0, 50);

        // Enrich opponent data
        const enrichedHistory = recentHistory.map(item => {
            if (item.type === 'duo') {
                return {
                    ...item,
                    opponentName: `Duo vs ${item.opponentGvc1?.name || 'Unknown'}`,
                    opponentUrl: item.opponentGvc1?.url || '',
                    gvcName: `My Duo`,
                };
            }

            const opponent = characterMap.get(item.opponentId);
            const me = characterMap.get(item.gvcId);

            return {
                ...item,
                opponentName: opponent ? opponent.name : `GVC #${item.opponentId}`,
                opponentUrl: opponent ? opponent.url : '',
                gvcName: me ? me.name : `GVC #${item.gvcId}`,
                gvcUrl: me ? me.url : ''
            };
        });

        return NextResponse.json(enrichedHistory);

    } catch (error) {
        console.error('Profile Activity API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
