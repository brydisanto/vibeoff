/**
 * Sync all GVC owners from OpenSea to Redis
 * Run with: node sync_all_owners.js
 * 
 * Syncs in batches to respect rate limits.
 */

// Load .env.local
require('dotenv').config({ path: '.env.local' });

const OPENSEA_API_KEY = '003c902b643e4b06b14ae18bda215739';
const GVC_CONTRACT = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';
const TOTAL_GVCS = 6969;
const BATCH_SIZE = 30;  // OpenSea allows ~30 requests per second
const DELAY_BETWEEN_BATCHES = 1500; // 1.5 seconds

// Redis connection (using Upstash REST API)
const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

async function redisHset(key, data) {
    // Upstash REST API format: POST with command array
    const args = ['HSET', key];
    for (const [field, value] of Object.entries(data)) {
        args.push(field, String(value));
    }

    const response = await fetch(KV_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${KV_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(args)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Redis error: ${response.status} - ${text}`);
    }
    return response.json();
}

async function fetchOwner(tokenId) {
    try {
        const response = await fetch(
            `https://api.opensea.io/api/v2/chain/ethereum/contract/${GVC_CONTRACT}/nfts/${tokenId}`,
            {
                headers: {
                    'X-API-KEY': OPENSEA_API_KEY,
                    'Accept': 'application/json'
                }
            }
        );

        if (response.status === 429) {
            console.log(`Rate limited at ${tokenId}, waiting...`);
            await sleep(5000);
            return fetchOwner(tokenId);
        }

        if (!response.ok) {
            console.error(`OpenSea error for ${tokenId}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const owners = data?.nft?.owners || [];

        if (owners.length > 0) {
            return {
                address: (owners[0].address || '').toLowerCase(),
                username: owners[0].username || '',
                lastSynced: Date.now()
            };
        }
        return null;
    } catch (error) {
        console.error(`Error for ${tokenId}:`, error.message);
        return null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    if (!KV_URL || !KV_TOKEN) {
        console.error('Missing KV_REST_API_URL or KV_REST_API_TOKEN env vars');
        console.log('Ensure .env.local has these values from Vercel/Upstash');
        process.exit(1);
    }

    const startId = parseInt(process.argv[2]) || 1;
    const endId = parseInt(process.argv[3]) || TOTAL_GVCS;

    console.log(`\nSyncing GVC owners from ${startId} to ${endId}...`);
    console.log(`Batch size: ${BATCH_SIZE}, Delay: ${DELAY_BETWEEN_BATCHES}ms\n`);

    let synced = 0;
    let errors = 0;
    const startTime = Date.now();

    for (let batchStart = startId; batchStart <= endId; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, endId);
        const batchPromises = [];

        for (let tokenId = batchStart; tokenId <= batchEnd; tokenId++) {
            batchPromises.push((async () => {
                const ownerData = await fetchOwner(tokenId);
                if (ownerData && ownerData.address) {
                    await redisHset(`owner:${tokenId}`, ownerData);
                    synced++;
                } else {
                    errors++;
                }
            })());
        }

        await Promise.all(batchPromises);

        const progress = Math.round(((batchEnd - startId + 1) / (endId - startId + 1)) * 100);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`Progress: ${progress}% | Synced: ${synced} | Errors: ${errors} | Elapsed: ${elapsed}s | Current: ${batchStart}-${batchEnd}`);

        if (batchEnd < endId) {
            await sleep(DELAY_BETWEEN_BATCHES);
        }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ Done! Synced ${synced} owners with ${errors} errors in ${totalTime}s`);
}

main().catch(console.error);
