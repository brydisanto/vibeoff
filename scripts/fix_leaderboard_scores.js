const { createClient } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });

async function main() {
    // Note: ensure we use the explicit PROD URL if env.local is tricky
    const kv = createClient({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    });

    console.log('Fetching all ranked items...');
    const allMembers = await kv.zrange('leaderboard:alltime', 0, -1);
    console.log(`Found ${allMembers.length} members in the sorted set.`);

    let count = 0;
    for (let i = 0; i < allMembers.length; i += 100) {
        const batch = allMembers.slice(i, i + 100);
        const pipeline = kv.pipeline();

        batch.forEach(id => {
            pipeline.hgetall(`stats:alltime:${id}`);
        });

        const statsResults = await pipeline.exec();

        const updatePipeline = kv.pipeline();
        batch.forEach((id, index) => {
            const stats = statsResults[index] || { wins: 0, losses: 0, matches: 0 };
            const wins = Number(stats.wins || 0);
            const losses = Number(stats.losses || 0);
            const matches = Number(stats.matches || 0);

            const score = (wins - losses) * 10000 + (wins / Math.max(1, matches)) * 1000;

            updatePipeline.zadd('leaderboard:alltime', { score: score, member: id });
        });

        await updatePipeline.exec();
        count += batch.length;
        console.log(`Updated ${count}/${allMembers.length} scores...`);
    }

    console.log('Done fixing leaderboard scores.');
}

main().catch(console.error);
