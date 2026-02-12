/**
 * Optimized owner sync - sequential with proper rate limiting
 * Run with: node sync_owners_optimized.js [startId] [endId]
 */

require('dotenv').config({ path: '.env.local' });

const OPENSEA_API_KEY = '003c902b643e4b06b14ae18bda215739';
const GVC_CONTRACT = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';
const TOTAL_GVCS = 6969;
const DELAY_BETWEEN_REQUESTS = 350; // ~3 requests per second to stay under limit

const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

async function redisHset(key, data) {
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

async function fetchOwner(tokenId, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
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
                console.log(`Rate limited at ${tokenId}, waiting 10s...`);
                await sleep(10000);
                continue;
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
            if (attempt < retries - 1) {
                await sleep(2000);
            }
        }
    }
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    if (!KV_URL || !KV_TOKEN) {
        console.error('Missing KV_REST_API_URL or KV_REST_API_TOKEN env vars');
        process.exit(1);
    }

    const startId = parseInt(process.argv[2]) || 1;
    const endId = parseInt(process.argv[3]) || TOTAL_GVCS;

    console.log(`\nSyncing GVC owners from ${startId} to ${endId} (SEQUENTIAL MODE)...`);
    console.log(`Delay: ${DELAY_BETWEEN_REQUESTS}ms per request\n`);

    let synced = 0;
    let errors = 0;
    const startTime = Date.now();

    for (let tokenId = startId; tokenId <= endId; tokenId++) {
        const ownerData = await fetchOwner(tokenId);

        if (ownerData && ownerData.address) {
            await redisHset(`owner:${tokenId}`, ownerData);
            synced++;
        } else {
            errors++;
        }

        // Progress every 100
        if (tokenId % 100 === 0) {
            const progress = Math.round(((tokenId - startId + 1) / (endId - startId + 1)) * 100);
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const rate = synced > 0 ? Math.round(synced / elapsed * 60) : 0;
            console.log(`Progress: ${progress}% | ID: ${tokenId} | Synced: ${synced} | Errors: ${errors} | ~${rate}/min`);
        }

        await sleep(DELAY_BETWEEN_REQUESTS);
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ Done! Synced ${synced} owners with ${errors} errors in ${totalTime}s`);
}

main().catch(console.error);
