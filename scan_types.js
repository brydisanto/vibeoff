const fs = require('fs');

const CID = 'QmczTDgYkd5BXb4cKGo7Qo696vwUMEJG1hSUtY845eDvgh';
const TOTAL_SUPPLY = 500; // Scan first 500
const CONCURRENCY = 10;
const GATEWAY = 'https://dweb.link/ipfs';

async function fetchMetadata(id) {
    const url = `${GATEWAY}/${CID}/${id}`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) return await res.json();
    } catch (err) {
        if (id < 5) console.error(`Failed ${id}:`, err.message);
    }
    return null;
}

async function main() {
    console.log(`Scanning first ${TOTAL_SUPPLY} items for Types...`);
    const types = new Set();

    for (let i = 1; i <= TOTAL_SUPPLY; i += CONCURRENCY) {
        const batch = [];
        for (let j = 0; j < CONCURRENCY && (i + j) <= TOTAL_SUPPLY; j++) {
            batch.push(i + j);
        }

        const results = await Promise.all(batch.map(async (id) => {
            const data = await fetchMetadata(id);
            if (!data) return null;
            const typeTrait = data.attributes?.find(a => a.trait_type === 'Type');
            return typeTrait ? typeTrait.value : null;
        }));

        results.forEach(t => {
            if (t) types.add(t);
        });

        process.stdout.write(`\rFound ${types.size} unique types...`);
    }

    console.log('\n--- UNIQUE TYPES ---');
    console.log(Array.from(types).sort());
}

main();
