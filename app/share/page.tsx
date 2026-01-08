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
        ? `GVC #${char1.id} vs GVC #${char2.id} | VIBE OFF!`
        : 'VIBE OFF! | Good Vibes Club';

    const description = char1 && char2
        ? `🔥 Who has the better vibes? GVC #${char1.id} vs GVC #${char2.id} – Cast your vote now!`
        : '🔥 Vote on the ultimate GVC matchup!';

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
        <main className="min-h-screen bg-gvc-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background gradient effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-gvc-gold/5 via-transparent to-purple-500/5 pointer-events-none" />

            {/* OG Image Preview - matching homepage card styling */}
            {char1 && char2 && (
                <div className="mb-8 relative z-10">
                    <img
                        src={`/api/og/matchup?ids=${ids.join(',')}`}
                        alt={`GVC #${char1.id} vs GVC #${char2.id}`}
                        className="max-w-2xl w-full rounded-2xl shadow-2xl border-4 border-gvc-gold/50"
                    />
                </div>
            )}

            {/* Title - Just # vs. # */}
            <h1 className="text-4xl md:text-6xl font-display italic text-gvc-gold mb-4 relative z-10">
                {char1 && char2 ? `#${char1.id} vs. #${char2.id}` : 'VIBE OFF!'}
            </h1>

            {/* Subtext */}
            <p className="text-gray-400 text-lg md:text-xl mb-8 text-center max-w-md font-mundial relative z-10">
                Play Good Vibes Club&apos;s 1v1 matchup game today!
            </p>

            {/* CTA Button - matching homepage gold button */}
            <Link
                href="/"
                className="px-10 py-5 bg-gvc-gold text-black font-bold text-xl rounded-lg hover:bg-[#FFE058] transition-all shadow-lg uppercase tracking-wider relative z-10"
            >
                VIBE OFF!!!
            </Link>

            {/* Auto-redirect script */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        setTimeout(function() {
                            window.location.href = '/';
                        }, 4000);
                    `
                }}
            />

            <p className="text-gray-600 text-sm mt-6 relative z-10 font-mono">
                Redirecting in 4 seconds...
            </p>
        </main>
    );
}
