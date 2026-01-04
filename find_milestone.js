// find_milestone.js
require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');

const redis = new Redis(process.env.KV_URL);

async function main() {
    console.log("Fetching all character IDs...");
    const allIds = await redis.zrange('leaderboard:alltime', 0, -1);
    console.log(`Found ${allIds.length} characters.`);

    // Current Global Count
    const currentCount = parseInt(await redis.get('global:votes'));
    console.log(`Current Global Vote Count: ${currentCount}`);

    const targetVoteNumber = 10000;
    const votesAgo = currentCount - targetVoteNumber;

    if (votesAgo < 0) {
        console.log("We haven't reached 10,000 votes yet!");
        process.exit(0);
    }

    console.log(`Searching for the match that happened ${votesAgo} votes ago...`);

    // Fetch histories in batches
    const batchSize = 1000;
    let allMatches = [];

    for (let i = 0; i < allIds.length; i += batchSize) {
        const batchIds = allIds.slice(i, i + batchSize);
        const pipe = redis.pipeline();

        batchIds.forEach(id => pipe.lrange(`history:${id}`, 0, 9)); // Just get last 10 is enough since we only need < 200 ago

        const results = await pipe.exec();

        results.forEach(([err, history], index) => {
            const charId = batchIds[index];
            if (history && history.length > 0) {
                history.forEach(itemStr => {
                    try {
                        const item = typeof itemStr === 'string' ? JSON.parse(itemStr) : itemStr;
                        // Avoid duplicates? 
                        // The history is stored on BOTH winner and loser. 
                        // { opponentId, result, timestamp }
                        // We can identify a unique match by the combination of sorted IDs and timestamp?
                        // Or just process "Wins" only?
                        // A vote = 1 Win + 1 Loss. 
                        // The global counter counts VOTES (1 interaction).
                        // So checking just "Wins" (result: 'W') across all history should give us the unique set of votes.

                        if (item.result === 'W') {
                            allMatches.push({
                                winnerId: charId,
                                opponentId: item.opponentId,
                                timestamp: item.timestamp,
                                raw: item
                            });
                        }
                    } catch (e) { }
                });
            }
        });
        process.stdout.write('.');
    }

    console.log(`\nCollected ${allMatches.length} recent wins.`);

    // Sort by timestamp descending (newest first)
    allMatches.sort((a, b) => b.timestamp - a.timestamp);

    // The match at index 0 is Vote #Current
    // The match at index k is Vote #(Current - k)
    // We want Vote #10000.
    // Index = votesAgo?
    // Ex: Current 10177. Target 10177. votesAgo = 0. Index 0. Correct.
    // Ex: Current 10177. Target 10000. votesAgo = 177. Index 177.

    const targetIndex = votesAgo;

    if (targetIndex >= allMatches.length) {
        console.log("History doesn't go back far enough to find #10,000.");
    } else {
        const match = allMatches[targetIndex];
        console.log("\nFOUND VOTE #10,000!");
        console.log("------------------------------------------------");
        console.log(`Timestamp: ${new Date(match.timestamp).toLocaleString()}`);
        console.log(`Winner: GVC #${match.winnerId}`);
        console.log(`Loser:  GVC #${match.opponentId}`);
        console.log("------------------------------------------------");
    }

    redis.disconnect();
}

main().catch(console.error);
