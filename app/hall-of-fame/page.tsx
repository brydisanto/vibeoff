'use client';

import { useGameLogic } from '@/lib/useGameLogic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Gauge, ArrowLeft } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';

import { useState, useEffect } from 'react';
import { fetchNftOwner, getOwnerDisplayAndLink } from '@/lib/opensea';

export default function HallOfFamePage() {
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [loadingLocal, setLoadingLocal] = useState(true);
    const [realOwners, setRealOwners] = useState<Record<number, { address: string, username: string | null, display: string }>>({});

    // Fetch Global Leaderboard
    useEffect(() => {
        setLoadingLocal(true);
        fetch(`/api/leaderboard`)
            .then(res => res.json())
            .then(data => {
                if (data.characters) {
                    setLeaderboardData(data.characters);
                }
            })
            .catch(err => console.error("Failed to load leaderboard", err))
            .finally(() => setLoadingLocal(false));
    }, []);

    // Sort by Total Wins (All Time), then by Win% when equal - Top 35
    const hallOfFame = [...leaderboardData]
        .sort((a, b) => {
            // Primary: Wins descending
            if (b.allTime.wins !== a.allTime.wins) {
                return b.allTime.wins - a.allTime.wins;
            }
            // Secondary: Win% descending (when wins are equal)
            const winRateA = a.allTime.matches > 0 ? a.allTime.wins / a.allTime.matches : 0;
            const winRateB = b.allTime.matches > 0 ? b.allTime.wins / b.allTime.matches : 0;
            return winRateB - winRateA;
        })
        .slice(0, 35);

    // Fetch owners for Top 35
    useEffect(() => {
        if (hallOfFame.length > 0) {
            hallOfFame.forEach(char => {
                if (!realOwners[char.id]) {
                    fetchNftOwner(char.id).then(ownerData => {
                        if (ownerData) setRealOwners(prev => ({ ...prev, [char.id]: ownerData }));
                    });
                }
            });
        }
    }, [leaderboardData]);

    if (loadingLocal) return <div className="min-h-screen bg-black text-gvc-gold flex items-center justify-center font-display text-2xl animate-pulse">LOADING HALL OF VIBES...</div>;
    if (leaderboardData.length === 0) return <div className="min-h-screen bg-black text-gvc-gold flex items-center justify-center font-display text-2xl">NO DATA FOUND</div>;

    const first = hallOfFame[0];
    const second = hallOfFame[1];
    const third = hallOfFame[2];
    const runnersUp = hallOfFame.slice(3);

    const getOwnerDisplay = (char: any) => {
        const real = realOwners[char.id];
        // Don't use mock fallback - wait for real owner data
        if (!real) {
            return { name: '...', url: '#' };
        }
        const { display, link } = getOwnerDisplayAndLink(real, real.address);
        return { name: display, url: link ? `https://opensea.io/${link}` : '#' };
    };


    return (
        <main className="min-h-screen bg-black text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header - Daily Style */}
                <div className="flex flex-col items-center mt-8 mb-6">
                    <p className="text-gvc-gold font-bold font-mundial tracking-wider md:tracking-widest text-[10px] md:text-sm mb-4 uppercase text-center whitespace-nowrap">
                        No Excuses. Vibe Like A Champion.
                    </p>
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
                        HALL OF VIBES
                    </motion.h1>
                </div>

                {/* Navigation Bar */}
                <div className="flex justify-center items-center mb-32 w-full max-w-4xl mx-auto px-4 relative z-20">
                    <Link
                        href="/"
                        className="px-4 md:px-6 py-3 md:py-4 bg-[#111] text-gray-400 hover:text-white hover:bg-[#222] rounded-lg font-bold uppercase text-[11px] md:text-sm tracking-wide transition-all border border-transparent hover:border-white/20 flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        BACK
                    </Link>
                </div>

                {/* Top 3 Podium - Sports Record Design */}
                {first && (
                    <div className="flex flex-col md:flex-row justify-center items-end gap-8 mb-20 relative px-4">

                        {/* 2nd Place (Left) - Silver */}
                        {second && (
                            <div className="order-2 md:order-1 w-full md:w-72 relative flex flex-col items-center">
                                <div className="text-gray-300 font-display text-3xl mb-3">🥈 #2</div>
                                <div className="relative bg-[#111] rounded-2xl overflow-hidden border-3 border-gray-400 w-full hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(192,192,192,0.3)]">
                                    <a href={`https://opensea.io/assets/ethereum/0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4/${second.id}`} target="_blank" rel="noopener noreferrer" className="absolute top-3 right-3 z-20 opacity-50 hover:opacity-100 transition-opacity">
                                        <img src="/opensea-v2.png" alt="OpenSea" className="w-6 h-6 rounded-full" />
                                    </a>
                                    <img src={second.url} alt={second.name} className="w-full aspect-square object-cover" />
                                    <div className="p-5 text-center bg-gradient-to-b from-gray-800 to-[#1a1a1a]">
                                        <h2 className="text-xl font-display text-white mb-2 truncate">{second.name}</h2>
                                        <div className="text-4xl font-display text-gray-300 mb-1">
                                            {second.allTime.wins}-{second.allTime.losses}
                                        </div>
                                        <div className="text-lg text-white font-mono mb-3">
                                            ({second.allTime.matches > 0 ? Math.round((second.allTime.wins / second.allTime.matches) * 100) : 0}% Win Rate)
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">
                                            OWNER: <a href={getOwnerDisplay(second).url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">{getOwnerDisplay(second).name}</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place (Center) - Gold Champion */}
                        <div className="order-1 md:order-2 w-full md:w-96 relative -mt-12 md:-mt-24 z-10 flex flex-col items-center">
                            <div className="text-gvc-gold font-display text-3xl mb-3 animate-bounce">👑 KING OF VIBES 👑</div>
                            <div className="relative bg-[#111] rounded-3xl overflow-hidden border-4 border-gvc-gold w-full hover:scale-105 transition-transform duration-300 shadow-[0_0_80px_rgba(255,204,77,0.5)]">
                                <a href={`https://opensea.io/assets/ethereum/0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4/${first.id}`} target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 z-20 opacity-70 hover:opacity-100 transition-opacity">
                                    <img src="/opensea-v2.png" alt="OpenSea" className="w-8 h-8 rounded-full bg-black/20" />
                                </a>
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gvc-gold/10 to-transparent pointer-events-none"></div>
                                <img src={first.url} alt={first.name} className="w-full aspect-square object-cover" />
                                <div className="p-4 text-center bg-gradient-to-b from-gvc-gold via-gvc-gold to-yellow-600">
                                    <h2 className="text-2xl font-display text-black mb-1 leading-tight">{first.name}</h2>
                                    <div className="text-5xl font-display text-black mb-1 drop-shadow-lg">
                                        {first.allTime.wins}-{first.allTime.losses}
                                    </div>
                                    <div className="inline-block bg-black text-gvc-gold px-4 py-1 rounded-full font-bold text-lg mb-2">
                                        {first.allTime.matches > 0 ? Math.round((first.allTime.wins / first.allTime.matches) * 100) : 0}% WIN RATE
                                    </div>
                                    <div className="text-xs text-black/70 font-mono font-bold">
                                        OWNER: <a href={getOwnerDisplay(first).url} target="_blank" rel="noreferrer" className="text-black hover:text-white transition-colors">{getOwnerDisplay(first).name}</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3rd Place (Right) - Bronze */}
                        {third && (
                            <div className="order-3 w-full md:w-72 relative flex flex-col items-center">
                                <div className="text-[#CD7F32] font-display text-3xl mb-3">🥉 #3</div>
                                <div className="relative bg-[#111] rounded-2xl overflow-hidden border-3 border-[#CD7F32] w-full hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(205,127,50,0.3)]">
                                    <a href={`https://opensea.io/assets/ethereum/0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4/${third.id}`} target="_blank" rel="noopener noreferrer" className="absolute top-3 right-3 z-20 opacity-50 hover:opacity-100 transition-opacity">
                                        <img src="/opensea-v2.png" alt="OpenSea" className="w-6 h-6 rounded-full" />
                                    </a>
                                    <img src={third.url} alt={third.name} className="w-full aspect-square object-cover" />
                                    <div className="p-5 text-center bg-gradient-to-b from-[#8B4513] to-[#1a1a1a]">
                                        <h2 className="text-xl font-display text-white mb-2 truncate">{third.name}</h2>
                                        <div className="text-4xl font-display text-[#CD7F32] mb-1">
                                            {third.allTime.wins}-{third.allTime.losses}
                                        </div>
                                        <div className="text-lg text-white font-mono mb-3">
                                            ({third.allTime.matches > 0 ? Math.round((third.allTime.wins / third.allTime.matches) * 100) : 0}% Win Rate)
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">
                                            OWNER: <a href={getOwnerDisplay(third).url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">{getOwnerDisplay(third).name}</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Runners Up (4-15) - Sports Record Design */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {runnersUp.map((char, index) => {
                        const rank = index + 4;
                        const is69 = rank === 69;

                        return (
                            <div key={char.id} className={`relative group opacity-90 hover:opacity-100 transition-opacity ${is69 ? 'scale-[1.02]' : ''}`}>
                                <div className={`relative bg-[#111] rounded-xl overflow-hidden border transition-colors ${is69
                                    ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                                    : 'border-white/10 hover:border-white/30'
                                    }`}>
                                    <div className={`absolute top-2 left-2 z-10 w-8 h-8 flex items-center justify-center rounded-full font-mono text-sm border ${is69
                                        ? 'bg-pink-500 text-white border-pink-400 font-bold'
                                        : 'bg-black/80 text-white border-white/20'
                                        }`}>
                                        {is69 ? '69' : `#${rank}`}
                                    </div>

                                    {is69 && (
                                        <div className="absolute top-2 left-12 z-10 bg-pink-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-pink-400 animate-pulse">
                                            NICE
                                        </div>
                                    )}

                                    <a href={`https://opensea.io/assets/ethereum/0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4/${char.id}`} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <img src="/opensea-v2.png" alt="OpenSea" className="w-6 h-6 rounded-full bg-black/50" />
                                    </a>

                                    <img
                                        src={char.url}
                                        alt={char.name}
                                        className="w-full aspect-square object-cover"
                                    />

                                    <div className="p-4 text-center">
                                        <h2 className={`text-lg font-display mb-2 truncate ${is69 ? 'text-pink-400' : 'text-gray-200'}`}>{char.name}</h2>
                                        <div className={`text-3xl font-display mb-1 ${is69 ? 'text-pink-500' : 'text-white'}`}>
                                            {char.allTime.wins}-{char.allTime.losses}
                                        </div>
                                        <div className={`text-sm font-mono mb-3 ${is69 ? 'text-pink-300' : 'text-gray-400'}`}>
                                            ({char.allTime.matches > 0 ? Math.round((char.allTime.wins / char.allTime.matches) * 100) : 0}% Win Rate)
                                        </div>
                                        <div className="text-xs text-gray-600 font-mono">
                                            OWNER: <a href={getOwnerDisplay(char).url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gvc-gold transition-colors" title="View profile on OpenSea">
                                                {getOwnerDisplay(char).name}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Leaderboard Modal */}
            <AnimatePresence>
                {showLeaderboard && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
                        <Leaderboard characters={leaderboardData} onClose={() => setShowLeaderboard(false)} />
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}
