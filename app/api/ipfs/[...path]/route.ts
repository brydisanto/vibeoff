import { NextRequest, NextResponse } from 'next/server';

const IPFS_GATEWAYS = [
    'https://nftstorage.link/ipfs/',
    'https://dweb.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.io/ipfs/'
];

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const ipfsPath = params.path.join('/');

    if (!ipfsPath) {
        return NextResponse.json({ error: 'Missing IPFS path' }, { status: 400 });
    }

    // Try each gateway in order until one works
    for (const gateway of IPFS_GATEWAYS) {
        try {
            const url = `${gateway}${ipfsPath}`;
            const response = await fetch(url, {
                signal: AbortSignal.timeout(8000), // 8s timeout per gateway
            });

            if (!response.ok) continue;

            const contentType = response.headers.get('content-type') || 'image/png';
            const buffer = await response.arrayBuffer();

            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable', // IPFS content is immutable
                    'Access-Control-Allow-Origin': '*',
                },
            });
        } catch {
            // Try next gateway
            continue;
        }
    }

    return NextResponse.json({ error: 'Failed to fetch from all IPFS gateways' }, { status: 502 });
}
