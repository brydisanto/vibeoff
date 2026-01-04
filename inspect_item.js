const API_KEY = '003c902b643e4b06b14ae18bda215739';
const CONTRACT = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';
const ID = 6969;

async function main() {
    const url = `https://api.opensea.io/api/v2/chain/ethereum/contract/${CONTRACT}/nfts/${ID}`;

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
    console.log(JSON.stringify(data.nft.traits, null, 2));
}

main();
