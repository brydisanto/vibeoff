'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { ArrowLeft, Flame, Swords, Percent, Trophy } from 'lucide-react';
import { INITIAL_CHARACTERS } from '@/lib/data';

interface GvcStats {
    id: number;
    name: string;
    url: string;
    allTime: {
        wins: number;
        losses: number;
        matches: number;
        rank?: number;
        winStreak?: number;
    };
    delegatedFrom?: string; // Vault address if this GVC is from a delegated vault
}

interface ActivityItem {
    gvcId: number;
    gvcName: string;
    gvcUrl: string;
    opponentId: number;
    opponentName: string;
    opponentUrl: string;
    result: 'W' | 'L';
    timestamp: number;
}

// Sample activity removed


export default function ProfilePage() {
    const { address, isConnected } = useAccount();
    const [gvcs, setGvcs] = useState<GvcStats[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [collectorRank, setCollectorRank] = useState<number | null>(null);
    const prevActivityRef = useRef<string[]>([]);

    // Request notification permission
    const enableNotifications = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificationsEnabled(true);
                new Notification('🤙 Notifications Enabled!', {
                    body: "You'll be notified when your GVCs participate in matchups.",
                    icon: '/gvc_shaka.png'
                });
            }
        }
    };

    // Fetch user's GVCs when wallet connects
    useEffect(() => {
        if (!address) {
            setGvcs([]);
            return;
        }

        setLoading(true);
        setError(null);

        fetch(`/api/profile/gvcs?address=${address}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    // Sort by wins (desc), then win rate as tiebreaker
                    const sortedGvcs = (data.gvcs || []).sort((a: GvcStats, b: GvcStats) => {
                        if (b.allTime.wins !== a.allTime.wins) {
                            return b.allTime.wins - a.allTime.wins;
                        }
                        const aRate = a.allTime.matches > 0 ? a.allTime.wins / a.allTime.matches : 0;
                        const bRate = b.allTime.matches > 0 ? b.allTime.wins / b.allTime.matches : 0;
                        return bRate - aRate;
                    });
                    setGvcs(sortedGvcs);

                    // Save GVC IDs specific to this user for the Global Toast to pick up
                    const myIds = sortedGvcs.map((g: GvcStats) => g.id);
                    localStorage.setItem('my_gvc_ids', JSON.stringify(myIds));
                }
            })
            .catch(err => {
                console.error('Failed to fetch GVCs:', err);
                setError('Failed to load your GVCs');
            })
            .finally(() => setLoading(false));
    }, [address]);

    // Fetch activity feed for user's GVCs
    const gvcIds = gvcs.map(g => g.id).sort().join(',');

    useEffect(() => {
        if (!gvcIds) return;

        fetch(`/api/profile/activity?ids=${gvcIds}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setActivity(data);
                }
            })
            .catch(err => console.error('Failed to fetch activity:', err));
    }, [gvcIds]);

    // Calculate Collector Rank
    useEffect(() => {
        if (!address || gvcs.length === 0) return;

        fetch('/api/leaderboard')
            .then(res => res.json())
            .then(data => {
                const allChars = data.characters || [];

                // Aggregate wins by owner
                const ownerWins: Record<string, number> = {};

                allChars.forEach((char: any) => {
                    // Normalize owner
                    let ownerKey = (char.owner || 'Unknown').trim().toLowerCase();

                    // IF this char is in my list, force ownership to ME
                    // (This effectively claims ownership for the ranking calc even if OpenSea/Metadata is stale for others)
                    if (gvcs.some(g => g.id === char.id)) {
                        ownerKey = address.toLowerCase();
                    }

                    ownerWins[ownerKey] = (ownerWins[ownerKey] || 0) + (char.allTime.wins || 0);
                });

                // Sort owners by wins
                const sortedOwners = Object.entries(ownerWins)
                    .sort(([, winsA], [, winsB]) => winsB - winsA)
                    .map(([owner]) => owner);

                // Find my rank (1-based)
                const myIndex = sortedOwners.indexOf(address.toLowerCase());
                setCollectorRank(myIndex !== -1 ? myIndex + 1 : null);
            })
            .catch(err => console.error('Failed to calc rank:', err));
    }, [address, gvcs]);

    const getWinRate = (gvc: GvcStats) => {
        if (gvc.allTime.matches === 0) return 0;
        return Math.round((gvc.allTime.wins / gvc.allTime.matches) * 100);
    };

    // Check if activity item involves user's GVC
    const isUserGvc = (id: number) => gvcs.some(g => g.id === id);

    // Collector Stats
    const totalWins = gvcs.reduce((acc, g) => acc + (g.allTime.wins || 0), 0);
    const totalLosses = gvcs.reduce((acc, g) => acc + (g.allTime.losses || 0), 0);
    const totalMatches = totalWins + totalLosses;
    const overallWinRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
    const displayRank = collectorRank ? collectorRank : "-";

    return (
        <main className="min-h-screen bg-black text-white p-4 md:p-8 bg-[url('/grid.svg')] bg-center">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <Link
                        href="/"
                        className="px-4 md:px-6 py-3 md:py-4 bg-[#111] text-gray-400 hover:text-white hover:bg-[#222] rounded-lg font-bold uppercase text-[11px] md:text-sm tracking-wide transition-all border border-transparent hover:border-white/20 flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        BACK
                    </Link>
                    <div className="flex items-center gap-3">
                        {isConnected && !notificationsEnabled && (
                            <button
                                onClick={enableNotifications}
                                className="px-4 md:px-6 py-3 md:py-4 bg-[#111] text-gray-400 hover:text-white hover:bg-[#222] rounded-lg font-bold uppercase text-[11px] md:text-sm tracking-wide transition-all border border-transparent hover:border-white/20 flex items-center gap-2"
                            >
                                🔔 ENABLE ALERTS
                            </button>
                        )}
                        {notificationsEnabled && (
                            <span className="text-green-500 text-sm font-mundial font-semibold">🔔 Alerts On</span>
                        )}
                        <ConnectButton />
                    </div>
                </div>

                {/* Title & Collector Stats */}
                <div className="text-center mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: -30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 100, damping: 10 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-cooper font-bold text-center text-[#FFE048] glowing-text leading-none mb-8 whitespace-nowrap"
                    >
                        My Collection
                    </motion.h1>

                    {/* Collector Stats Bar */}
                    {isConnected && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex justify-center"
                        >
                            <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-2xl mx-auto">
                                {/* Record */}
                                <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center hover:border-[#FFE048]/50 transition-colors group">
                                    <div className="text-white/30 mb-2 flex justify-center"><Swords className="w-5 h-5 group-hover:text-[#FFE048] transition-colors" /></div>
                                    <div className="text-2xl md:text-4xl font-display text-white group-hover:text-[#FFE048] transition-colors">{totalWins}-{totalLosses}</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Record</div>
                                </div>
                                {/* Win Rate */}
                                <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center hover:border-blue-400/50 transition-colors group">
                                    <div className="text-white/30 mb-2 flex justify-center"><Percent className="w-5 h-5 group-hover:text-blue-400 transition-colors" /></div>
                                    <div className="text-2xl md:text-4xl font-display text-white group-hover:text-blue-400 transition-colors">{overallWinRate}%</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Win Rate</div>
                                </div>
                                {/* Rank */}
                                <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center hover:border-purple-400/50 transition-colors group">
                                    <div className="text-white/30 mb-2 flex justify-center"><Trophy className="w-5 h-5 group-hover:text-purple-400 transition-colors" /></div>
                                    <div className="text-2xl md:text-4xl font-display text-white group-hover:text-purple-400 transition-colors">#{displayRank}</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Rank</div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Not Connected State */}
                {/* Not Connected State */}
                {!isConnected && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-6">🔗</div>
                        <h2 className="text-2xl font-display text-gray-400 mb-4">Connect Your Wallet</h2>
                        <p className="text-gray-600 mb-8">Connect to view your GVCs and track their performance</p>
                    </div>
                )}

                {/* Loading State */}
                {isConnected && loading && (
                    <div className="text-center py-20">
                        <div className="text-4xl animate-bounce mb-4">🤙</div>
                        <p className="text-gvc-gold font-display text-xl">Loading your vibes...</p>
                    </div>
                )}

                {/* Error State */}
                {isConnected && error && (
                    <div className="text-center py-20">
                        <div className="text-4xl mb-4">😕</div>
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Connected with GVCs */}
                {isConnected && !loading && !error && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* GVC Grid */}
                        <div className="lg:col-span-2">
                            <h2 className="text-xl font-cooper font-bold text-gray-400 mb-6">
                                YOUR GVCs ({gvcs.length})
                            </h2>

                            {gvcs.length === 0 ? (
                                <div className="bg-zinc-900 rounded-xl p-8 text-center border border-white/10">
                                    <p className="text-gray-500">No GVCs found in this wallet</p>
                                    <a
                                        href="https://opensea.io/collection/goodvibesclubofficial"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gvc-gold hover:underline mt-2 inline-block"
                                    >
                                        Get some on OpenSea →
                                    </a>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {gvcs.map(gvc => {
                                        const streak = gvc.allTime.winStreak || 0;
                                        const isFire = streak >= 3;

                                        return (
                                            <Link
                                                key={gvc.id}
                                                href={`/gvc/${gvc.id}`}
                                                className="bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 hover:border-gvc-gold/50 transition-all hover:scale-[1.02] group shadow-lg"
                                            >
                                                <div className="relative">


                                                    <img
                                                        src={gvc.url}
                                                        alt={gvc.name}
                                                        className={`w-full aspect-square object-cover ${streak >= 3 ? 'border-b-4 border-orange-500' : ''}`}
                                                    />

                                                    {/* Rank Badge */}
                                                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 text-sm font-bold font-mono z-10">
                                                        #{gvc.allTime.rank || '-'}
                                                    </div>

                                                    {/* Delegated Badge */}
                                                    {gvc.delegatedFrom && (
                                                        <div className="absolute bottom-3 left-3 bg-purple-600/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-purple-400/50 text-[10px] font-bold font-mono z-10 flex items-center gap-1">
                                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                                            </svg>
                                                            DELEGATED
                                                        </div>
                                                    )}

                                                    {/* Win Streak Badge (Option A) */}
                                                    {streak >= 3 && (
                                                        <div className="absolute top-3 right-3 flex flex-col items-center">
                                                            <div className="bg-orange-600 text-white p-2 rounded-full shadow-[0_0_20px_rgba(234,88,12,0.6)] animate-pulse border border-orange-400">
                                                                <Flame size={20} fill="white" />
                                                            </div>
                                                            <div className="mt-2 bg-orange-600/90 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-400/50 shadow-lg tracking-wide">
                                                                {streak} STREAK
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-6 text-center">
                                                    <h3 className="font-display text-xl md:text-2xl text-white group-hover:text-gvc-gold transition-colors mb-2 truncate">
                                                        {gvc.name}
                                                    </h3>
                                                    <div className="text-3xl md:text-4xl font-display text-gray-200 mb-1">
                                                        {gvc.allTime.wins}-{gvc.allTime.losses}
                                                    </div>
                                                    <div className="text-sm text-gray-500 font-mono mt-1">
                                                        ({getWinRate(gvc)}% Win Rate)
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Activity Feed - Option C: VS Cards */}
                        <div className="lg:sticky lg:top-8 self-start">
                            <h2 className="text-xl font-cooper font-bold text-gray-400 mb-6 text-center">
                                RECENT ACTIVITY
                            </h2>
                            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                                {activity.map((item, i) => {
                                    const isWin = item.result === 'W';
                                    const cardBorder = isWin ? 'border-green-500/50' : 'border-red-500/50';
                                    const cardBg = isWin ? 'bg-green-900/20' : 'bg-red-900/20';
                                    const resultText = isWin ? 'YOU WON!' : 'YOU LOST!';
                                    const resultColor = isWin ? 'text-green-400' : 'text-red-400';
                                    const actionText = isWin ? 'beat' : 'lost to';

                                    return (
                                        <div
                                            key={i}
                                            className={`${cardBg} rounded-xl border ${cardBorder} p-4`}
                                        >
                                            {/* Result Header */}
                                            <div className={`text-center font-display text-lg ${resultColor} mb-3`}>
                                                {resultText}
                                            </div>

                                            {/* Images */}
                                            <div className="flex items-center justify-center gap-4 mb-3">
                                                <img
                                                    src={item.gvcUrl || '/api/placeholder/60/60'}
                                                    alt={item.gvcName}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                                <span className="text-gray-500 font-bold text-sm">VS</span>
                                                <img
                                                    src={item.opponentUrl || '/api/placeholder/60/60'}
                                                    alt={item.opponentName}
                                                    className="w-12 h-12 rounded-lg object-cover opacity-70"
                                                />
                                            </div>

                                            {/* Message */}
                                            <div className="text-center font-mundial font-semibold text-sm">
                                                <span className={`font-bold ${resultColor}`}>
                                                    GVC #{item.gvcId}
                                                </span>
                                                <span className="text-gray-500">
                                                    {' '}{actionText}{' '}
                                                </span>
                                                <span className="text-gray-400">
                                                    GVC #{item.opponentId}
                                                </span>
                                            </div>

                                            {/* Timestamp */}
                                            <div className="text-center text-xs text-gray-600 mt-2 font-mono">
                                                {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    );
                                })}
                                {activity.length === 0 && (
                                    <p className="text-gray-600 text-center font-mono text-sm py-8">
                                        No recent activity.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
