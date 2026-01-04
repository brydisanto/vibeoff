const fs = require('fs');

const API_KEY = '003c902b643e4b06b14ae18bda215739';
const SLUG = 'good-vibes-club';
const TRAIT_TYPE = 'Type';
const TRAIT_VALUE = 'Gold';

// Function to fetch page
async function fetchPage(next = '') {
    const url = `https://api.opensea.io/api/v2/collection/${SLUG}/nfts?limit=200&traits=${encodeURIComponent(JSON.stringify({ [TRAIT_TYPE]: [TRAIT_VALUE] }))}${next ? `&next=${next}` : ''}`;

    console.log(`Fetching: ${url}`);

    const response = await fetch(url, {
        headers: {
            'x-api-key': API_KEY,
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
}

// Main
async function main() {
    let allIds = [];
    let next = '';

    try {
        do {
            const data = await fetchPage(next);
            const nfts = data.nfts || [];

            const ids = nfts.map(nft => parseInt(nft.identifier));
            allIds = [...allIds, ...ids];

            console.log(`Fetched ${ids.length} Gold tokens. Total: ${allIds.length}`);

            next = data.next;
        } while (next);

        console.log('--- ALL GOLD IDS ---');
        console.log(JSON.stringify(allIds.sort((a, b) => a - b)));
        console.log(`Total Count: ${allIds.length}`);

    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

main();
