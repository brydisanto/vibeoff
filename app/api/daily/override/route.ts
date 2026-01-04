/**
 * POST /api/daily/override
 * Manually set a specific daily matchup (admin function)
 */

import { NextResponse } from 'next/server';
import { setManualMatchup } from '@/lib/daily';
import { INITIAL_CHARACTERS } from '@/lib/data';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { char1Id, char2Id, adminKey } = body;

        // Simple admin key check (you can make this more secure)
        const expectedKey = process.env.ADMIN_KEY || 'vibeoff-admin-2024';
        if (adminKey !== expectedKey) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!char1Id || !char2Id || typeof char1Id !== 'number' || typeof char2Id !== 'number') {
            return NextResponse.json({ error: 'Invalid character IDs' }, { status: 400 });
        }

        if (char1Id === char2Id) {
            return NextResponse.json({ error: 'Characters must be different' }, { status: 400 });
        }

        // Validate characters exist
        const char1 = INITIAL_CHARACTERS.find(c => c.id === char1Id);
        const char2 = INITIAL_CHARACTERS.find(c => c.id === char2Id);

        if (!char1 || !char2) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }

        const matchup = await setManualMatchup(char1Id, char2Id);

        return NextResponse.json({
            success: true,
            message: 'Manual matchup set',
            matchup: {
                char1: { id: char1.id, name: char1.name, url: char1.url },
                char2: { id: char2.id, name: char2.name, url: char2.url },
            },
            dateKey: matchup.dateKey,
        });
    } catch (error) {
        console.error('Error setting manual matchup:', error);
        return NextResponse.json({ error: 'Failed to set manual matchup' }, { status: 500 });
    }
}
