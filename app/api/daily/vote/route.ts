/**
 * POST /api/daily/vote
 * Cast a vote for the daily matchup
 */

import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { voteDailyMatchup } from '@/lib/daily';
import { randomUUID } from 'crypto';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'voter_device_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10; // 10 years

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { charId } = body;

        if (!charId || typeof charId !== 'number') {
            return NextResponse.json({ error: 'Invalid charId' }, { status: 400 });
        }

        // 1. Get IP
        const headersList = headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
            headersList.get('x-real-ip') ||
            'unknown';

        // 2. Get Cookie (Device ID)
        const cookieStore = cookies();
        let deviceId = cookieStore.get(COOKIE_NAME)?.value;
        let isNewDevice = false;

        if (!deviceId) {
            deviceId = randomUUID();
            isNewDevice = true;
        }

        // 3. Vote
        const result = await voteDailyMatchup(charId, ip, deviceId);

        if (!result.success) {
            return NextResponse.json({
                error: result.message,
                votes: { char1: result.votes1, char2: result.votes2 }
            }, { status: 400 });
        }

        // 4. Return response (setting cookie if new)
        const response = NextResponse.json({
            success: true,
            message: result.message,
            votes: { char1: result.votes1, char2: result.votes2 },
        });

        // Always set/refresh cookie to ensure persistence
        response.cookies.set({
            name: COOKIE_NAME,
            value: deviceId,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: COOKIE_MAX_AGE,
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Error voting on daily matchup:', error);
        return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
    }
}
