const fs = require('fs');

const CID = 'QmczTDgYkd5BXb4cKGo7Qo696vwUMEJG1hSUtY845eDvgh';
const TOTAL_SUPPLY = 6969;
const CONCURRENCY = 60;
const GATEWAYS = [
    'https://dweb.link/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://ipfs.io/ipfs'
];

async function fetchMetadata(id) {
    const gateway = GATEWAYS[Math.floor(Math.random() * GATEWAYS.length)];
    const url = `${gateway}/${CID}/${id}`;
    let retries = 3;
    while (retries > 0) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                return data;
            }
        } catch (err) {
            // Log only critical errors
        }
        retries--;
        await new Promise(r => setTimeout(r, 1000));
    }
    return null;
}

async function main() {
    console.log(`Scanning ${TOTAL_SUPPLY} items for Type="Gold"... (Multi-Gateway)`);
    const goldIds = [];
    let processed = 0;

    // chunk iterator
    for (let i = 1; i <= TOTAL_SUPPLY; i += CONCURRENCY) {
        const batch = [];
        for (let j = 0; j < CONCURRENCY && (i + j) <= TOTAL_SUPPLY; j++) {
            batch.push(i + j);
        }

        const results = await Promise.all(batch.map(async (id) => {
            const data = await fetchMetadata(id);
            if (!data) return null;

            const typeTrait = data.attributes?.find(a => a.trait_type === 'Type');
            if (typeTrait && typeTrait.value === 'Gold') {
                return id;
            }
            return null;
        }));

        results.forEach(id => {
            if (id) goldIds.push(id);
        });

        processed += batch.length;
        process.stdout.write(`\rProgress: ${processed}/${TOTAL_SUPPLY} | Gold Found: ${goldIds.length}`);
    }

    console.log('\n--- DONE ---');
    console.log(JSON.stringify(goldIds.sort((a, b) => a - b)));
    console.log(`Total Gold: ${goldIds.length}`);
}

main();
