const fs = require('fs');

const CID = 'QmczTDgYkd5BXb4cKGo7Qo696vwUMEJG1hSUtY845eDvgh';
const TOTAL_SUPPLY = 6969;
const CONCURRENCY = 100;
const GATEWAYS = [
    'https://dweb.link/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://ipfs.io/ipfs',
    'https://gateway.pinata.cloud/ipfs'
];

async function fetchFromGateway(gateway, id) {
    const url = `${gateway}/${CID}/${id}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
    while (attempts < 5) {
        attempts++;
        try {
            const data = await Promise.any(
                GATEWAYS.map(gw => fetchFromGateway(gw, id))
            );
            return data;
        } catch (err) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    console.error(`FAILED ID: ${id}`);
    return null;
}

async function main() {
    console.log(`Scanning ${TOTAL_SUPPLY} items for Face trait containing "Beard"...`);
    const foundIds = [];
    let processed = 0;

    for (let i = 1; i <= TOTAL_SUPPLY; i += CONCURRENCY) {
        const batch = [];
        for (let j = 0; j < CONCURRENCY && (i + j) <= TOTAL_SUPPLY; j++) {
            batch.push(i + j);
        }

        const results = await Promise.all(batch.map(async (id) => {
            const data = await fetchMetadata(id);
            if (!data) return null;
            const faceTrait = data.attributes?.find(a => a.trait_type === 'Face');
            // Check if Face trait exists and includes "Beard" (case insensitive just in case)
            if (faceTrait && faceTrait.value && faceTrait.value.toLowerCase().includes('beard')) {
                return id;
            }
            return null;
        }));

        results.forEach(id => {
            if (id) {
                foundIds.push(id);
            }
        });

        processed += batch.length;
        process.stdout.write(`\rProgress: ${processed}/${TOTAL_SUPPLY} | Beards Found: ${foundIds.length}`);
    }

    console.log('\n--- DONE ---');
    console.log(JSON.stringify(foundIds.sort((a, b) => a - b)));
    console.log(`Total Beards: ${foundIds.length}`);
}

main();
