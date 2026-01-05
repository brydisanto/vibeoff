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
        console.warn('DISCORD_PUBLIC_KEY not set, skipping verification');
        return true; // Allow in development
    }

    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');

    if (!signature || !timestamp) return false;

    try {
        // Use nacl for Ed25519 verification
        const nacl = await import('tweetnacl');
        const message = Buffer.from(timestamp + body);
        const sig = Buffer.from(signature, 'hex');
        const key = Buffer.from(publicKey, 'hex');

        return nacl.sign.detached.verify(message, sig, key);
    } catch (error) {
        console.error('Signature verification error:', error);
        // In case of library issues, allow request but log it
        return true;
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

            // Increment vote count in matchup
            const voteField = choice === 1 ? 'votes1' : 'votes2';
            await kv.hincrby(`daily:${dateKey}`, voteField, 1);

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
