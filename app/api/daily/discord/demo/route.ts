/**
 * POST /api/daily/discord/demo
 * Posts demo design options to Discord for comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentDaily } from '@/lib/daily';
import { INITIAL_CHARACTERS } from '@/lib/data';
import { kv } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || '1455619347547689064';

async function postToDiscord(payload: object) {
    const response = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return response.json();
}

export async function POST(request: NextRequest) {
    if (!DISCORD_BOT_TOKEN) {
        return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const option = searchParams.get('option') || 'B';

    const matchup = await getCurrentDaily();
    const char1 = INITIAL_CHARACTERS.find(c => c.id === matchup.char1Id);
    const char2 = INITIAL_CHARACTERS.find(c => c.id === matchup.char2Id);

    if (!char1 || !char2) {
        return NextResponse.json({ error: 'Characters not found' }, { status: 500 });
    }

    // Get stats for Option C
    const stats1 = await kv.hgetall(`stats:alltime:${char1.id}`) as any || {};
    const stats2 = await kv.hgetall(`stats:alltime:${char2.id}`) as any || {};

    let payload;

    if (option === 'B') {
        // Option B: Battle Arena - Blue vs Red
        payload = {
            content: '## **DESIGN OPTION B: Battle Arena**',
            embeds: [
                {
                    title: char1.name,
                    description: '⚔️ **CHALLENGER**',
                    url: 'https://vibeoff.xyz/daily',
                    color: 0x5865F2, // Discord Blue
                    image: { url: char1.url },
                },
                {
                    title: char2.name,
                    description: '⚔️ **DEFENDER**',
                    url: 'https://vibeoff.xyz/daily',
                    color: 0xED4245, // Discord Red
                    image: { url: char2.url },
                },
                {
                    description: '🏆 **Winner takes the vibes!**\n⏰ Voting ends: Tue Jan 6, 12:00 PM EST',
                    color: 0x2B2D31,
                }
            ],
        };
    } else if (option === 'C') {
        // Option C: Premium Stats Display
        const winPct1 = stats1.matches > 0 ? Math.round((stats1.wins / stats1.matches) * 100) : 0;
        const winPct2 = stats2.matches > 0 ? Math.round((stats2.wins / stats2.matches) * 100) : 0;

        payload = {
            content: '## **DESIGN OPTION C: Premium Stats**',
            embeds: [
                {
                    title: char1.name,
                    url: 'https://vibeoff.xyz/daily',
                    color: 0xFFE048,
                    image: { url: char1.url },
                    footer: { text: `${stats1.wins || 0}W - ${stats1.losses || 0}L | ${winPct1}% win rate` },
                },
                {
                    title: char2.name,
                    url: 'https://vibeoff.xyz/daily',
                    color: 0xFFE048,
                    image: { url: char2.url },
                    footer: { text: `${stats2.wins || 0}W - ${stats2.losses || 0}L | ${winPct2}% win rate` },
                },
                {
                    description: `📊 **Current Stats:**\n• ${char1.name}: ${stats1.wins || 0}W - ${stats1.losses || 0}L (${winPct1}%)\n• ${char2.name}: ${stats2.wins || 0}W - ${stats2.losses || 0}L (${winPct2}%)\n\n🗳️ ${matchup.votes1 + matchup.votes2} votes so far\n⏰ Ends: Tue Jan 6, 12:00 PM EST`,
                    color: 0x2B2D31,
                }
            ],
        };
    } else if (option === 'D') {
        // Option D: Minimal/Clean
        payload = {
            content: '## **DESIGN OPTION D: Minimal & Clean**',
            embeds: [
                {
                    url: 'https://vibeoff.xyz/daily',
                    color: 0xFFE048,
                    image: { url: char1.url },
                },
                {
                    url: 'https://vibeoff.xyz/daily',
                    color: 0xFFE048,
                    image: { url: char2.url },
                },
                {
                    title: `${char1.name} vs ${char2.name}`,
                    description: '⏰ Ends: Tue Jan 6, 12:00 PM EST\n🌐 [Vote on website](https://vibeoff.xyz/daily)',
                    color: 0x2B2D31,
                }
            ],
        };
    } else {
        return NextResponse.json({ error: 'Invalid option. Use B, C, or D' }, { status: 400 });
    }

    const result = await postToDiscord(payload);

    return NextResponse.json({ success: true, option, messageId: result.id });
}
