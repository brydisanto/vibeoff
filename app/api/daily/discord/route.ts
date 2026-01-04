/**
 * GET /api/daily/discord
 * Returns Discord-embed-friendly data for the daily matchup
 * 
 * Can be used with Discord webhooks or bots to post daily matchups
 */

import { NextResponse } from 'next/server';
import { getCurrentDaily, getNextRotationTime } from '@/lib/daily';
import { INITIAL_CHARACTERS } from '@/lib/data';

export async function GET() {
    try {
        const matchup = await getCurrentDaily();

        const char1 = INITIAL_CHARACTERS.find(c => c.id === matchup.char1Id);
        const char2 = INITIAL_CHARACTERS.find(c => c.id === matchup.char2Id);

        if (!char1 || !char2) {
            return NextResponse.json({ error: 'Character not found' }, { status: 500 });
        }

        const endsAt = getNextRotationTime();
        const totalVotes = matchup.votes1 + matchup.votes2;

        // Discord embed format
        const embed = {
            title: '🔥 DAILY VIBE OFF 🔥',
            description: `**${char1.name}** vs **${char2.name}**`,
            color: 0xFFCC4E, // GVC Gold
            fields: [
                {
                    name: `👈 ${char1.name}`,
                    value: `${matchup.votes1} votes`,
                    inline: true,
                },
                {
                    name: 'VS',
                    value: '⚔️',
                    inline: true,
                },
                {
                    name: `${char2.name} 👉`,
                    value: `${matchup.votes2} votes`,
                    inline: true,
                },
            ],
            footer: {
                text: `Total votes: ${totalVotes} | Ends at ${endsAt.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`,
            },
            timestamp: new Date().toISOString(),
        };

        // Raw data for custom integrations
        const rawData = {
            char1: {
                id: char1.id,
                name: char1.name,
                url: char1.url,
                votes: matchup.votes1,
            },
            char2: {
                id: char2.id,
                name: char2.name,
                url: char2.url,
                votes: matchup.votes2,
            },
            voteUrl: 'https://vibeoff.xyz/daily',
            endsAt: endsAt.toISOString(),
            dateKey: matchup.dateKey,
        };

        return NextResponse.json({
            embed,
            raw: rawData,
        });
    } catch (error) {
        console.error('Error generating Discord data:', error);
        return NextResponse.json({ error: 'Failed to generate Discord data' }, { status: 500 });
    }
}
