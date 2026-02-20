const { createClient } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function main() {
    const kv = createClient({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    });

    const rawVotes = await kv.lrange('votes:wallet:0xf7daddb9553d6c0ad80c66c7cfff281b1d5f35ad', 0, -1);
    console.log('Total rawVotes:', rawVotes.length);

    const votes = rawVotes.map(v => {
        try {
            return typeof v === 'string' ? JSON.parse(v) : v;
        } catch { return null; }
    }).filter(Boolean);

    console.log('Valid votes:', votes.length);

    // Save first 10 so we can inspect them fully
    fs.writeFileSync('votes_sample.json', JSON.stringify(votes.slice(0, 10), null, 2));

    // Count winners
    const winnerCounts = {};
    for (const v of votes) {
        winnerCounts[v.winnerId] = (winnerCounts[v.winnerId] || 0) + 1;
    }

    const sortedWinners = Object.entries(winnerCounts).sort((a, b) => b[1] - a[1]);
    console.log('Top 5 IDs voted for:', sortedWinners.slice(0, 5));
}

main().catch(console.error);
