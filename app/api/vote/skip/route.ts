import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { walletAddress } = body;

        if (!walletAddress || typeof walletAddress !== 'string') {
            return NextResponse.json({ error: 'Missing wallet' }, { status: 400 });
        }

        const normalizedWallet = walletAddress.toLowerCase();
        const utcDateKey = new Date().toISOString().split('T')[0];
        const dailyCounterKey = `votes:wallet:${normalizedWallet}:daily:${utcDateKey}`;

        // Increment daily counter (skip costs 1 vote)
        const newCount = await kv.incr(dailyCounterKey);
        await kv.expire(dailyCounterKey, 60 * 60 * 48);

        return NextResponse.json({ success: true, votesToday: newCount });
    } catch (error) {
        console.error('Vote Skip Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
