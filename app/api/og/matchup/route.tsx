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

    // Use the url property from Character interface (already full URL)
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
                    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Title */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 30,
                    }}
                >
                    <span style={{ fontSize: 48, color: '#FFE048', fontWeight: 'bold' }}>
                        🔥 VIBE OFF! 🔥
                    </span>
                </div>

                {/* Images Container */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 40,
                    }}
                >
                    {/* Left Character */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <img
                            src={img1Url}
                            width={280}
                            height={280}
                            style={{
                                borderRadius: 20,
                                border: '4px solid #FFE048',
                            }}
                        />
                        <span style={{
                            marginTop: 16,
                            fontSize: 28,
                            color: '#fff',
                            fontWeight: 'bold',
                        }}>
                            {char1.name}
                        </span>
                    </div>

                    {/* VS */}
                    <span style={{
                        fontSize: 64,
                        color: '#FFE048',
                        fontWeight: 'bold',
                        fontStyle: 'italic',
                    }}>
                        VS
                    </span>

                    {/* Right Character */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <img
                            src={img2Url}
                            width={280}
                            height={280}
                            style={{
                                borderRadius: 20,
                                border: '4px solid #FFE048',
                            }}
                        />
                        <span style={{
                            marginTop: 16,
                            fontSize: 28,
                            color: '#fff',
                            fontWeight: 'bold',
                        }}>
                            {char2.name}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: 40,
                    }}
                >
                    <span style={{ fontSize: 24, color: '#888' }}>
                        vibeoff.xyz • @GoodVibesClub
                    </span>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
