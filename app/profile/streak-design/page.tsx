'use client';

import { useState } from 'react';
import { Flame } from 'lucide-react';
import Link from 'next/link';
import { INITIAL_CHARACTERS } from '@/lib/data';

// Mock GVC Data
const baseChar = INITIAL_CHARACTERS[0];
const MOCK_GVC = {
    id: baseChar.id,
    name: baseChar.name,
    url: baseChar.url,
    allTime: {
        wins: 8,
        losses: 2,
        matches: 10,
        rank: 42,
        winStreak: 5
    }
};

export default function StreakDesignPage() {
    return (
        <main className="min-h-screen bg-gvc-black text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/profile" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        ← Back
                    </Link>
                    <h1 className="text-3xl font-display text-gvc-gold">Streak Design Options</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Option A: Current */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-400">Option A: Current</h2>
                        <GvcCard variant="current" />
                        <p className="text-sm text-gray-500">Badge + Bottom Border</p>
                    </div>

                    {/* Option B: Glowing Pulse */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-400">Option B: Glowing Pulse</h2>
                        <GvcCard variant="glow" />
                        <p className="text-sm text-gray-500">Outer glow animation + integrated badge</p>
                    </div>

                    {/* Option C: Fire Overlay */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-400">Option C: Fire Overlay</h2>
                        <GvcCard variant="overlay" />
                        <p className="text-sm text-gray-500">Bottom gradient overlay with fire icon</p>
                    </div>

                    {/* Option D: Minimalist */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-400">Option D: Minimalist</h2>
                        <GvcCard variant="minimal" />
                        <p className="text-sm text-gray-500">Icon in name, subtle indicator</p>
                    </div>

                    {/* Option E: Intense */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-400">Option E: Intense</h2>
                        <GvcCard variant="intense" />
                        <p className="text-sm text-gray-500">Animated background + large badge</p>
                    </div>
                </div>
            </div>
        </main>
    );
}

function GvcCard({ variant }: { variant: 'current' | 'glow' | 'overlay' | 'minimal' | 'intense' }) {
    const gvc = MOCK_GVC;
    const streak = gvc.allTime.winStreak;

    // Base classes
    const containerClasses = "bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 group shadow-lg block relative";

    // Variant specific container classes
    const variantClasses = {
        current: "",
        glow: "shadow-[0_0_30px_rgba(234,88,12,0.3)] border-orange-500/50 animate-pulse",
        overlay: "",
        minimal: "",
        intense: "bg-gradient-to-br from-orange-900/40 to-zinc-900 border-orange-500 shadow-[0_0_40px_rgba(234,88,12,0.5)]"
    };

    return (
        <div className={`${containerClasses} ${variantClasses[variant]}`}>
            <div className="relative">
                <img
                    src={gvc.url}
                    alt={gvc.name}
                    className={`
                        w-full aspect-square object-cover
                        ${variant === 'current' ? 'border-b-4 border-orange-500' : ''}
                        ${variant === 'overlay' ? 'mask-image-gradient' : ''}
                    `}
                />

                {/* Variant Overlays */}

                {/* A: Current */}
                {variant === 'current' && (
                    <div className="absolute top-3 right-3 flex flex-col items-center">
                        <div className="bg-orange-600 text-white p-2 rounded-full shadow-[0_0_20px_rgba(234,88,12,0.6)] animate-pulse border border-orange-400">
                            <Flame size={20} fill="white" />
                        </div>
                        <div className="mt-2 bg-orange-600/90 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-400/50 shadow-lg tracking-wide">
                            {streak} STREAK
                        </div>
                    </div>
                )}

                {/* B: Glow (Badge inside) */}
                {variant === 'glow' && (
                    <div className="absolute top-3 right-3">
                        <div className="bg-black/60 backdrop-blur-md text-orange-400 border border-orange-500/50 px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 shadow-xl">
                            <Flame size={16} className="text-orange-500 fill-orange-500 animate-bounce" />
                            {streak} WINS
                        </div>
                    </div>
                )}

                {/* C: Overlay */}
                {variant === 'overlay' && (
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-orange-900/90 to-transparent flex items-end justify-center pb-4">
                        <div className="flex flex-col items-center animate-bounce-slight">
                            <Flame size={32} className="text-white fill-orange-500 drop-shadow-[0_0_10px_rgba(255,165,0,0.8)]" />
                            <span className="text-white font-black text-xl italic tracking-wider drop-shadow-lg">{streak} STREAK</span>
                        </div>
                    </div>
                )}

                {/* E: Intense */}
                {variant === 'intense' && (
                    <>
                        <div className="absolute inset-0 border-4 border-orange-500/50 animate-pulse rounded-t-3xl z-10 pointer-events-none"></div>
                        <div className="absolute top-0 right-0 p-4 z-20">
                            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-3 rounded-xl shadow-2xl border border-white/20 transform rotate-3 flex flex-col items-center">
                                <Flame size={24} fill="white" className="mb-1" />
                                <span className="font-black text-xs">ON FIRE</span>
                                <span className="font-black text-xl">{streak}</span>
                            </div>
                        </div>
                    </>
                )}

                {/* Rank Badge (Common) */}
                {variant !== 'overlay' && (
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 text-sm font-bold font-mono z-10">
                        #{gvc.allTime.rank}
                    </div>
                )}
            </div>

            <div className="p-6 text-center relative z-20">
                <h3 className="font-display text-xl md:text-2xl text-white mb-2 flex items-center justify-center gap-2">
                    {gvc.name}
                    {variant === 'minimal' && (
                        <div className="bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-md text-xs font-bold border border-orange-500/30 flex items-center gap-1">
                            <Flame size={12} fill="currentColor" /> {streak}
                        </div>
                    )}
                </h3>
                <div className="text-3xl md:text-4xl font-display text-gray-200 mb-1">
                    {gvc.allTime.wins}-{gvc.allTime.losses}
                </div>
                <div className="text-sm text-gray-500 font-mono mt-1">
                    (80% Win Rate)
                </div>
            </div>
        </div>
    );
}
