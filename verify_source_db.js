// verify_source_db.js
require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');

const sourceUrl = process.env.KV_URL;
console.log('Connecting to:', sourceUrl);

const redis = new Redis(sourceUrl);

async function check() {
    try {
        const count = await redis.zcard('leaderboard:alltime');
        console.log('Leaderboard Count:', count);

        const top = await redis.zrevrange('leaderboard:alltime', 0, 0, 'WITHSCORES');
        console.log('Top Entry:', top);

        // Check stats for top entry
        if (top.length > 0) {
            const id = top[0];
            const stats = await redis.hgetall(`stats:alltime:${id}`);
            console.log('Stats for Top:', stats);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        redis.disconnect();
    }
}

check();
