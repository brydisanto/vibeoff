// restore_leaderboard.js
// Restores leaderboard data to the new Redis database

require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');

// Use the new vibeoff-2 Redis database
const redisUrl = process.env.vibeoff2_REDIS_URL;

if (!redisUrl) {
    console.error('ERROR: vibeoff2_REDIS_URL not found in .env.local');
    process.exit(1);
}

console.log('Connecting to new Redis database...');
const redis = new Redis(redisUrl);

// Data from screenshot - these are the stats that need to be restored
const leaderboardData = [
    // From screenshot - King of Vibes at top
    { id: 3844, wins: 7, losses: 0 },   // King of Vibes
    { id: 1008, wins: 7, losses: 0 },   // #2
    { id: 1717, wins: 7, losses: 1 },   // #3
    { id: 1500, wins: 7, losses: 1 },   // #4
    { id: 6317, wins: 6, losses: 0 },   // #5
    { id: 572, wins: 6, losses: 0 },    // #6
    { id: 4794, wins: 6, losses: 0 },   // #7
    { id: 1270, wins: 6, losses: 0 },   // #8
    { id: 872, wins: 6, losses: 1 },    // #9
    { id: 6122, wins: 6, losses: 1 },   // #10
    { id: 884, wins: 5, losses: 0 },    // #11
];

async function checkCurrentData() {
    console.log('Checking current leaderboard data...\n');

    const redisKey = 'leaderboard:alltime';
    const topIds = await redis.zrevrange(redisKey, 0, 14, 'WITHSCORES');

    console.log('Current top entries in new Redis:');
    for (let i = 0; i < topIds.length; i += 2) {
        const id = topIds[i];
        const score = topIds[i + 1];
        console.log(`  ID: ${id}, Score: ${score}`);
    }

    if (topIds.length === 0) {
        console.log('  (empty - no data yet)');
    }

    return topIds.length > 0;
}

async function restoreData() {
    console.log('\n--- RESTORE MODE ---');
    console.log('Restoring leaderboard data from screenshot...\n');

    for (const entry of leaderboardData) {
        const statKey = `stats:alltime:${entry.id}`;
        const matches = entry.wins + entry.losses;

        // Update stats hash
        await redis.hset(statKey, {
            wins: entry.wins,
            losses: entry.losses,
            matches: matches
        });

        // Update sorted set (score by wins)
        await redis.zadd('leaderboard:alltime', entry.wins, String(entry.id));

        console.log(`Restored GVC #${entry.id}: ${entry.wins}-${entry.losses} (${matches} matches)`);
    }

    console.log('\n✅ Restore complete! Restored', leaderboardData.length, 'entries.');
}

async function main() {
    const args = process.argv.slice(2);
    const shouldRestore = args.includes('--restore');

    try {
        await checkCurrentData();

        if (!shouldRestore) {
            console.log('\n--- DRY RUN ---');
            console.log('To actually restore, run: node restore_leaderboard.js --restore');
            console.log('\nData that would be restored:');
            leaderboardData.forEach(e => {
                console.log(`  GVC #${e.id}: ${e.wins}-${e.losses}`);
            });
        } else {
            await restoreData();
        }
    } finally {
        redis.disconnect();
    }
}

main().catch(err => {
    console.error(err);
    redis.disconnect();
});
