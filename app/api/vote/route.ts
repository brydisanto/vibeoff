import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';
import { INITIAL_CHARACTERS } from '@/lib/data';
import { checkRateLimit } from '@/lib/ratelimit';
import { headers } from 'next/headers';

// Create a Map for O(1) lookup
const characterMap = new Map(INITIAL_CHARACTERS.map((char, index) => [char.id, index]));

export async function POST(request: Request) {
    try {
        // Rate Limiting
        const headersList = headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

        const rateLimit = await checkRateLimit(ip);

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Too many votes! Slow down.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': rateLimit.limit.toString(),
                        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                        'X-RateLimit-Reset': rateLimit.reset.toString()
                    }
                }
            );
        }

        const body = await request.json();
        const { winnerId, loserId, walletAddress } = body;

        if (!winnerId || !loserId) {
            return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
        }

        // Server-side daily limit enforcement (prevents over-voting from client race conditions)
        if (walletAddress && typeof walletAddress === 'string') {
            const normalizedWallet = walletAddress.toLowerCase();
            const utcDateKey = new Date().toISOString().split('T')[0];
            const dailyCounterKey = `votes:wallet:${normalizedWallet}:daily:${utcDateKey}`;

            const bonusKey = `user:${normalizedWallet}:bonus:1v1:${utcDateKey}`;
            const bonusVotes = (await kv.get(bonusKey) as number) || 0;
            const dailyLimit = 69 + bonusVotes;

            // Atomic increment
            const newVotes = await kv.incr(dailyCounterKey);
            if (newVotes > dailyLimit) {
                await kv.decr(dailyCounterKey); // Rollback
                return NextResponse.json(
                    { error: 'Daily limit reached', votesToday: dailyLimit, dailyLimit },
                    { status: 429 }
                );
            }
            await kv.expire(dailyCounterKey, 60 * 60 * 48); // 48h TTL
        }

        // --- Weekly Stats ---
        // Increment winner stats
        const wWins = await kv.hincrby(`stats:weekly:${winnerId}`, 'wins', 1);
        await kv.hincrby(`stats:weekly:${winnerId}`, 'matches', 1);

        // Increment loser stats
        const lLosses = await kv.hincrby(`stats:weekly:${loserId}`, 'losses', 1);
        await kv.hincrby(`stats:weekly:${loserId}`, 'matches', 1);

        // Update Sorted Set for Leaderboard (Weekly)
        // Score = wins. We use a sorted set for fast retrieval of top players.
        await kv.zadd('leaderboard:weekly', { score: wWins, member: winnerId });

        // --- Global Stats ---
        await kv.incr('global:votes');

        // --- Volume Tracking (10-minute buckets) ---
        // Bucket key: stats:vol:<epoch_10m>
        const bucketId = Math.floor(Date.now() / (10 * 60 * 1000));
        const volKey = `stats:vol:${bucketId}`;
        await kv.incr(volKey);
        await kv.expire(volKey, 86400); // 24h retention

        const winner = INITIAL_CHARACTERS[characterMap.get(winnerId) || 0];
        const loser = INITIAL_CHARACTERS[characterMap.get(loserId) || 0];

        // --- Global History (Feed) ---
        const matchData = {
            timestamp: Date.now(),
            winner: { id: winnerId, name: winner.name, url: winner.url },
            loser: { id: loserId, name: loser.name, url: loser.url }
        };
        await kv.lpush('history:global', JSON.stringify(matchData));
        await kv.ltrim('history:global', 0, 49); // Keep last 50

        // --- All Time Stats ---
        const atWins = await kv.hincrby(`stats:alltime:${winnerId}`, 'wins', 1);
        await kv.hincrby(`stats:alltime:${winnerId}`, 'matches', 1);

        await kv.hincrby(`stats:alltime:${loserId}`, 'losses', 1);
        await kv.hincrby(`stats:alltime:${loserId}`, 'matches', 1);

        // --- Win Streak Tracking ---
        // Winner: increment streak
        await kv.hincrby(`stats:alltime:${winnerId}`, 'winStreak', 1);
        // Loser: reset streak to 0
        await kv.hset(`stats:alltime:${loserId}`, { winStreak: 0 });

        // --- Elo Rating System (tracked but not displayed publicly yet) ---
        // Standard Elo formula with K-factor of 32
        const K = 32;
        const BASE_ELO = 1000;

        // Get current Elo ratings (default to 1000 if not set)
        const [winnerEloRaw, loserEloRaw] = await Promise.all([
            kv.hget(`stats:alltime:${winnerId}`, 'elo'),
            kv.hget(`stats:alltime:${loserId}`, 'elo')
        ]);

        const winnerElo = typeof winnerEloRaw === 'number' ? winnerEloRaw :
            typeof winnerEloRaw === 'string' ? parseFloat(winnerEloRaw) : BASE_ELO;
        const loserElo = typeof loserEloRaw === 'number' ? loserEloRaw :
            typeof loserEloRaw === 'string' ? parseFloat(loserEloRaw) : BASE_ELO;

        // Calculate expected scores
        const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
        const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

        // Update Elo ratings (winner gets 1, loser gets 0)
        const newWinnerElo = Math.round(winnerElo + K * (1 - expectedWinner));
        const newLoserElo = Math.round(loserElo + K * (0 - expectedLoser));

        // Store updated Elo ratings
        await Promise.all([
            kv.hset(`stats:alltime:${winnerId}`, { elo: newWinnerElo }),
            kv.hset(`stats:alltime:${loserId}`, { elo: newLoserElo })
        ]);

        // Update Sorted Set for Leaderboard (All Time)
        await kv.zadd('leaderboard:alltime', { score: atWins, member: winnerId });

        // --- Match History (Last 50) ---
        const timestamp = Date.now();

        // 1. Record Winner History: Won against Loser
        const winnerHistoryItem = JSON.stringify({
            opponentId: loserId,
            result: 'W',
            timestamp
        });
        await kv.lpush(`history:${winnerId}`, winnerHistoryItem);
        await kv.ltrim(`history:${winnerId}`, 0, 49);

        // 2. Record Loser History: Lost to Winner
        const loserHistoryItem = JSON.stringify({
            opponentId: winnerId,
            result: 'L',
            timestamp
        });
        await kv.lpush(`history:${loserId}`, loserHistoryItem);
        await kv.ltrim(`history:${loserId}`, 0, 49);

        // --- Wallet Vote Tracking (for Recommendation Engine) ---
        if (walletAddress && typeof walletAddress === 'string') {
            const normalizedWallet = walletAddress.toLowerCase();
            const walletVote = JSON.stringify({ winnerId, loserId, timestamp });
            await kv.lpush(`votes:wallet:${normalizedWallet}`, walletVote);
            await kv.ltrim(`votes:wallet:${normalizedWallet}`, 0, 49999);

            // Increment daily vote counter (UTC)
            // (Already incremented atomically at the start of the request to prevent race conditions)
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Vote API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    // ... POST handler ...

}

