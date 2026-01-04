const API_KEY = '003c902b643e4b06b14ae18bda215739';
const SLUG = 'good-vibes-club';
const TRAIT_TYPE = 'Type';
const TRAIT_VALUE = 'Gold';

async function main() {
    const url = `https://api.opensea.io/api/v2/collection/${SLUG}/nfts?limit=1&traits=${encodeURIComponent(JSON.stringify({ [TRAIT_TYPE]: [TRAIT_VALUE] }))}`;

    console.log(`Fetching: ${url}`);

    const response = await fetch(url, {
        headers: {
            'x-api-key': API_KEY,
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        console.error(`Error: ${response.status} ${response.statusText}`);
        return;
    }

    const data = await response.json();
    if (data.nfts && data.nfts.length > 0) {
        console.log('First Item:');
        console.log(JSON.stringify(data.nfts[0], null, 2));
    } else {
        console.log('No items found.');
    }
}

main();
