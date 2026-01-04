/**
 * Fix Daily Matchup Issue
 * 
 * Restores GVC #1455 vs #2683 as the current matchup
 * and cleans up any premature matchups from history.
 * 
 * Usage: node fix_daily.js
 */

require("dotenv").config({ path: ".env.local" });
const Redis = require("ioredis");
const redis = new Redis(process.env.KV_URL);

// The correct matchup that should be active
const CORRECT_MATCHUP = {
    char1Id: 1455,
    char2Id: 2683
};

// Date key for the matchup (Dec 30, 2025)
const DATE_KEY = "2025-12-30";

async function fixDaily() {
    console.log("=== Fixing Daily Matchup ===\n");

    // 1. Get current state
    console.log("1. Checking current matchup...");
    const currentRaw = await redis.get("daily:current");
    if (currentRaw) {
        const current = JSON.parse(currentRaw);
        console.log(`   Current: #${current.char1Id} vs #${current.char2Id} (dateKey: ${current.dateKey})`);
        console.log(`   Votes: ${current.votes1} - ${current.votes2}`);
    } else {
        console.log("   No current matchup found");
    }

    // 2. Check history (zset - sorted set)
    console.log("\n2. Checking history (zset)...");
    const history = await redis.zrange("daily:history", 0, -1, "WITHSCORES");
    console.log(`   Found ${history.length / 2} history entries`);

    const parsedHistory = [];
    for (let i = 0; i < history.length; i += 2) {
        const data = JSON.parse(history[i]);
        const score = history[i + 1];
        parsedHistory.push({ ...data, score });
    }

    // Show last 10
    parsedHistory.slice(-10).forEach((h, i) => {
        console.log(`   [${i}] ${h.dateKey}: #${h.char1Id} vs #${h.char2Id} (${h.votes1}-${h.votes2}) score:${h.score}`);
    });

    // 3. Find the 1455 vs 2683 matchup results if it was archived
    console.log("\n3. Looking for 1455 vs 2683 in history...");
    const matchupInHistory = parsedHistory.find(
        h => (h.char1Id === 1455 && h.char2Id === 2683) || (h.char1Id === 2683 && h.char2Id === 1455)
    );

    let votes1 = 0;
    let votes2 = 0;

    if (matchupInHistory) {
        console.log(`   Found! Votes: ${matchupInHistory.votes1}-${matchupInHistory.votes2}`);
        votes1 = matchupInHistory.votes1;
        votes2 = matchupInHistory.votes2;
    } else {
        console.log("   Not found in history (may still be active or votes reset)");
    }

    // 4. Set the correct matchup as current
    console.log("\n4. Setting 1455 vs 2683 as current matchup...");

    // Calculate start time as 12 PM EST today (Dec 30)
    // Current time is around 12:42 AM EST Dec 30
    // We want the matchup to run until 12 PM EST Dec 31
    // So set startTime to 12 PM EST Dec 30

    const startTime = new Date('2025-12-30T12:00:00-05:00').getTime();

    const newCurrent = {
        char1Id: 1455,
        char2Id: 2683,
        startTime: startTime,
        votes1: votes1,
        votes2: votes2,
        dateKey: DATE_KEY
    };

    await redis.set("daily:current", JSON.stringify(newCurrent));
    console.log(`   Set: #${newCurrent.char1Id} vs #${newCurrent.char2Id}`);
    console.log(`   DateKey: ${newCurrent.dateKey}`);
    console.log(`   StartTime: ${new Date(startTime).toISOString()}`);
    console.log(`   Votes: ${votes1}-${votes2}`);

    // 5. Clean up history - remove any matchups with dateKey >= 2025-12-30
    console.log("\n5. Cleaning up history...");

    // Find entries to remove (dateKey >= 2025-12-30)
    const entriesToRemove = parsedHistory.filter(h => h.dateKey >= "2025-12-29");

    for (const entry of entriesToRemove) {
        const memberStr = JSON.stringify({
            dateKey: entry.dateKey,
            char1Id: entry.char1Id,
            char2Id: entry.char2Id,
            votes1: entry.votes1,
            votes2: entry.votes2,
            winnerId: entry.winnerId
        });

        // Try to remove by member value
        const result = await redis.zrem("daily:history", memberStr);
        if (result > 0) {
            console.log(`   Removed: ${entry.dateKey}: #${entry.char1Id} vs #${entry.char2Id}`);
        }
    }

    // Also remove by score if they're timestamped
    const dec29Score = new Date('2025-12-29T00:00:00-05:00').getTime();
    const removed = await redis.zremrangebyscore("daily:history", dec29Score, "+inf");
    if (removed > 0) {
        console.log(`   Removed ${removed} entries by score range`);
    }

    // 6. Verify final state
    console.log("\n6. Verifying final state...");
    const finalCurrent = JSON.parse(await redis.get("daily:current"));
    console.log(`   Current: #${finalCurrent.char1Id} vs #${finalCurrent.char2Id} (${finalCurrent.votes1}-${finalCurrent.votes2})`);
    console.log(`   DateKey: ${finalCurrent.dateKey}`);

    const finalHistoryCount = await redis.zcard("daily:history");
    console.log(`   History entries remaining: ${finalHistoryCount}`);

    const lastHistory = await redis.zrange("daily:history", -3, -1);
    console.log(`   Last 3 history entries:`);
    lastHistory.forEach((h, i) => {
        const parsed = JSON.parse(h);
        console.log(`   [${i}] ${parsed.dateKey}: #${parsed.char1Id} vs #${parsed.char2Id}`);
    });

    console.log("\n=== Fix Complete ===");
    console.log(`Matchup #1455 vs #2683 is now active until 12PM EST on Dec 31, 2025`);

    await redis.quit();
}

fixDaily().catch(err => {
    console.error("Error:", err);
    redis.quit();
    process.exit(1);
});
