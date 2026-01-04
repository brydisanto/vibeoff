const HASH = 'QmczTDgYkd5BXb4cKGo7Qo696vwUMEJG1hSUtY845eDvgh';
const ID = 1;

async function main() {
    const url = `https://dweb.link/ipfs/${HASH}/${ID}`;

    console.log(`Fetching: ${url}`);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

main();
