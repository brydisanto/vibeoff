import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { INITIAL_CHARACTERS } from '@/lib/data';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
        return new Response('Missing ids parameter', { status: 400 });
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (ids.length !== 2) {
        return new Response('Expected 2 character IDs', { status: 400 });
    }

    const char1 = INITIAL_CHARACTERS.find(c => c.id === ids[0]);
    const char2 = INITIAL_CHARACTERS.find(c => c.id === ids[1]);

    if (!char1 || !char2) {
        return new Response('Character not found', { status: 404 });
    }

    const img1Url = char1.url;
    const img2Url = char2.url;

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    background: '#000000',
                    backgroundImage: 'url(data:image/svg+xml,' + encodeURIComponent('<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" fill="none"/><path d="M0 40L40 0M0 0L40 40" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></svg>') + ')',
                    fontFamily: 'sans-serif',
                    gap: 60,
                }}
            >
                {/* Left Character */}
                <img
                    src={img1Url}
                    width={340}
                    height={340}
                    style={{
                        borderRadius: 24,
                        border: '5px solid #FFE048',
                        objectFit: 'cover',
                    }}
                />

                {/* VS - matching homepage italic gold style */}
                <span style={{
                    fontSize: 72,
                    color: '#FFE048',
                    fontWeight: 'bold',
                    fontStyle: 'italic',
                    textShadow: '0 0 30px rgba(255, 224, 72, 0.5)',
                }}>
                    VS
                </span>

                {/* Right Character */}
                <img
                    src={img2Url}
                    width={340}
                    height={340}
                    style={{
                        borderRadius: 24,
                        border: '5px solid #FFE048',
                        objectFit: 'cover',
                    }}
                />
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
