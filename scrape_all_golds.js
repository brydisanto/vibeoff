const fs = require('fs');

const CID = 'QmczTDgYkd5BXb4cKGo7Qo696vwUMEJG1hSUtY845eDvgh';
const TOTAL_SUPPLY = 6969;
const CONCURRENCY = 100; // Aggressive concurrency
const GATEWAYS = [
    'https://dweb.link/ipfs', // Primary
    'https://cloudflare-ipfs.com/ipfs', // Fast
    'https://ipfs.io/ipfs', // Backup
    'https://gateway.pinata.cloud/ipfs' // Backup
];

async function fetchFromGateway(gateway, id) {
    const url = `${gateway}/${CID}/${id}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s generous timeout

    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            return await res.json();
        }
        throw new Error(`Status ${res.status}`);
    } catch (e) {
        throw e;
    }
}

async function fetchMetadata(id) {
    let attempts = 0;
    while (attempts < 5) { // Limit attempts to avoid infinite loops on bad IDs
        attempts++;

        try {
            // Race all gateways
            const data = await Promise.any(
                GATEWAYS.map(gw => fetchFromGateway(gw, id))
            );
            return data;
        } catch (err) {
            // All gateways failed for this attempt
            // Wait before retry
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    // If we fail 5 times (tried all gateways 5 times), sadly skip
    console.error(`FAILED ID: ${id}`);
    return null;
}

async function main() {
    console.log(`Scanning ${TOTAL_SUPPLY} items for Type="Cosmic Guardian"... (Robust Mode)`);
    const goldIds = [];
    let processed = 0;

    // We used a chunked approach, but Promise.all is cleaner
    // To allow progress logging, we batch

    for (let i = 1; i <= TOTAL_SUPPLY; i += CONCURRENCY) {
        const batch = [];
        for (let j = 0; j < CONCURRENCY && (i + j) <= TOTAL_SUPPLY; j++) {
            batch.push(i + j);
        }

        const results = await Promise.all(batch.map(async (id) => {
            const data = await fetchMetadata(id);
            const typeTrait = data.attributes?.find(a => a.trait_type === 'Type');
            return (typeTrait && typeTrait.value === 'Cosmic Guardian') ? id : null;
        }));

        results.forEach(id => {
            if (id) goldIds.push(id);
        });

        processed += batch.length;
        process.stdout.write(`\rProgress: ${processed}/${TOTAL_SUPPLY} | Cosmic Guardian Found: ${goldIds.length}`);
    }

    console.log('\n--- DONE ---');
    console.log(JSON.stringify(goldIds.sort((a, b) => a - b)));
    console.log(`Total Gold: ${goldIds.length}`);
}

main();
