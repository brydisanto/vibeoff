'use client';

import { motion } from 'framer-motion';
import { Trophy, Swords, Percent, Crown, TrendingUp } from 'lucide-react';

export default function StatsDesignPage() {
    // Mock Data
    const stats = {
        wins: 84,
        losses: 32,
        winRate: 72,
        rank: 65
    };

    return (
        <main className="min-h-screen bg-black text-white p-8 bg-[url('/grid.svg')] bg-center bg-fixed">
            <div className="max-w-4xl mx-auto space-y-20 pb-20">

                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-cooper font-bold text-[#FFE048] mb-4">Stats Design Options</h1>
                    <p className="text-gray-400">Comparing different visual treatments for the collector stats block.</p>
                </div>

                {/* Option A: Minimal (Current) */}
                <section>
                    <div className="text-xs font-mono text-gray-500 mb-4 uppercase tracking-widest">Option A: Minimal (Current)</div>
                    <div className="border border-white/10 rounded-3xl p-8 bg-black/50">
                        <div className="flex justify-center gap-8 md:gap-16 text-center">
                            <div>
                                <div className="text-3xl md:text-5xl font-display text-white">{stats.wins}-{stats.losses}</div>
                                <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-[0.2em] mt-2 font-bold">Record</div>
                            </div>
                            <div>
                                <div className="text-3xl md:text-5xl font-display text-white">{stats.winRate}%</div>
                                <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-[0.2em] mt-2 font-bold">Win Rate</div>
                            </div>
                            <div>
                                <div className="text-3xl md:text-5xl font-display text-white">#{stats.rank}</div>
                                <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-[0.2em] mt-2 font-bold">Rank</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Option B: Neon Cards */}
                <section>
                    <div className="text-xs font-mono text-gray-500 mb-4 uppercase tracking-widest">Option B: Neon Cards</div>
                    <div className="border border-white/10 rounded-3xl p-8 bg-black/50">
                        <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-2xl mx-auto">
                            {/* Record */}
                            <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center hover:border-[#FFE048]/50 transition-colors group">
                                <div className="text-white/30 mb-2 flex justify-center"><Swords className="w-5 h-5 group-hover:text-[#FFE048] transition-colors" /></div>
                                <div className="text-2xl md:text-4xl font-display text-white group-hover:text-[#FFE048] transition-colors">{stats.wins}-{stats.losses}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Record</div>
                            </div>
                            {/* Win Rate */}
                            <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center hover:border-blue-400/50 transition-colors group">
                                <div className="text-white/30 mb-2 flex justify-center"><Percent className="w-5 h-5 group-hover:text-blue-400 transition-colors" /></div>
                                <div className="text-2xl md:text-4xl font-display text-white group-hover:text-blue-400 transition-colors">{stats.winRate}%</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Win Rate</div>
                            </div>
                            {/* Rank */}
                            <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center hover:border-purple-400/50 transition-colors group">
                                <div className="text-white/30 mb-2 flex justify-center"><Trophy className="w-5 h-5 group-hover:text-purple-400 transition-colors" /></div>
                                <div className="text-2xl md:text-4xl font-display text-white group-hover:text-purple-400 transition-colors">#{stats.rank}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Rank</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Option C: Connected Pill */}
                <section>
                    <div className="text-xs font-mono text-gray-500 mb-4 uppercase tracking-widest">Option C: Connected Pill</div>
                    <div className="border border-white/10 rounded-3xl p-8 bg-black/50 flex justify-center">
                        <div className="inline-flex bg-[#111] rounded-full border border-white/10 p-2 shadow-lg">
                            <div className="flex items-center divide-x divide-white/10 px-4 py-2">
                                <div className="px-6 text-center">
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Record</div>
                                    <div className="text-2xl font-display text-white">{stats.wins}-{stats.losses}</div>
                                </div>
                                <div className="px-6 text-center">
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Win Rate</div>
                                    <div className="text-2xl font-display text-[#FFE048]">{stats.winRate}%</div>
                                </div>
                                <div className="px-6 text-center">
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Rank</div>
                                    <div className="text-2xl font-display text-white">#{stats.rank}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Option D: Hero Badge */}
                <section>
                    <div className="text-xs font-mono text-gray-500 mb-4 uppercase tracking-widest">Option D: Hero Badge (Rank Focus)</div>
                    <div className="border border-white/10 rounded-3xl p-8 bg-black/50">
                        <div className="flex flex-col items-center">
                            {/* Rank Badge */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-[#FFE048] blur-[40px] opacity-20 rounded-full animate-pulse"></div>
                                <div className="relative bg-[#FFE048] text-black w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 border-black ring-4 ring-[#FFE048]/50 shadow-xl">
                                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Rank</div>
                                    <div className="text-4xl font-display leading-none">#{stats.rank}</div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex gap-12 border-t border-white/10 pt-6">
                                <div className="text-center">
                                    <div className="text-3xl font-display text-gray-200">{stats.wins}-{stats.losses}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Record</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-display text-gray-200">{stats.winRate}%</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Win Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
