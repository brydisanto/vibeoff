/**
 * Script to fetch GVC IDs with specific Body traits using OpenSea API
 * Body types: Shower, Surfer Red, Surfer Purple, Gold Chains Tattoos
 * 
 * Run with: node fetch_nvc_opensea.js [startId] [endId]
 */

const OPENSEA_API_KEY = '003c902b643e4b06b14ae18bda215739';
const GVC_CONTRACT = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';

const NVC_BODY_TYPES = [
    'Shower',
    'Surfer Red',
    'Surfer Purple',
    'Gold Chains Tattoos'
];

const DELAY_BETWEEN_REQUESTS = 350; // ~3 requests/second to stay under rate limit

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchNftTraits(tokenId, retries = 3) {
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
                if (attempt < retries - 1) {
                    await sleep(2000);
                    continue;
                }
                return null;
            }

            const data = await response.json();
            return data.nft?.traits || [];
        } catch (error) {
            if (attempt < retries - 1) {
                await sleep(2000);
                continue;
            }
            console.error(`Error fetching ${tokenId}:`, error.message);
            return null;
        }
    }
    return null;
}

async function main() {
    const startId = parseInt(process.argv[2]) || 1;
    const endId = parseInt(process.argv[3]) || 6969;

    console.log(`Fetching NVC IDs from ${startId} to ${endId} using OpenSea API...`);
    console.log(`Looking for Body traits: ${NVC_BODY_TYPES.join(', ')}\n`);

    const nvcIds = [];
    const startTime = Date.now();
    let errors = 0;

    for (let tokenId = startId; tokenId <= endId; tokenId++) {
        const traits = await fetchNftTraits(tokenId);

        if (traits) {
            const bodyTrait = traits.find(t => t.trait_type === 'Body');
            if (bodyTrait && NVC_BODY_TYPES.includes(bodyTrait.value)) {
                nvcIds.push(tokenId);
                console.log(`✓ Found NVC #${tokenId} - Body: ${bodyTrait.value}`);
            }
        } else {
            errors++;
        }

        // Progress every 100
        if (tokenId % 100 === 0) {
            const progress = Math.round(((tokenId - startId + 1) / (endId - startId + 1)) * 100);
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const rate = tokenId > startId ? Math.round(tokenId / elapsed * 60) : 0;
            console.log(`Progress: ${progress}% | ID: ${tokenId} | Found: ${nvcIds.length} | Errors: ${errors} | ~${rate}/min`);
        }

        await sleep(DELAY_BETWEEN_REQUESTS);
    }

    // Sort the IDs
    nvcIds.sort((a, b) => a - b);

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ Done! Found ${nvcIds.length} NVC IDs in ${totalTime}s (${errors} errors)\n`);

    // Output as TypeScript array
    console.log('// Add this to lib/filter_ids.ts:');
    console.log(`export const NVC_IDS: number[] = [${nvcIds.join(',')}];`);
}

main().catch(console.error);
