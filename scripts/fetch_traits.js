/**
 * Fetch trait metadata for all GVCs from IPFS
 * Source: ipfs://QmczTDgYkd5BXb4cKGo7Qo696vwUMEJG1hSUtY845eDvgh/{id}
 * 
 * Includes trait grouping logic (e.g., Mullets)
 * Supports resuming via --resume flag
 */

const fs = require('fs');

const IPFS_BASE_HASH = 'QmczTDgYkd5BXb4cKGo7Qo696vwUMEJG1hSUtY845eDvgh';
const OUTPUT_FILE = './lib/trait_map.json';
const TOTAL_GVCS = 6969;

// Categories to include
const INCLUDE_CATEGORIES = ['Body', 'Face', 'Hair', 'Type'];

// Gateways to try in order
const GATEWAYS = [
    `https://nftstorage.link/ipfs/${IPFS_BASE_HASH}/`,
    `https://dweb.link/ipfs/${IPFS_BASE_HASH}/`,
    `https://cloudflare-ipfs.com/ipfs/${IPFS_BASE_HASH}/`,
    `https://ipfs.io/ipfs/${IPFS_BASE_HASH}/`
];

// Concurrency settings
const CONCURRENCY = 20; // IPFS gateways can handle more parallel requests
const BATCH_DELAY = 100;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeTrait(category, value) {
    // Group Mullets
    if (category === 'Hair' && value.startsWith('Mullet')) {
        return 'Mullets';
    }
    return value;
}

async function fetchMetadata(id, retries = 2) {
    for (const gateway of GATEWAYS) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout per request

                const response = await fetch(`${gateway}${id}`, {
                    signal: controller.signal
                });
                clearTimeout(timeout);

                if (!response.ok) {
                    if (response.status === 429) {
                        await sleep(2000);
                        continue;
                    }
                    throw new Error(`Status ${response.status}`);
                }

                // Parse JSON
                // Sometimes IPFS gateways return HTML on 404s or errors, so try/catch parse
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    throw new Error('Invalid JSON');
                }

                const attributes = data.attributes || [];
                const traits = {};

                for (const attr of attributes) {
                    if (!attr.trait_type || !attr.value) continue;
                    if (!INCLUDE_CATEGORIES.includes(attr.trait_type)) continue;

                    const normalizedValue = normalizeTrait(attr.trait_type, attr.value);
                    traits[attr.trait_type] = normalizedValue;
                }

                return Object.keys(traits).length > 0 ? traits : null;

            } catch (err) {
                // If checking the last gateway and last attempt, log error
                if (gateway === GATEWAYS[GATEWAYS.length - 1] && attempt === retries) {
                    // silently fail for individual items to keep moving, but maybe return null
                }
            }
        }
    }
    return null;
}

async function main() {
    const resume = process.argv.includes('--resume');
    let allTraits = {};

    if (resume && fs.existsSync(OUTPUT_FILE)) {
        allTraits = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
        console.log(`Resuming from ${Object.keys(allTraits).length} entries`);
    }

    const idsToFetch = [];
    for (let id = 1; id <= TOTAL_GVCS; id++) {
        if (!allTraits[String(id)]) {
            idsToFetch.push(id);
        }
    }

    console.log(`Fetching ${idsToFetch.length} GVCs from IPFS (${CONCURRENCY} concurrent)...`);

    let completed = 0;
    const startTime = Date.now();

    for (let i = 0; i < idsToFetch.length; i += CONCURRENCY) {
        const batch = idsToFetch.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(id => fetchMetadata(id).then(t => ({ id, traits: t }))));

        for (const { id, traits } of results) {
            if (traits) {
                allTraits[String(id)] = traits;
            }
            completed++;
        }

        if (completed % 100 < CONCURRENCY) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = completed / elapsed;
            const remaining = (idsToFetch.length - completed) / rate;
            console.log(`Progress: ${completed}/${idsToFetch.length} (${Object.keys(allTraits).length} found) | ${rate.toFixed(1)}/s | ~${Math.ceil(remaining / 60)}m left`);

            // Save checkpoint
            if (completed % 500 < CONCURRENCY) {
                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTraits, null, 2));
            }
        }

        await sleep(BATCH_DELAY);
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTraits, null, 2));
    console.log(`\nDone! Scraped ${Object.keys(allTraits).length} GVCs.`);

    // Summary
    const categories = new Set();
    Object.values(allTraits).forEach(t => Object.keys(t).forEach(k => categories.add(k)));

    console.log('\nCategories:', [...categories].sort().join(', '));

    ['Hair'].forEach(cat => {
        const values = {};
        Object.values(allTraits).forEach(t => {
            if (t[cat]) values[t[cat]] = (values[t[cat]] || 0) + 1;
        });
        console.log(`\n${cat} Stats:`);
        Object.entries(values)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([v, c]) => console.log(`  ${v}: ${c}`));
    });
}

main().catch(console.error);
