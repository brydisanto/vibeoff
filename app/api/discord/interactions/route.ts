/**
 * POST /api/discord/interactions
 * Handles Discord button interactions for voting on Daily matchups
 * 
 * This is the callback URL for Discord's Interactions Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { getCurrentDaily } from '@/lib/daily';
import { INITIAL_CHARACTERS } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Discord interaction types
const InteractionType = {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
};

const InteractionResponseType = {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
    DEFERRED_UPDATE_MESSAGE: 6,
    UPDATE_MESSAGE: 7,
};

// Verify Discord signature using nacl
async function verifyDiscordRequest(request: NextRequest, body: string): Promise<boolean> {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKey) {
        console.warn('DISCORD_PUBLIC_KEY not set, allowing request');
        return true; // Allow in development
    }

    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');

    if (!signature || !timestamp) {
        console.warn('Missing signature headers');
        return false;
    }

    try {
        // Use nacl for Ed25519 verification
        const nacl = await import('tweetnacl');

        // Convert hex strings to Uint8Array
        const sigBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const keyBytes = new Uint8Array(publicKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const msgBytes = new TextEncoder().encode(timestamp + body);

        const isValid = nacl.sign.detached.verify(msgBytes, sigBytes, keyBytes);
        console.log('Signature verification result:', isValid);
        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

function hexToUint8Array(hex: string): Uint8Array {
    const matches = hex.match(/.{1,2}/g);
    if (!matches) return new Uint8Array();
    return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

export async function POST(request: NextRequest) {
    const body = await request.text();

    // Verify Discord signature
    const isValid = await verifyDiscordRequest(request, body);
    if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const interaction = JSON.parse(body);

    // Handle PING (Discord verification)
    if (interaction.type === InteractionType.PING) {
        return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // Handle button interactions
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        const customId = interaction.data.custom_id;
        const discordUserId = interaction.member?.user?.id || interaction.user?.id;

        if (!discordUserId) {
            return NextResponse.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '❌ Could not identify user',
                    flags: 64, // Ephemeral
                }
            });
        }

        // Parse button ID: vote_1 or vote_2
        if (customId.startsWith('vote_')) {
            const choice = parseInt(customId.split('_')[1]);

            if (choice !== 1 && choice !== 2) {
                return NextResponse.json({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: '❌ Invalid vote',
                        flags: 64,
                    }
                });
            }

            // Get current matchup
            const matchup = await getCurrentDaily();
            const dateKey = matchup.dateKey;

            // Check if user already voted
            const voteKey = `daily:vote:discord:${dateKey}:${discordUserId}`;
            const existingVote = await kv.get(voteKey);

            if (existingVote) {
                return NextResponse.json({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ You already voted for today's matchup! Check the results at https://vibeoff.xyz/daily`,
                        flags: 64,
                    }
                });
            }

            // Record the vote
            await kv.set(voteKey, choice, { ex: 86400 * 2 }); // Expires in 2 days

            // Update vote count directly in matchup (same as website does)
            if (choice === 1) {
                matchup.votes1++;
            } else {
                matchup.votes2++;
            }
            await kv.set('daily:current', matchup);

            // Get updated stats
            const updatedMatchup = await getCurrentDaily();
            const char1 = INITIAL_CHARACTERS.find(c => c.id === updatedMatchup.char1Id);
            const char2 = INITIAL_CHARACTERS.find(c => c.id === updatedMatchup.char2Id);
            const votedChar = choice === 1 ? char1 : char2;

            const totalVotes = updatedMatchup.votes1 + updatedMatchup.votes2;
            const pct1 = totalVotes > 0 ? Math.round((updatedMatchup.votes1 / totalVotes) * 100) : 50;
            const pct2 = totalVotes > 0 ? Math.round((updatedMatchup.votes2 / totalVotes) * 100) : 50;

            return NextResponse.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `✅ You voted for **${votedChar?.name || 'GVC'}**!\n\n📊 Current standings:\n• ${char1?.name}: ${updatedMatchup.votes1} votes (${pct1}%)\n• ${char2?.name}: ${updatedMatchup.votes2} votes (${pct2}%)\n\n🔗 [View full results](https://vibeoff.xyz/daily)`,
                    flags: 64, // Ephemeral - only shown to voter
                }
            });
        }

        // Handle VIEW MATCHUP RESULTS button (view_results or view_results_YYYY-MM-DD)
        if (customId === 'view_results' || customId.startsWith('view_results_')) {
            // Parse dateKey from custom_id if present
            const parts = customId.split('_');
            const requestedDateKey = parts.length >= 3 ? parts.slice(2).join('_') : null;

            // Get current matchup to check if it's current or historical
            const currentMatchup = await getCurrentDaily();
            const isCurrentMatchup = !requestedDateKey || requestedDateKey === currentMatchup.dateKey;

            let char1Id: number, char2Id: number, votes1: number, votes2: number, dateKey: string;
            let matchupStatus: string;

            if (isCurrentMatchup) {
                // Show current matchup
                char1Id = currentMatchup.char1Id;
                char2Id = currentMatchup.char2Id;
                votes1 = currentMatchup.votes1;
                votes2 = currentMatchup.votes2;
                dateKey = currentMatchup.dateKey;
                matchupStatus = 'CURRENT MATCHUP';
            } else {
                // Fetch historical matchup from history (stored as zset)
                const historyData = await kv.zrange('daily:history', 0, 100) as any[];
                // Filter by dateKey and pick the one with most votes (the actual Daily matchup)
                const matchingEntries = historyData.filter((h: any) => h.dateKey === requestedDateKey);
                const historyEntry = matchingEntries.length > 0
                    ? matchingEntries.reduce((best: any, curr: any) =>
                        (curr.votes1 + curr.votes2) > (best.votes1 + best.votes2) ? curr : best
                    )
                    : null;

                if (!historyEntry) {
                    return NextResponse.json({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `❌ Could not find matchup results for ${requestedDateKey}`,
                            flags: 64,
                        }
                    });
                }

                char1Id = historyEntry.char1Id;
                char2Id = historyEntry.char2Id;
                votes1 = historyEntry.votes1;
                votes2 = historyEntry.votes2;
                dateKey = historyEntry.dateKey;
                matchupStatus = `FINAL RESULTS (${dateKey})`;
            }

            const char1 = INITIAL_CHARACTERS.find(c => c.id === char1Id);
            const char2 = INITIAL_CHARACTERS.find(c => c.id === char2Id);

            const totalVotes = votes1 + votes2;
            const pct1 = totalVotes > 0 ? Math.round((votes1 / totalVotes) * 100) : 50;
            const pct2 = totalVotes > 0 ? Math.round((votes2 / totalVotes) * 100) : 50;

            const winner = votes1 > votes2 ? char1?.name :
                votes2 > votes1 ? char2?.name : 'Tied';
            const winnerLabel = isCurrentMatchup ? '🏆 Leading' : '🏆 Winner';

            return NextResponse.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `📊 **${matchupStatus}**\n\n🔥 ${char1?.name} vs ${char2?.name}\n\n• ${char1?.name}: **${votes1}** votes (${pct1}%)\n• ${char2?.name}: **${votes2}** votes (${pct2}%)\n\n📈 Total votes: ${totalVotes}\n${winnerLabel}: **${winner}**\n\n🔗 [View on vibeoff.xyz](https://vibeoff.xyz/daily)`,
                    flags: 64, // Ephemeral
                }
            });
        }
    }

    // Default response
    return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: 'Unknown interaction',
            flags: 64,
        }
    });
}
