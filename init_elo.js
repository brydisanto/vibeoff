/**
 * Initialize Elo ratings for all GVCs
 * 
 * Sets base Elo of 1000 for all GVCs that don't have an Elo rating yet.
 * For GVCs with existing match history, we could optionally recalculate
 * Elo based on win rate, but for now we start everyone at 1000.
 * 
 * Run: node init_elo.js
 */

require('dotenv').config({ path: '.env.local' });
const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN
});

const TOTAL_GVCS = 6969;
const BASE_ELO = 1000;
const BATCH_SIZE = 100;

async function initializeElo() {
    console.log(`Initializing Elo ratings for ${TOTAL_GVCS} GVCs...`);

    let initialized = 0;
    let skipped = 0;

    for (let start = 1; start <= TOTAL_GVCS; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE - 1, TOTAL_GVCS);

        // Check which GVCs need Elo initialization
        const pipeline = redis.pipeline();
        for (let id = start; id <= end; id++) {
            pipeline.hget(`stats:alltime:${id}`, 'elo');
        }

        const results = await pipeline.exec();

        // Initialize those without Elo
        const initPipeline = redis.pipeline();
        let needsInit = 0;

        for (let i = 0; i < results.length; i++) {
            const id = start + i;
            if (results[i] === null || results[i] === undefined) {
                initPipeline.hset(`stats:alltime:${id}`, { elo: BASE_ELO });
                needsInit++;
            } else {
                skipped++;
            }
        }

        if (needsInit > 0) {
            await initPipeline.exec();
            initialized += needsInit;
        }

        console.log(`Processed ${end}/${TOTAL_GVCS} - Initialized: ${initialized}, Skipped: ${skipped}`);
    }

    console.log(`\nDone! Initialized ${initialized} GVCs at Elo ${BASE_ELO}`);
    console.log(`Skipped ${skipped} GVCs that already had Elo ratings`);
}

initializeElo().catch(console.error);
