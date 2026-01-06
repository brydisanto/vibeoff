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
import { kv } from '@/lib/kv';

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

        // Get stats for premium display
        const stats1 = await kv.hgetall(`stats:alltime:${char1.id}`) as Record<string, number> || {};
        const stats2 = await kv.hgetall(`stats:alltime:${char2.id}`) as Record<string, number> || {};
        const winPct1 = (stats1.matches || 0) > 0 ? Math.round(((stats1.wins || 0) / stats1.matches) * 100) : 0;
        const winPct2 = (stats2.matches || 0) > 0 ? Math.round(((stats2.wins || 0) / stats2.matches) * 100) : 0;

        // Build Discord message - collage style with stats
        const messagePayload = {
            content: '# 🔥 THE DAILY VIBE OFF! 🔥\nOne matchup. 24 hours. Winner takes the vibes. **Vote below!**',
            embeds: [
                {
                    url: 'https://vibeoff.xyz/daily', // Same URL groups embeds side-by-side
                    color: 0xFFE048,
                    image: { url: char1.url },
                },
                {
                    url: 'https://vibeoff.xyz/daily',
                    color: 0xFFE048,
                    image: { url: char2.url },
                },
                {
                    description: `📊 **Stats:**\n• ${char1.name}: ${stats1.wins || 0}W - ${stats1.losses || 0}L (${winPct1}%)\n• ${char2.name}: ${stats2.wins || 0}W - ${stats2.losses || 0}L (${winPct2}%)\n\n⏰ Ends: **${endsAtFormatted}**`,
                    color: 0x2B2D31,
                    footer: {
                        text: 'Powered by @brydisanto',
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
                            label: `GVC #${char1.id}`,
                            custom_id: 'vote_1',
                            emoji: { name: '⬅️' },
                        },
                        {
                            type: 2, // Button
                            style: 1, // Primary (blue)  
                            label: `GVC #${char2.id}`,
                            custom_id: 'vote_2',
                            emoji: { name: '➡️' },
                        },
                    ],
                },
                {
                    type: 1, // Action Row
                    components: [
                        {
                            type: 2, // Button
                            style: 5, // Link
                            label: 'VOTE ON VIBEOFF.XYZ',
                            url: 'https://vibeoff.xyz/daily',
                        },
                        {
                            type: 2, // Button
                            style: 2, // Secondary (gray)
                            label: 'VIEW MATCHUP RESULTS',
                            custom_id: 'view_results',
                            emoji: { name: '📊' },
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
