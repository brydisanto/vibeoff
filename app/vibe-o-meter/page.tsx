'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function VibeOmnimeterPage() {
    const [count, setCount] = useState<number | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [feed, setFeed] = useState<any[]>([]);
    const [isWiggling, setIsWiggling] = useState(false);
    const prevCountRef = useRef<number | null>(null);

    const maxVolume = Math.max(...history.map(h => h.value), 10); // Minimum scale of 10 for visibility

    useEffect(() => {
        const fetchCount = () => {
            fetch('/api/vibe-o-meter')
                .then(res => res.json())
                .then(data => {
                    const newCount = data.count;
                    setCount(newCount);
                    setHistory(data.history || []);
                    setFeed(data.feed || []);

                    // Trigger wiggle if count increased
                    if (prevCountRef.current !== null && newCount > prevCountRef.current) {
                        setIsWiggling(true);
                        setTimeout(() => setIsWiggling(false), 500);
                    }
                    prevCountRef.current = newCount;
                })
                .catch(console.error);
        };

        // Initial fetch
        fetchCount();

        // Poll every 3 seconds for real-time vibe
        const interval = setInterval(fetchCount, 3000);
        return () => clearInterval(interval);
    }, []);

    const formattedCount = count !== null ? count.toLocaleString() : '---';

    return (
        <main className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center relative overflow-hidden">
            <style jsx global>{`
                @keyframes wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-15deg); }
                    75% { transform: rotate(15deg); }
                }
                .animate-wiggle {
                    animation: wiggle 0.4s ease-in-out;
                }
            `}</style>

            {/* Background Effects */}
            <div className="absolute inset-0 bg-[#050505]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gvc-gold/5 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            <div className="w-full flex justify-start md:absolute md:top-8 md:left-8 z-20 mb-8 md:mb-0">
                <Link
                    href="/"
                    className="bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#252525] transition-colors border border-white/10 px-6 py-3 rounded-lg font-bold uppercase text-sm tracking-wide"
                >
                    BACK
                </Link>
            </div>

            <div className="relative z-10 text-center flex flex-col gap-6 w-full max-w-4xl mx-auto">
                {/* Header - Daily Style */}
                <div className="flex flex-col items-center mb-4">
                    <motion.h1
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 10,
                            mass: 1
                        }}
                        className="text-5xl md:text-7xl lg:text-8xl font-cooper text-center text-gvc-gold glowing-text leading-none"
                    >
                        VIBE-O-METER
                    </motion.h1>
                </div>

                {/* Option A: Gold Standard Design */}
                <div className="w-full bg-[#080808] border border-white/5 p-8 md:p-16 rounded-3xl flex flex-col items-center justify-center gap-8 shadow-2xl relative overflow-hidden">
                    {/* Glossy highlight */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        <img
                            src="/gvc_shaka.png"
                            alt="Shaka"
                            className={`w-20 h-20 md:w-32 md:h-32 object-contain ${isWiggling ? 'animate-wiggle' : ''}`}
                        />
                        <div className="font-display text-7xl md:text-9xl text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] tabular-nums">
                            {formattedCount}
                        </div>
                    </div>
                    <div className="text-gray-400 font-bold tracking-[0.4em] text-sm md:text-lg uppercase">
                        TOTAL VIBEOFFS!
                    </div>
                    <div className="text-gray-600 font-mono text-xs max-w-md mx-auto mt-[-1rem]">
                        Live global count of all completed VIBE OFF! matchups.
                    </div>
                </div>

                {/* Volume Graph Section */}
                <div className="w-full space-y-4 pt-4">
                    <h2 className="text-gray-500 font-mono text-xs uppercase tracking-widest text-left pl-2">VIBEOFF VELOCITY</h2>
                    <div className="h-24 w-full flex items-end justify-between gap-1 px-4 bg-white/5 rounded-lg p-2 border border-white/5">
                        {history.length > 0 ? history.map((item: any, i: number) => {
                            const height = maxVolume > 0 ? (item.value / maxVolume) * 100 : 0;
                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                                    <div
                                        className={`w-full transition-all duration-500 rounded-sm ${item.value > 0 ? 'bg-gvc-gold shadow-[0_0_10px_rgba(255,204,77,0.5)]' : 'bg-white/10'}`}
                                        style={{ height: `${Math.max(height, 15)}%` }}
                                    ></div>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/20 text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                        {item.value} VIBE OFFS!
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="w-full text-center text-gray-600 text-xs self-center">Loading volume metrics...</div>
                        )}
                    </div>
                </div>

                {/* Global Feed */}
                <div className="w-full pt-4">
                    <h2 className="text-gray-500 font-mono text-xs uppercase tracking-widest text-left pl-2 mb-4">RECENT GLOBAL ACTIVITY</h2>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {(feed && feed.length > 0) ? feed.map((match: any, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-[#111] p-3 rounded border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <img src={match.winner.url} alt="" className="w-10 h-10 rounded-full border border-green-500/50" />
                                        <div className="absolute -bottom-1 -right-1 bg-green-900/80 text-green-400 text-[8px] px-1 rounded border border-green-500/50">WIN</div>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-green-400 font-bold text-sm">GVC #{match.winner.id}</div>
                                        <div className="text-xs text-gray-500">beat GVC #{match.loser.id}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-600 font-mono">{formatDistanceToNow(match.timestamp, { addSuffix: true })}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-gray-600 text-sm italic py-4">Waiting for new matches...</div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
