import { Metadata } from 'next';
import { INITIAL_CHARACTERS } from '@/lib/data';
import Link from 'next/link';

interface SharePageProps {
    searchParams: { ids?: string };
}

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
    const ids = searchParams.ids?.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) || [];

    const char1 = INITIAL_CHARACTERS.find(c => c.id === ids[0]);
    const char2 = INITIAL_CHARACTERS.find(c => c.id === ids[1]);

    const title = char1 && char2
        ? `${char1.name} vs ${char2.name} | VIBE OFF!`
        : 'VIBE OFF! | Good Vibes Club';

    const description = char1 && char2
        ? `🔥 Who has the better vibes? ${char1.name} vs ${char2.name} – Cast your vote now!`
        : '🔥 Vote on the ultimate GVC matchup!';

    // Dynamic OG image URL with both character images
    const ogImageUrl = ids.length === 2
        ? `https://vibeoff.xyz/api/og/matchup?ids=${ids.join(',')}`
        : 'https://vibeoff.xyz/og-default.png';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            url: `https://vibeoff.xyz/share?ids=${ids.join(',')}`,
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
        },
    };
}

export default function SharePage({ searchParams }: SharePageProps) {
    const ids = searchParams.ids?.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) || [];
    const char1 = INITIAL_CHARACTERS.find(c => c.id === ids[0]);
    const char2 = INITIAL_CHARACTERS.find(c => c.id === ids[1]);

    return (
        <main className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
            {/* OG Image Preview */}
            {char1 && char2 && (
                <div className="mb-8">
                    <img
                        src={`/api/og/matchup?ids=${ids.join(',')}`}
                        alt={`${char1.name} vs ${char2.name}`}
                        className="max-w-xl rounded-xl shadow-2xl border-2 border-gvc-gold"
                    />
                </div>
            )}

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-cooper text-gvc-gold mb-4">
                {char1 && char2 ? `${char1.name} vs ${char2.name}` : 'VIBE OFF!'}
            </h1>

            <p className="text-gray-400 text-lg mb-8 text-center max-w-md">
                🔥 Cast your vote on the ultimate vibe matchup!
            </p>

            {/* CTA Button */}
            <Link
                href="/"
                className="px-8 py-4 bg-gvc-gold text-black font-bold text-lg rounded-full hover:bg-[#FFE058] transition-all shadow-lg"
            >
                Vote Now on VIBE OFF!
            </Link>

            {/* Auto-redirect script for users (doesn't affect crawlers) */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        setTimeout(function() {
                            window.location.href = '/';
                        }, 3000);
                    `
                }}
            />

            <p className="text-gray-600 text-sm mt-4">
                Redirecting in 3 seconds...
            </p>
        </main>
    );
}
