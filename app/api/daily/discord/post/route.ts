/**
 * POST /api/daily/discord/post
 * Posts the daily matchup to the designated Discord channel
 * 
 * Called by Vercel cron at midnight UTC (when new matchup begins)
 * Can also be triggered manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentDaily, getNextRotationTime } from '@/lib/daily';
import { INITIAL_CHARACTERS } from '@/lib/data';

export const dynamic = 'force-dynamic';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || '1455619347547689064';

export async function POST(request: NextRequest) {
    if (!DISCORD_BOT_TOKEN) {
        return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
    }

    try {
        const matchup = await getCurrentDaily();

        const char1 = INITIAL_CHARACTERS.find(c => c.id === matchup.char1Id);
        const char2 = INITIAL_CHARACTERS.find(c => c.id === matchup.char2Id);

        if (!char1 || !char2) {
            return NextResponse.json({ error: 'Characters not found' }, { status: 500 });
        }

        const endsAt = getNextRotationTime();
        const endsAtFormatted = endsAt.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        // Build Discord message with embeds and buttons
        const messagePayload = {
            embeds: [
                {
                    title: '🔥 DAILY VIBE OFF! 🔥',
                    description: `Which GVC has the better vibes today?\n\n**Vote now and see who the community picks!**`,
                    color: 0xFFE048, // GVC Gold
                    fields: [
                        {
                            name: `🟡 ${char1.name}`,
                            value: `GVC #${char1.id}`,
                            inline: true,
                        },
                        {
                            name: '⚔️',
                            value: 'VS',
                            inline: true,
                        },
                        {
                            name: `🟡 ${char2.name}`,
                            value: `GVC #${char2.id}`,
                            inline: true,
                        },
                    ],
                    image: {
                        url: char1.url, // Show first character as main image
                    },
                    thumbnail: {
                        url: char2.url, // Show second as thumbnail
                    },
                    footer: {
                        text: `Ends: ${endsAtFormatted} • Vote on vibeoff.xyz/daily for full experience!`,
                    },
                    timestamp: new Date().toISOString(),
                }
            ],
            components: [
                {
                    type: 1, // Action Row
                    components: [
                        {
                            type: 2, // Button
                            style: 1, // Primary (blue)
                            label: `Vote ${char1.name}`,
                            custom_id: 'vote_1',
                            emoji: { name: '👈' },
                        },
                        {
                            type: 2, // Button
                            style: 1, // Primary (blue)  
                            label: `Vote ${char2.name}`,
                            custom_id: 'vote_2',
                            emoji: { name: '👉' },
                        },
                    ],
                },
                {
                    type: 1, // Action Row
                    components: [
                        {
                            type: 2, // Button
                            style: 5, // Link
                            label: 'Vote on Website',
                            url: 'https://vibeoff.xyz/daily',
                            emoji: { name: '🌐' },
                        },
                    ],
                },
            ],
        };

        // Send to Discord
        const response = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messagePayload),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Discord API error:', error);
            return NextResponse.json({ error: 'Failed to post to Discord', details: error }, { status: 500 });
        }

        const result = await response.json();

        return NextResponse.json({
            success: true,
            messageId: result.id,
            channelId: DISCORD_CHANNEL_ID,
            matchup: {
                char1: char1.name,
                char2: char2.name,
                dateKey: matchup.dateKey,
            }
        });

    } catch (error) {
        console.error('Error posting to Discord:', error);
        return NextResponse.json({ error: 'Failed to post to Discord' }, { status: 500 });
    }
}

// GET endpoint to check status
export async function GET() {
    return NextResponse.json({
        configured: !!DISCORD_BOT_TOKEN,
        channelId: DISCORD_CHANNEL_ID,
        status: DISCORD_BOT_TOKEN ? 'ready' : 'missing DISCORD_BOT_TOKEN',
    });
}
