import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        await kv.flushall();
        return NextResponse.json({ success: true, message: 'Database wiped.' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to wipe' }, { status: 500 });
    }
}
