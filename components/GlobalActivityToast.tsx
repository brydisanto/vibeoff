"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Match {
    winner: { id: number; url: string; };
    loser: { id: number; url: string; };
    timestamp: number;
}

export default function GlobalActivityToast() {
    // Single pending match buffer instead of queue to prevent backlog
    const [nextMatch, setNextMatch] = useState<Match | null>(null);
    const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

    // Track timestamps
    const lastTimestampRef = useRef<number>(Date.now());
    const lastShownTimeRef = useRef<number>(0);
    const isFirstLoad = useRef(true);

    const isMyVote = (match: Match) => {
        try {
            const recent = JSON.parse(localStorage.getItem('my_recent_votes') || '[]');
            return recent.some((v: any) =>
                v.winnerId === match.winner.id &&
                v.loserId === match.loser.id &&
                Math.abs(v.timestamp - match.timestamp) < 120000
            );
        } catch { return false; }
    };

    const getUserGvcIds = () => {
        try {
            return JSON.parse(localStorage.getItem('my_gvc_ids') || '[]');
        } catch { return []; }
    };

    // Polling effect
    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await fetch('/api/vibe-o-meter', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();

                if (data.feed && Array.isArray(data.feed)) {
                    // Filter: New matches AND not my own votes (unless it involves MY GVC)
                    const newMatches = data.feed.filter((m: Match) =>
                        m.timestamp > lastTimestampRef.current
                    );

                    if (newMatches.length > 0) {
                        const maxTs = Math.max(...newMatches.map((m: Match) => m.timestamp));
                        lastTimestampRef.current = maxTs;

                        if (!isFirstLoad.current) {
                            const latest = newMatches.sort((a: Match, b: Match) => b.timestamp - a.timestamp)[0];

                            // Check if it involves my GVC
                            const myIds = getUserGvcIds();
                            const isMyGvcMatch = myIds.includes(latest.winner.id) || myIds.includes(latest.loser.id);

                            // Show if it's my GVC match OR if it's not my vote
                            if (isMyGvcMatch || !isMyVote(latest)) {
                                setNextMatch(latest);
                            }
                        }
                    }
                }
                isFirstLoad.current = false;
            } catch (error) {
                console.error("Failed to poll activity", error);
            }
        };

        const interval = setInterval(fetchActivity, 5000);
        fetchActivity();
        return () => clearInterval(interval);
    }, []);

    // Display Logic Loop
    useEffect(() => {
        const checkDisplay = () => {
            const now = Date.now();
            const timeSinceLast = now - lastShownTimeRef.current;
            const COOLDOWN = 30000; // 30 seconds

            // Immediate display for user's matches, cooldown for others
            const myIds = getUserGvcIds();
            const isPriority = nextMatch && (myIds.includes(nextMatch.winner.id) || myIds.includes(nextMatch.loser.id));

            if (nextMatch && !currentMatch && (isPriority || timeSinceLast > COOLDOWN)) {
                setCurrentMatch(nextMatch);
                setNextMatch(null);
                lastShownTimeRef.current = now;

                // Auto-close after 8s for user matches, 5s for others
                setTimeout(() => {
                    setCurrentMatch(null);
                }, isPriority ? 8000 : 5000);
            }
        };

        const displayInterval = setInterval(checkDisplay, 1000);
        return () => clearInterval(displayInterval);
    }, [nextMatch, currentMatch]);

    if (!currentMatch) return null;

    const myIds = getUserGvcIds();
    const isUserWinner = myIds.includes(currentMatch.winner.id);
    const isUserLoser = myIds.includes(currentMatch.loser.id);
    const isUserMatch = isUserWinner || isUserLoser;

    return (
        <div className={`fixed top-4 right-4 z-50 pointer-events-none flex flex-col items-end gap-2 ${isUserMatch ? 'top-10 right-10 md:top-8 md:right-8' : ''}`}>
            <AnimatePresence mode='wait'>
                {currentMatch && (
                    <motion.div
                        key={currentMatch.timestamp}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className={`
                            ${isUserMatch
                                ? isUserWinner
                                    ? 'bg-gradient-to-br from-green-900/90 to-black border-green-500 scale-110'
                                    : 'bg-gradient-to-br from-red-900/90 to-black border-red-500 scale-110'
                                : 'bg-[#111] border-gvc-gold/40'
                            }
                            border p-4 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex items-center gap-4 backdrop-blur-md max-w-sm w-full pointer-events-auto relative group md:mr-16 mt-14 md:mt-0
                        `}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setCurrentMatch(null)}
                            className="absolute -top-2 -left-2 bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700 rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shadow-lg border border-white/10"
                        >
                            <X size={14} />
                        </button>

                        {isUserMatch ? (
                            // BIG MATCH LAYOUT
                            <div className="flex flex-col w-full text-center">
                                <div className={`text-2xl font-black italic mb-2 ${isUserWinner ? 'text-green-400' : 'text-red-500'}`}>
                                    {isUserWinner ? 'YOU WON!' : 'YOU LOST!'}
                                </div>
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <div className="relative">
                                        <img src={currentMatch.winner.url} className={`w-16 h-16 rounded-lg border-2 ${isUserWinner ? 'border-green-400' : 'border-white/20'}`} />
                                        <div className="absolute -bottom-2 inset-x-0 bg-green-500 text-black text-[10px] font-bold px-1 rounded-full mx-auto w-max">WINNER</div>
                                    </div>
                                    <div className="text-xl font-bold text-gray-500">VS</div>
                                    <div className="relative">
                                        <img src={currentMatch.loser.url} className={`w-14 h-14 rounded-lg border-2 opacity-80 ${isUserLoser ? 'border-red-500' : 'border-white/10'}`} />
                                    </div>
                                </div>
                                <div className="text-sm">
                                    <span className="font-bold text-white">GVC #{currentMatch.winner.id}</span>
                                    <span className="text-gray-400"> beat </span>
                                    <span className="text-gray-400">GVC #{currentMatch.loser.id}</span>
                                </div>
                            </div>
                        ) : (
                            // STANDARD LAYOUT
                            <>
                                <div className="relative shrink-0">
                                    <img src={currentMatch.winner.url} className="w-14 h-14 rounded-full border-2 border-gvc-gold shadow-lg" alt="Winner" />
                                    <div className="absolute -bottom-1 -right-1 bg-gvc-gold text-black text-[10px] font-black px-1.5 py-0.5 rounded-full border border-black transform rotate-[-5deg]">WIN</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-bold text-sm truncate mb-0.5">
                                        GVC #{currentMatch.winner.id}
                                    </div>
                                    <div className="text-gray-400 text-xs leading-tight">
                                        just won a vibe off against <span className="text-gray-300">GVC #{currentMatch.loser.id}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
