"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Zap } from 'lucide-react';

interface Match {
    winner: { id: number; url: string; };
    loser: { id: number; url: string; };
    timestamp: number;
}

export default function GlobalFeedDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    const [feed, setFeed] = useState<Match[]>([]);
    const [isHovered, setIsHovered] = useState(false);

    // Poll for feed data
    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await fetch('/api/vibe-o-meter', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();

                if (data.feed && Array.isArray(data.feed)) {
                    // Sort new to old
                    const sorted = data.feed.sort((a: Match, b: Match) => b.timestamp - a.timestamp);
                    setFeed(sorted);
                }
            } catch (error) {
                console.error("Failed to poll feed", error);
            }
        };

        const interval = setInterval(fetchFeed, 5000);
        fetchFeed(); // Initial
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {/* Floating Toggle Button (Right Side) */}
            <motion.button
                onClick={() => setIsOpen(true)}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="hidden md:flex fixed top-1/2 right-0 transform -translate-y-1/2 z-40 bg-[#111] border-l border-t border-b border-gvc-gold/30 p-2 md:p-3 rounded-l-xl shadow-lg hover:bg-zinc-900 transition-colors group"
                initial={{ x: 10 }}
                animate={{ x: 0 }}
                whileHover={{ x: -2 }}
            >
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gvc-gold font-bold rotate-180 uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>
                        Activity
                    </span>
                    <Zap size={20} className="text-white group-hover:text-gvc-gold transition-colors" />
                </div>
            </motion.button>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                )}
            </AnimatePresence>

            {/* Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full md:w-96 bg-[#0a0a0a] border-l border-white/10 shadow-2xl z-[60] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#111]">
                            <div className="flex items-center gap-2">
                                <Activity className="text-gvc-gold" size={20} />
                                <h2 className="text-xl font-display text-white">Global Vibe Feed</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {feed.length === 0 ? (
                                <div className="text-center text-gray-500 py-10">No recent vibes...</div>
                            ) : (
                                feed.map((match, i) => (
                                    <div key={`${match.timestamp}-${i}`} className="bg-[#161616] p-4 rounded-xl border border-white/5 flex items-center gap-5 hover:bg-[#1f1f1f] transition-colors">
                                        <div className="relative shrink-0">
                                            <img src={match.winner.url} className="w-20 h-20 rounded-full border-2 border-gvc-gold shadow-lg" alt="Winner" />
                                            <div className="absolute -bottom-2 -right-2 bg-gvc-gold text-black text-[10px] font-black px-2 py-0.5 rounded-full border border-black transform rotate-[-5deg] shadow-md">WIN</div>
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-gvc-gold font-bold text-base md:text-lg">#{match.winner.id}</span>
                                                <span className="text-xs text-gray-600 font-mono bg-black/30 px-2 py-0.5 rounded-full">
                                                    {Math.floor((Date.now() - match.timestamp) / 1000 / 60) < 1
                                                        ? 'NOW'
                                                        : `${Math.floor((Date.now() - match.timestamp) / 1000 / 60)}m`}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 font-medium">
                                                vibed out <span className="text-gray-300">#{match.loser.id}</span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 opacity-40 grayscale group-hover:opacity-60 transition-opacity">
                                            <img src={match.loser.url} className="w-12 h-12 rounded-full border border-white/10" alt="Loser" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-[#111] text-center text-xs text-gray-500">
                            Real-time global activity
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
