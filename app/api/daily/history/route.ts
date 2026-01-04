/**
 * GET /api/daily/history
 * Returns past daily matchups with results
 */

import { NextResponse } from 'next/server';
import { getDailyHistory } from '@/lib/daily';
import { INITIAL_CHARACTERS } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '30', 10);

        const history = await getDailyHistory(Math.min(limit, 100));

        // Merge duplicates: Group by DATE and keep the entry with the most votes
        // (Fixes issue where multiple matchups exist for the same day)
        const mergedMap = new Map<string, any>();

        history.forEach(entry => {
            if (!entry.char1Id || !entry.char2Id) return;

            const dateKey = entry.dateKey;
            const totalVotes = (entry.votes1 || 0) + (entry.votes2 || 0);

            if (!mergedMap.has(dateKey)) {
                // First entry for this date
                mergedMap.set(dateKey, { ...entry, totalVotes });
            } else {
                const existing = mergedMap.get(dateKey);

                // Check if same pair (needs vote merging) or different pair (keep higher votes)
                const existingPair = [existing.char1Id, existing.char2Id].sort().join('-');
                const entryPair = [entry.char1Id, entry.char2Id].sort().join('-');

                if (existingPair === entryPair) {
                    // Same pair - merge votes
                    if (entry.char1Id === existing.char1Id) {
                        existing.votes1 += entry.votes1;
                        existing.votes2 += entry.votes2;
                    } else {
                        existing.votes1 += entry.votes2;
                        existing.votes2 += entry.votes1;
                    }
                    existing.totalVotes = existing.votes1 + existing.votes2;

                    // Recalculate winner
                    if (existing.votes1 > existing.votes2) {
                        existing.winnerId = existing.char1Id;
                    } else if (existing.votes2 > existing.votes1) {
                        existing.winnerId = existing.char2Id;
                    } else {
                        existing.winnerId = null;
                    }
                } else {
                    // Different pair on same date - keep the one with more votes
                    if (totalVotes > existing.totalVotes) {
                        mergedMap.set(dateKey, { ...entry, totalVotes });
                    }
                }
            }
        });

        const uniqueHistory = Array.from(mergedMap.values());

        // Enrich with character data
        const enrichedHistory = uniqueHistory.map(entry => {
            const char1 = INITIAL_CHARACTERS.find(c => c.id === entry.char1Id);
            const char2 = INITIAL_CHARACTERS.find(c => c.id === entry.char2Id);
            const winner = entry.winnerId
                ? INITIAL_CHARACTERS.find(c => c.id === entry.winnerId)
                : null;

            return {
                date: entry.dateKey,
                char1: char1 ? { id: char1.id, name: char1.name, url: char1.url } : null,
                char2: char2 ? { id: char2.id, name: char2.name, url: char2.url } : null,
                winner: winner ? { id: winner.id, name: winner.name, url: winner.url } : null,
                votes: { char1: entry.votes1, char2: entry.votes2 },
                isTie: entry.winnerId === null,
            };
        });

        return NextResponse.json({ history: enrichedHistory });
    } catch (error) {
        console.error('Error fetching daily history:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
