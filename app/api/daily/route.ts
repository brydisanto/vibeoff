/**
 * GET /api/daily
 * Returns current daily matchup with vote counts and time remaining
 */

import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { getCurrentDaily, getNextRotationTime, hasVotedToday, getUserVoteToday } from '@/lib/daily';
import { INITIAL_CHARACTERS } from '@/lib/data';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = 'voter_device_id';

export async function GET() {
    try {
        const matchup = await getCurrentDaily();

        // Get character data
        const char1 = INITIAL_CHARACTERS.find(c => c.id === matchup.char1Id);
        const char2 = INITIAL_CHARACTERS.find(c => c.id === matchup.char2Id);

        if (!char1 || !char2) {
            return NextResponse.json({ error: 'Character not found' }, { status: 500 });
        }

        // Get IP
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
            headersList.get('x-real-ip') ||
            'unknown';

        // Get Cookie (Device ID)
        const cookieStore = cookies();
        const deviceId = cookieStore.get(COOKIE_NAME)?.value || 'unknown_device';

        const hasVoted = await hasVotedToday(ip, deviceId);
        const votedForId = hasVoted ? await getUserVoteToday(ip, deviceId) : null;
        const endsAt = getNextRotationTime();

        return NextResponse.json({
            matchup: {
                char1: {
                    id: char1.id,
                    name: char1.name,
                    url: char1.url,
                },
                char2: {
                    id: char2.id,
                    name: char2.name,
                    url: char2.url,
                },
            },
            votes: {
                char1: matchup.votes1,
                char2: matchup.votes2,
            },
            endsAt: endsAt.toISOString(),
            hasVoted,
            votedForId,
            dateKey: matchup.dateKey,
        });
    } catch (error) {
        console.error('Error fetching daily matchup:', error);
        return NextResponse.json({ error: 'Failed to fetch daily matchup' }, { status: 500 });
    }
}
