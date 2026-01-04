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

const TARGET_TYPES = [
    'Vibefoot',
    'Flower Power',
    'Chill Vibes Guy',
    'Super Vibe',
    'XRay',
    'Glass Jelly',
    'The Champion Of Vibes',
    'Bad Vibes Guy',
    'Holo Leader'
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
    console.log(`Scanning ${TOTAL_SUPPLY} items for 1/1s...`);
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
            const typeTrait = data.attributes?.find(a => a.trait_type === 'Type');
            return (typeTrait && TARGET_TYPES.includes(typeTrait.value)) ? { id, type: typeTrait.value } : null;
        }));

        results.forEach(res => {
            if (res) {
                foundIds.push(res);
                console.log(`\nFOUND: #${res.id} (${res.type})`);
            }
        });

        processed += batch.length;
        process.stdout.write(`\rProgress: ${processed}/${TOTAL_SUPPLY} | 1/1s Found: ${foundIds.length}`);
    }

    console.log('\n--- DONE ---');
    console.log(JSON.stringify(foundIds.map(f => f.id).sort((a, b) => a - b)));
    console.log(`Total 1/1s: ${foundIds.length}`);
}

main();
