// migrate_legacy.js
// Migrates data from Old Upstash DB to New Redis Labs DB
// Attempts to use TCP connection to bypass potential REST API limits

require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');

// Old Upstash Database (Source)
// We prioritize KV_URL as it was the one used by Vercel KV
const sourceUrl = process.env.KV_URL;

// New Redis Labs Database (Destination)
const destUrl = process.env.vibeoff2_REDIS_URL;

async function migrate() {
    console.log('--- MIGRATION START ---');

    if (!sourceUrl) {
        console.error('❌ Missing KV_URL (Source) in .env.local');
        return;
    }
    if (!destUrl) {
        console.error('❌ Missing vibeoff2_REDIS_URL (Destination) in .env.local');
        return;
    }

    console.log('Connecting to SOURCE (Old Upstash)...');
    const source = new Redis(sourceUrl);

    console.log('Connecting to DESTINATION (New Redis)...');
    const dest = new Redis(destUrl);

    try {
        // Test source connection and read leaderboard
        console.log('Reading leaderboard from SOURCE...');

        // Fetch all members from the sorted set
        // zrange(0, -1) gets everything
        const leaderboard = await source.zrange('leaderboard:alltime', 0, -1, 'WITHSCORES');

        console.log(`✅ Found ${leaderboard.length / 2} entries in source leaderboard.`);

        if (leaderboard.length === 0) {
            console.log('⚠️ Source leaderboard is empty? Limit might be blocking even TCP or data is gone.');
            return;
        }

        console.log('Migrating data...');
        let successCount = 0;
        let failCount = 0;

        // Process in chunks to retrieve stats
        // leaderboard array is [id, score, id, score, ...]
        for (let i = 0; i < leaderboard.length; i += 2) {
            const id = leaderboard[i];
            const score = parseInt(leaderboard[i + 1]);

            // Fetch detailed stats for this ID
            // We use pipeline to retrieve stats if possible, but let's do one by one for safety first
            // actually, pipeline is better for performance and rate limits

            try {
                // Get stats from source
                const statsKey = `stats:alltime:${id}`;
                const stats = await source.hgetall(statsKey);

                if (Object.keys(stats).length > 0) {
                    // Write to destination
                    const destStatsKey = `stats:alltime:${id}`;
                    await dest.hset(destStatsKey, stats);

                    // Update leaderboard in destination
                    await dest.zadd('leaderboard:alltime', score, id);

                    successCount++;
                } else {
                    console.warn(`⚠️ No stats found for ID ${id} (Score: ${score})`);

                    // Even if no stats hash, verify if we should migrate the score?
                    // Usually app relies on stats hash, so maybe skip or init default?
                    // Let's at least migrate the leaderboard entry
                    await dest.zadd('leaderboard:alltime', score, id);

                    // Init default stats matching the score
                    // improving robustness: if score > 0, assume wins=score
                    const simulatedWins = score;
                    const simulatedMatches = score; // assume 100% win rate if stats missing
                    await dest.hset(destStatsKey, {
                        wins: simulatedWins,
                        losses: 0,
                        matches: simulatedMatches
                    });
                }
            } catch (err) {
                console.error(`❌ Failed to migrate ID ${id}:`, err.message);
                failCount++;
            }

            if (i % 100 === 0) {
                console.log(`Processed ${i / 2}/${leaderboard.length / 2} entries...`);
            }
        }

        console.log('--- MIGRATION COMPLETE ---');
        console.log(`✅ Successfully migrated ${successCount} entries.`);
        console.log(`❌ Failed: ${failCount}`);

    } catch (err) {
        console.error('❌ Critical Migration Error:', err);
    } finally {
        source.disconnect();
        dest.disconnect();
    }
}

migrate();
