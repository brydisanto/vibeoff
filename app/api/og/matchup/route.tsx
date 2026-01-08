import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { INITIAL_CHARACTERS } from '@/lib/data';

export const runtime = 'edge';
export const maxDuration = 30;

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

    // Load Brice Bold font for VS text
    const fontData = await fetch(
        new URL('/fonts/Brice-Bold.otf', request.url)
    ).then(res => res.arrayBuffer());

    const img1Url = char1.url;
    const img2Url = char2.url;

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    background: '#0a0a0a',
                    fontFamily: 'Brice Bold',
                    gap: 20,
                }}
            >
                {/* VIBE OFF! Title */}
                <span style={{
                    fontSize: 56,
                    color: '#FFE048',
                    fontFamily: 'Brice Bold',
                    fontStyle: 'italic',
                    textShadow: '3px 3px 0px rgba(0,0,0,0.5)',
                    letterSpacing: '-1px',
                    marginBottom: 10,
                }}>
                    VIBE OFF!
                </span>

                {/* Images Row */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 50,
                    }}
                >
                    {/* Left Character - No border */}
                    <img
                        src={img1Url}
                        width={380}
                        height={380}
                        style={{
                            borderRadius: 24,
                            objectFit: 'cover',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                        }}
                    />

                    {/* VS - Brice Bold italic gold */}
                    <span style={{
                        fontSize: 72,
                        color: '#FFE048',
                        fontFamily: 'Brice Bold',
                        fontStyle: 'italic',
                        textShadow: '3px 3px 0px rgba(0,0,0,0.5), 0 0 20px rgba(255, 224, 72, 0.4)',
                        letterSpacing: '-2px',
                    }}>
                        VS
                    </span>

                    {/* Right Character - No border */}
                    <img
                        src={img2Url}
                        width={380}
                        height={380}
                        style={{
                            borderRadius: 24,
                            objectFit: 'cover',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                        }}
                    />
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: 'Brice Bold',
                    data: fontData,
                    style: 'italic',
                    weight: 700,
                },
            ],
            headers: {
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        }
    );
}
