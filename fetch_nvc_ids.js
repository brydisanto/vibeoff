/**
 * Script to fetch GVC IDs with specific Body traits
 * Uses Cloudflare IPFS gateway with sequential requests to avoid rate limits
 * 
 * Run with: node fetch_nvc_ids.js [startId] [endId]
 */

const NVC_BODY_TYPES = [
    'Shower',
    'Surfer Red',
    'Surfer Purple',
    'Gold Chains Tattoos'
];

// Use Cloudflare IPFS gateway (more reliable)
const METADATA_BASE_URL = 'https://cloudflare-ipfs.com/ipfs/QmdtwdUG36WweSUPnWH6QRWu54ZUaEhHr7KPt3PnpHb6Y2';
const DELAY_BETWEEN_REQUESTS = 200; // 200ms = 5 requests/second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchMetadata(tokenId, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await fetch(`${METADATA_BASE_URL}/${tokenId}`, {
                headers: { 'Accept': 'application/json' }
            });

            if (response.status === 429) {
                console.log(`Rate limited at ${tokenId}, waiting 5s...`);
                await sleep(5000);
                continue;
            }

            if (!response.ok) {
                if (attempt < retries - 1) {
                    await sleep(1000);
                    continue;
                }
                return null;
            }

            return await response.json();
        } catch (error) {
            if (attempt < retries - 1) {
                await sleep(1000);
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

    console.log(`Fetching NVC IDs from ${startId} to ${endId}...`);
    console.log(`Looking for Body traits: ${NVC_BODY_TYPES.join(', ')}\n`);

    const nvcIds = [];
    const startTime = Date.now();
    let errors = 0;

    for (let tokenId = startId; tokenId <= endId; tokenId++) {
        const metadata = await fetchMetadata(tokenId);

        if (metadata && metadata.attributes) {
            const bodyAttr = metadata.attributes.find(
                attr => attr.trait_type === 'Body'
            );
            if (bodyAttr && NVC_BODY_TYPES.includes(bodyAttr.value)) {
                nvcIds.push(tokenId);
                console.log(`✓ Found NVC #${tokenId} - Body: ${bodyAttr.value}`);
            }
        } else {
            errors++;
        }

        // Progress every 100
        if (tokenId % 100 === 0) {
            const progress = Math.round(((tokenId - startId + 1) / (endId - startId + 1)) * 100);
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`Progress: ${progress}% | ID: ${tokenId} | Found: ${nvcIds.length} | Errors: ${errors} | Elapsed: ${elapsed}s`);
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
