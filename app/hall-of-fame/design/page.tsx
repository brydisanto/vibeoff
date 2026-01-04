'use client';

import { INITIAL_CHARACTERS } from '@/lib/data';

// Mock Data Helpers
const getChar = (id: number) => {
    const char = INITIAL_CHARACTERS.find(c => c.id === id);
    if (!char) return INITIAL_CHARACTERS[0];
    return char;
};

const FIRST = { ...getChar(1500), allTime: { wins: 34, losses: 5, matches: 39 } };
const SECOND = { ...getChar(506), allTime: { wins: 24, losses: 5, matches: 29 } };
const THIRD = { ...getChar(6394), allTime: { wins: 22, losses: 2, matches: 24 } };

const getWinRate = (char: typeof FIRST) => char.allTime.matches > 0 ? Math.round((char.allTime.wins / char.allTime.matches) * 100) : 0;

export default function DesignLabPage() {
    return (
        <main className="min-h-screen bg-black text-white p-4 md:p-8 font-sans bg-[url('/grid.svg')] bg-center">
            <h1 className="text-4xl font-cooper text-gvc-gold text-center mb-4">Option A Variations</h1>
            <p className="text-center text-gray-500 mb-16 text-sm">Enhanced title & stat prominence</p>


            {/* OPTION A1: Large Stats Below Image */}
            <section className="mb-32">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-400">A1: Large Stats Panel</h2>
                <p className="text-center text-gray-600 text-sm mb-8">Bigger record numbers, dedicated stat box</p>
                <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 max-w-5xl mx-auto px-4">

                    {/* #2 */}
                    <div className="w-full md:w-80 bg-zinc-900 rounded-xl overflow-hidden border border-gray-700">
                        <div className="bg-gray-600 text-white text-center py-2 font-black text-lg tracking-wide">#2</div>
                        <img src={SECOND.url} className="w-full aspect-square object-cover" />
                        <div className="p-5 text-center bg-gradient-to-b from-zinc-800 to-zinc-900">
                            <h3 className="font-display text-2xl text-white mb-2">{SECOND.name}</h3>
                            <div className="text-5xl font-display text-gray-200 mb-2">{SECOND.allTime.wins}-{SECOND.allTime.losses}</div>
                            <div className="text-lg text-gray-400 font-mono">{getWinRate(SECOND)}% Win Rate</div>
                            <div className="text-xs text-gray-600 mt-3 border-t border-gray-700 pt-3">OWNER: cosmin0lx</div>
                        </div>
                    </div>

                    {/* #1 */}
                    <div className="w-full md:w-80 bg-zinc-900 rounded-xl overflow-hidden border-2 border-gvc-gold shadow-[0_0_30px_rgba(255,204,77,0.2)]">
                        <div className="bg-gvc-gold text-black text-center py-2 font-black text-xl tracking-wide">👑 CHAMPION</div>
                        <img src={FIRST.url} className="w-full aspect-square object-cover" />
                        <div className="p-5 text-center bg-gradient-to-b from-gvc-gold/20 to-zinc-900">
                            <h3 className="font-display text-2xl text-gvc-gold mb-2">{FIRST.name}</h3>
                            <div className="text-6xl font-display text-white mb-2">{FIRST.allTime.wins}-{FIRST.allTime.losses}</div>
                            <div className="inline-block bg-gvc-gold text-black px-4 py-1 rounded-full text-lg font-bold">{getWinRate(FIRST)}% WIN RATE</div>
                            <div className="text-xs text-gray-500 mt-3 border-t border-gvc-gold/30 pt-3">OWNER: cosmin0lx</div>
                        </div>
                    </div>

                    {/* #3 */}
                    <div className="w-full md:w-80 bg-zinc-900 rounded-xl overflow-hidden border border-gray-700">
                        <div className="bg-[#CD7F32] text-black text-center py-2 font-black text-lg tracking-wide">#3</div>
                        <img src={THIRD.url} className="w-full aspect-square object-cover" />
                        <div className="p-5 text-center bg-gradient-to-b from-zinc-800 to-zinc-900">
                            <h3 className="font-display text-2xl text-white mb-2">{THIRD.name}</h3>
                            <div className="text-5xl font-display text-[#CD7F32] mb-2">{THIRD.allTime.wins}-{THIRD.allTime.losses}</div>
                            <div className="text-lg text-gray-400 font-mono">{getWinRate(THIRD)}% Win Rate</div>
                            <div className="text-xs text-gray-600 mt-3 border-t border-gray-700 pt-3">OWNER: vibes_holder</div>
                        </div>
                    </div>
                </div>
            </section>


            {/* OPTION A2: Name Above Image */}
            <section className="mb-32">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-400">A2: Title Header</h2>
                <p className="text-center text-gray-600 text-sm mb-8">GVC name prominently above image</p>
                <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 max-w-5xl mx-auto px-4">

                    {/* #2 */}
                    <div className="w-full md:w-80">
                        <div className="bg-gray-700 text-white text-center py-3 rounded-t-xl">
                            <span className="text-gray-400 text-sm">#2</span>
                            <h3 className="font-display text-2xl text-white">{SECOND.name}</h3>
                        </div>
                        <div className="bg-zinc-900 rounded-b-xl overflow-hidden border border-gray-700 border-t-0">
                            <img src={SECOND.url} className="w-full aspect-square object-cover" />
                            <div className="p-4 text-center">
                                <div className="text-4xl font-display text-gray-300">{SECOND.allTime.wins}-{SECOND.allTime.losses}</div>
                                <div className="text-sm text-gray-500">{getWinRate(SECOND)}% Win Rate</div>
                                <div className="text-xs text-gray-600 mt-2">Owner: cosmin0lx</div>
                            </div>
                        </div>
                    </div>

                    {/* #1 */}
                    <div className="w-full md:w-80">
                        <div className="bg-gvc-gold text-black text-center py-3 rounded-t-xl">
                            <span className="text-black/60 text-sm">👑 #1</span>
                            <h3 className="font-display text-3xl text-black font-black">{FIRST.name}</h3>
                        </div>
                        <div className="bg-zinc-900 rounded-b-xl overflow-hidden border-2 border-gvc-gold border-t-0 shadow-[0_0_30px_rgba(255,204,77,0.2)]">
                            <img src={FIRST.url} className="w-full aspect-square object-cover" />
                            <div className="p-4 text-center">
                                <div className="text-5xl font-display text-white">{FIRST.allTime.wins}-{FIRST.allTime.losses}</div>
                                <div className="inline-block bg-black text-gvc-gold px-3 py-0.5 rounded-full text-sm font-bold mt-1">{getWinRate(FIRST)}% WIN RATE</div>
                                <div className="text-xs text-gray-500 mt-2">Owner: cosmin0lx</div>
                            </div>
                        </div>
                    </div>

                    {/* #3 */}
                    <div className="w-full md:w-80">
                        <div className="bg-[#8B4513] text-white text-center py-3 rounded-t-xl">
                            <span className="text-white/60 text-sm">#3</span>
                            <h3 className="font-display text-2xl text-white">{THIRD.name}</h3>
                        </div>
                        <div className="bg-zinc-900 rounded-b-xl overflow-hidden border border-[#CD7F32] border-t-0">
                            <img src={THIRD.url} className="w-full aspect-square object-cover" />
                            <div className="p-4 text-center">
                                <div className="text-4xl font-display text-[#CD7F32]">{THIRD.allTime.wins}-{THIRD.allTime.losses}</div>
                                <div className="text-sm text-gray-500">{getWinRate(THIRD)}% Win Rate</div>
                                <div className="text-xs text-gray-600 mt-2">Owner: vibes_holder</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* OPTION A3: Split Stats */}
            <section className="mb-32">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-400">A3: Split Stats Grid</h2>
                <p className="text-center text-gray-600 text-sm mb-8">Wins/Losses in separate boxes</p>
                <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 max-w-5xl mx-auto px-4">

                    {/* #2 */}
                    <div className="w-full md:w-80 bg-black rounded-xl overflow-hidden border border-gray-700">
                        <div className="relative">
                            <img src={SECOND.url} className="w-full aspect-square object-cover" />
                            <div className="absolute top-3 left-3 bg-gray-600 text-white px-3 py-1 rounded-full font-bold">#2</div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-display text-2xl text-white text-center mb-3">{SECOND.name}</h3>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-center">
                                    <div className="text-3xl font-display text-green-400">{SECOND.allTime.wins}</div>
                                    <div className="text-xs text-green-600 uppercase">Wins</div>
                                </div>
                                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
                                    <div className="text-3xl font-display text-red-400">{SECOND.allTime.losses}</div>
                                    <div className="text-xs text-red-600 uppercase">Losses</div>
                                </div>
                            </div>
                            <div className="text-center text-gray-400 font-mono text-lg">{getWinRate(SECOND)}% Win Rate</div>
                            <div className="text-center text-xs text-gray-600 mt-2">Owner: cosmin0lx</div>
                        </div>
                    </div>

                    {/* #1 */}
                    <div className="w-full md:w-80 bg-black rounded-xl overflow-hidden border-2 border-gvc-gold shadow-[0_0_30px_rgba(255,204,77,0.2)]">
                        <div className="relative">
                            <img src={FIRST.url} className="w-full aspect-square object-cover" />
                            <div className="absolute top-3 left-3 bg-gvc-gold text-black px-4 py-1 rounded-full font-black">👑 #1</div>
                        </div>
                        <div className="p-4 bg-gradient-to-t from-gvc-gold/10 to-transparent">
                            <h3 className="font-display text-3xl text-gvc-gold text-center mb-3">{FIRST.name}</h3>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-green-900/40 border border-green-500/50 rounded-lg p-3 text-center">
                                    <div className="text-4xl font-display text-green-400">{FIRST.allTime.wins}</div>
                                    <div className="text-xs text-green-500 uppercase font-bold">Wins</div>
                                </div>
                                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
                                    <div className="text-4xl font-display text-red-400">{FIRST.allTime.losses}</div>
                                    <div className="text-xs text-red-600 uppercase font-bold">Losses</div>
                                </div>
                            </div>
                            <div className="text-center">
                                <span className="inline-block bg-gvc-gold text-black px-4 py-1 rounded-full font-bold text-lg">{getWinRate(FIRST)}% WIN RATE</span>
                            </div>
                            <div className="text-center text-xs text-gray-500 mt-3">Owner: cosmin0lx</div>
                        </div>
                    </div>

                    {/* #3 */}
                    <div className="w-full md:w-80 bg-black rounded-xl overflow-hidden border border-[#CD7F32]">
                        <div className="relative">
                            <img src={THIRD.url} className="w-full aspect-square object-cover" />
                            <div className="absolute top-3 left-3 bg-[#CD7F32] text-black px-3 py-1 rounded-full font-bold">#3</div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-display text-2xl text-white text-center mb-3">{THIRD.name}</h3>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-center">
                                    <div className="text-3xl font-display text-green-400">{THIRD.allTime.wins}</div>
                                    <div className="text-xs text-green-600 uppercase">Wins</div>
                                </div>
                                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
                                    <div className="text-3xl font-display text-red-400">{THIRD.allTime.losses}</div>
                                    <div className="text-xs text-red-600 uppercase">Losses</div>
                                </div>
                            </div>
                            <div className="text-center text-[#CD7F32] font-mono text-lg">{getWinRate(THIRD)}% Win Rate</div>
                            <div className="text-center text-xs text-gray-600 mt-2">Owner: vibes_holder</div>
                        </div>
                    </div>
                </div>
            </section>


            {/* OPTION A4: Minimal with Bold Record */}
            <section className="mb-32">
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-400">A4: Minimal Bold</h2>
                <p className="text-center text-gray-600 text-sm mb-8">Clean design, extra large record</p>
                <div className="flex flex-col md:flex-row justify-center items-stretch gap-8 max-w-5xl mx-auto px-4">

                    {/* #2 */}
                    <div className="w-full md:w-72 text-center">
                        <div className="text-gray-500 font-mundial font-black text-6xl mb-[-15px] relative z-0">2</div>
                        <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-gray-700 relative z-10">
                            <img src={SECOND.url} className="w-full aspect-square object-cover" />
                        </div>
                        <div className="mt-4">
                            <h3 className="font-display text-xl text-white">{SECOND.name}</h3>
                            <div className="text-5xl font-mundial font-black text-gray-300 my-2">{SECOND.allTime.wins}-{SECOND.allTime.losses}</div>
                            <div className="text-gray-500">{getWinRate(SECOND)}% Win Rate</div>
                            <div className="text-xs text-gray-600 mt-1">Owner: cosmin0lx</div>
                        </div>
                    </div>

                    {/* #1 */}
                    <div className="w-full md:w-80 text-center">
                        <div className="text-gvc-gold font-mundial font-black text-8xl mb-[-20px] relative z-0">1</div>
                        <div className="bg-zinc-900 rounded-2xl overflow-hidden border-2 border-gvc-gold shadow-[0_0_40px_rgba(255,204,77,0.2)] relative z-10">
                            <img src={FIRST.url} className="w-full aspect-square object-cover" />
                        </div>
                        <div className="mt-4">
                            <h3 className="font-display text-2xl text-gvc-gold">{FIRST.name}</h3>
                            <div className="text-7xl font-mundial font-black text-white my-2">{FIRST.allTime.wins}-{FIRST.allTime.losses}</div>
                            <div className="inline-block bg-gvc-gold text-black px-4 py-1 rounded-full font-bold">{getWinRate(FIRST)}% WIN RATE</div>
                            <div className="text-xs text-gray-500 mt-2">Owner: cosmin0lx</div>
                        </div>
                    </div>

                    {/* #3 */}
                    <div className="w-full md:w-72 text-center">
                        <div className="text-[#8B4513] font-mundial font-black text-6xl mb-[-15px] relative z-0">3</div>
                        <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-[#CD7F32] relative z-10">
                            <img src={THIRD.url} className="w-full aspect-square object-cover" />
                        </div>
                        <div className="mt-4">
                            <h3 className="font-display text-xl text-white">{THIRD.name}</h3>
                            <div className="text-5xl font-mundial font-black text-[#CD7F32] my-2">{THIRD.allTime.wins}-{THIRD.allTime.losses}</div>
                            <div className="text-gray-500">{getWinRate(THIRD)}% Win Rate</div>
                            <div className="text-xs text-gray-600 mt-1">Owner: vibes_holder</div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
