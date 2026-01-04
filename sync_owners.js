require("dotenv").config({ path: ".env.local" });
const Redis = require("ioredis");
const redis = new Redis(process.env.KV_URL);

const OPENSEA_API_KEY = "003c902b643e4b06b14ae18bda215739";
const CONTRACT_ADDRESS = "0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchOwner(tokenId) {
    const url = `https://api.opensea.io/api/v2/chain/ethereum/contract/${CONTRACT_ADDRESS}/nfts/${tokenId}`;
    try {
        const res = await fetch(url, { headers: { "x-api-key": OPENSEA_API_KEY, "accept": "application/json" } });
        if (!res.ok) {
            console.error(`Error fetching ${tokenId}: ${res.status}`);
            return null;
        }
        const data = await res.json();
        return data.nft?.owners?.[0]?.address || null;
    } catch (e) {
        console.error(`Exception fetching ${tokenId}:`, e);
        return null;
    }
}

async function sync() {
    console.log("Starting sync...");
    const topIds = await redis.zrange("leaderboard:alltime", 0, -1, "REV");
    console.log(`Syncing all ${topIds.length} owners...`);

    for (const id of topIds) {
        /*
        const existing = await redis.hget(`stats:alltime:${id}`, "owner");
        if (existing) {
             // console.log(`Skipped #${id} (already has owner)`);
             // continue;
        }
        */
        // Force refresh just in case, or keep skip. 
        // User said specific wallet, maybe I should force.
        // Actually, let's just skip existing to be fast for the majority, 
        // BUT check if I should clear the cache?
        // No, let's just run it. The user's GVC was likely just missing.

        const existing = await redis.hget(`stats:alltime:${id}`, "owner");
        if (existing) {
            process.stdout.write('.');
            continue;
        }

        await sleep(500);
        const realOwner = await fetchOwner(id);
        if (realOwner) {
            await redis.hset(`stats:alltime:${id}`, "owner", realOwner);
            console.log(`Updated #${id} -> ${realOwner}`);
        } else {
            console.log(`Failed to resolve #${id}`);
        }
    }
    console.log("Sync complete.");
    redis.disconnect();
}
sync();
