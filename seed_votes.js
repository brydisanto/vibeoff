const API_URL = 'https://vibe-offs.vercel.app/api/vote';
const IDS = [1, 5, 420, 69, 10, 100, 500, 1000, 42, 777, 888, 999, 123, 222, 333];

async function seed() {
    console.log("Seeding votes to " + API_URL + "...");
    for (let i = 0; i < 50; i++) {
        // Pick two random IDs
        const winner = IDS[Math.floor(Math.random() * IDS.length)];
        let loser = IDS[Math.floor(Math.random() * IDS.length)];
        while (loser === winner) loser = IDS[Math.floor(Math.random() * IDS.length)];

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ winnerId: winner, loserId: loser })
            });
            if (res.ok) {
                process.stdout.write('.');
            } else {
                console.error('Request failed:', res.status, await res.text());
            }
        } catch (e) {
            console.error("Error casting vote:", e.message);
        }
    }
    console.log("\nDone! Cast 50 random votes.");
}

seed();
