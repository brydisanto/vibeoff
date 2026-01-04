// init_global_counter.js
require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');

const redisUrl = process.env.KV_URL;
if (!redisUrl) {
    console.error("Missing KV_URL");
    process.exit(1);
}

const redis = new Redis(redisUrl);

async function main() {
    console.log("Calculating total matches...");

    // Get all keys? No, simpler to use zrange logic since we know the ID list from leaderboard
    const allIds = await redis.zrange('leaderboard:alltime', 0, -1);
    console.log(`Found ${allIds.length} ranked characters.`);

    // Fetch all stats
    // We can use a pipeline
    const batchSize = 500;
    let totalMatches = 0;

    for (let i = 0; i < allIds.length; i += batchSize) {
        const batchIds = allIds.slice(i, i + batchSize);
        const pipe = redis.pipeline();
        batchIds.forEach(id => pipe.hget(`stats:alltime:${id}`, 'matches'));

        const results = await pipe.exec();
        results.forEach(([err, count]) => {
            if (count) totalMatches += parseInt(count);
        });
        process.stdout.write('.');
    }

    console.log(`\nTotal 'Matches' sum: ${totalMatches}`);
    // Since 1 vote = 1 match for winner + 1 match for loser = 2 match increments
    // Total Votes = Total Matches / 2
    const totalVotes = Math.floor(totalMatches / 2);
    console.log(`Calculated Total Votes: ${totalVotes}`);

    console.log("Setting 'global:votes'...");
    await redis.set('global:votes', totalVotes);

    const verify = await redis.get('global:votes');
    console.log(`Verified 'global:votes': ${verify}`);

    redis.disconnect();
}

main().catch(console.error);
