'use client';

import { INITIAL_CHARACTERS } from '@/lib/data';

// Sample GVCs for design preview
const SAMPLE_GVCS = [
    { id: 3660, name: 'GVC #3660', url: INITIAL_CHARACTERS[3659]?.url || '', allTime: { wins: 13, losses: 3, matches: 16 } },
    { id: 1855, name: 'GVC #1855', url: INITIAL_CHARACTERS[1854]?.url || '', allTime: { wins: 8, losses: 2, matches: 10 } },
    { id: 4096, name: 'GVC #4096', url: INITIAL_CHARACTERS[4095]?.url || '', allTime: { wins: 7, losses: 4, matches: 11 } },
    { id: 1270, name: 'GVC #1270', url: INITIAL_CHARACTERS[1269]?.url || '', allTime: { wins: 11, losses: 3, matches: 14 } },
];

const getWinRate = (gvc: typeof SAMPLE_GVCS[0]) => Math.round((gvc.allTime.wins / gvc.allTime.matches) * 100);

export default function ProfileDesignPage() {
    return (
        <main className="min-h-screen bg-black text-white p-4 md:p-8">
            <h1 className="text-4xl font-cooper text-gvc-gold text-center mb-4">GVC Panel Design Options</h1>
            <p className="text-center text-gray-500 mb-16 text-sm">Click panels go to Lookup page</p>

            {/* OPTION A: Current - Horizontal Compact */}
            <section className="mb-24">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-400">Option A: Horizontal Compact</h2>
                <p className="text-center text-gray-600 text-sm mb-8">Current style, slightly larger</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
                    {SAMPLE_GVCS.map(gvc => (
                        <div
                            key={gvc.id}
                            className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-gvc-gold/50 transition-all hover:scale-[1.02] cursor-pointer shadow-lg"
                        >
                            <div className="flex gap-5 p-5">
                                <img src={gvc.url} alt={gvc.name} className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover shadow-md" />
                                <div className="flex-1 flex flex-col justify-center">
                                    <h3 className="font-display text-lg md:text-xl text-white mb-1">{gvc.name}</h3>
                                    <div className="text-3xl md:text-4xl font-display text-gray-200">{gvc.allTime.wins}-{gvc.allTime.losses}</div>
                                    <div className="text-sm md:text-base text-gray-500 mt-1">{getWinRate(gvc)}% Win Rate</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* OPTION B: Vertical Card */}
            <section className="mb-24">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-400">Option B: Vertical Card</h2>
                <p className="text-center text-gray-600 text-sm mb-8">Full image with stats below</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
                    {SAMPLE_GVCS.map(gvc => (
                        <div
                            key={gvc.id}
                            className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-gvc-gold/50 transition-all hover:scale-[1.02] cursor-pointer shadow-lg"
                        >
                            <img src={gvc.url} alt={gvc.name} className="w-full aspect-square object-cover" />
                            <div className="p-4 text-center">
                                <h3 className="font-display text-lg text-white mb-1">{gvc.name}</h3>
                                <div className="text-3xl font-display text-gray-200">{gvc.allTime.wins}-{gvc.allTime.losses}</div>
                                <div className="text-sm text-gray-500">{getWinRate(gvc)}% Win Rate</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* OPTION C: Large Horizontal */}
            <section className="mb-24">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-400">Option C: Large Horizontal</h2>
                <p className="text-center text-gray-600 text-sm mb-8">Bigger image, more prominent stats</p>
                <div className="grid grid-cols-1 gap-5 max-w-2xl mx-auto">
                    {SAMPLE_GVCS.slice(0, 2).map(gvc => (
                        <div
                            key={gvc.id}
                            className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-gvc-gold/50 transition-all hover:scale-[1.01] cursor-pointer shadow-lg"
                        >
                            <div className="flex gap-6 p-6">
                                <img src={gvc.url} alt={gvc.name} className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover shadow-md" />
                                <div className="flex-1 flex flex-col justify-center">
                                    <h3 className="font-display text-xl md:text-2xl text-white mb-2">{gvc.name}</h3>
                                    <div className="text-4xl md:text-5xl font-display text-white mb-1">{gvc.allTime.wins}-{gvc.allTime.losses}</div>
                                    <div className="text-lg text-gvc-gold font-bold">{getWinRate(gvc)}% Win Rate</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* OPTION D: Mini Grid */}
            <section className="mb-24">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-400">Option D: Mini Grid</h2>
                <p className="text-center text-gray-600 text-sm mb-8">Compact grid for many GVCs</p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
                    {SAMPLE_GVCS.map(gvc => (
                        <div
                            key={gvc.id}
                            className="bg-zinc-900 rounded-xl overflow-hidden border border-white/10 hover:border-gvc-gold/50 transition-all hover:scale-105 cursor-pointer"
                        >
                            <img src={gvc.url} alt={gvc.name} className="w-full aspect-square object-cover" />
                            <div className="p-2 text-center">
                                <div className="text-xs text-gray-400">#{gvc.id}</div>
                                <div className="text-lg font-display text-white">{gvc.allTime.wins}-{gvc.allTime.losses}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* OPTION E: Stats Focus */}
            <section className="mb-24">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-400">Option E: Stats Focus</h2>
                <p className="text-center text-gray-600 text-sm mb-8">Stats-first layout with split wins/losses</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
                    {SAMPLE_GVCS.map(gvc => (
                        <div
                            key={gvc.id}
                            className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-gvc-gold/50 transition-all hover:scale-[1.02] cursor-pointer shadow-lg p-5"
                        >
                            <div className="flex gap-4 items-start">
                                <img src={gvc.url} alt={gvc.name} className="w-20 h-20 rounded-lg object-cover" />
                                <div className="flex-1">
                                    <h3 className="font-display text-lg text-white">{gvc.name}</h3>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-2 text-center">
                                            <div className="text-2xl font-display text-green-400">{gvc.allTime.wins}</div>
                                            <div className="text-[10px] text-green-600 uppercase">Wins</div>
                                        </div>
                                        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-2 text-center">
                                            <div className="text-2xl font-display text-red-400">{gvc.allTime.losses}</div>
                                            <div className="text-[10px] text-red-600 uppercase">Losses</div>
                                        </div>
                                    </div>
                                    <div className="text-center text-sm text-gray-400 mt-2">{getWinRate(gvc)}% Win Rate</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

        </main>
    );
}