const BASE_DAILY_LIMIT = 69;

function getDateKey(): string {
    return new Date().toISOString().split('T')[0];
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const skip = searchParams.get('skip') === '1'; // Refresh penalty: increment counter first

    if (!wallet) {
        return NextResponse.json({ votesToday: 0, dailyLimit: BASE_DAILY_LIMIT });
    }

    try {
        const normalizedWallet = wallet.toLowerCase();
        const dateKey = getDateKey();
        const dailyCounterKey = `votes:wallet:${normalizedWallet}:daily:${dateKey}`;

        // If skip=1, atomically increment the counter first (refresh penalty)
        // But only if under the daily limit
        let votesToday: number;
        if (skip) {
            // Check limit before applying skip penalty
            const currentVotes = (await kv.get(dailyCounterKey) as number) || 0;
            const bonusKey = `user:${normalizedWallet}:bonus:1v1:${dateKey}`;
            const bonusVotes = (await kv.get(bonusKey) as number) || 0;
            const limit = 69 + bonusVotes;

            if (currentVotes < limit) {
                votesToday = await kv.incr(dailyCounterKey);
                await kv.expire(dailyCounterKey, 60 * 60 * 48);
            } else {
                votesToday = currentVotes;
            }
        } else {
            votesToday = (await kv.get(dailyCounterKey) as number) || 0;
        }

        // Fetch bonus votes for today
        const bonusKey = `user:${normalizedWallet}:bonus:1v1:${dateKey}`;
        const bonusVotes = (await kv.get(bonusKey) as number) || 0;
        const dailyLimit = BASE_DAILY_LIMIT + bonusVotes;

        return NextResponse.json({ votesToday, dailyLimit });
    } catch (error) {
        console.error('Vote count error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
