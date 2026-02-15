import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { walletAddress, votes } = body;

        if (!walletAddress || !Array.isArray(votes)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const normalizedWallet = walletAddress.toLowerCase();

        // Fetch existing history to prevent duplicates
        // We only check the last 50-100 to save bandwidth/time, 
        // assuming sync happens relatively soon after voting.
        const existingRaw = await kv.lrange(`votes:wallet:${normalizedWallet}`, 0, 199);
        const existingVotes = new Set(existingRaw.map((v: any) => {
            try {
                const parsed = typeof v === 'string' ? JSON.parse(v) : v;
                // Composite key for uniqueness
                return `${parsed.timestamp}-${parsed.winnerId}-${parsed.loserId}`;
            } catch { return null; }
        }));

        let addedCount = 0;

        // Process new votes
        for (const vote of votes) {
            const { winnerId, loserId, timestamp } = vote;
            if (!winnerId || !loserId || !timestamp) continue;

            const key = `${timestamp}-${winnerId}-${loserId}`;

            // If this vote is NOT in history, add it
            if (!existingVotes.has(key)) {
                await kv.lpush(`votes:wallet:${normalizedWallet}`, JSON.stringify({ winnerId, loserId, timestamp }));
                addedCount++;
            }
        }

        // Trim to keep history manageable (50k limit)
        await kv.ltrim(`votes:wallet:${normalizedWallet}`, 0, 49999);

        return NextResponse.json({ success: true, added: addedCount });
    } catch (error) {
        console.error('Vote Sync Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
