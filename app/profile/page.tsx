'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { ArrowLeft, Flame, Swords, Percent, Trophy, Users, Plus, X, Check, LayoutGrid, Activity } from 'lucide-react';
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

interface DuoInfo {
    id: string;
    gvc1: { id: number; name: string; url: string };
    gvc2: { id: number; name: string; url: string };
    stats: { wins: number; losses: number; matches: number; elo: number };
}

interface RecommendationData {
    needsMoreVotes: boolean;
    currentVotes: number;
    requiredVotes: number;
    message?: string;
    allTimeVibes?: {
        id: number;
        name: string;
        url: string;
        score: number;
        matchingTraits: string[];
        opensea: string;
    }[];
    listedRecommendations?: {
        id: number;
        name: string;
        url: string;
        score: number;
        matchingTraits: string[];
        price: number;
        opensea: string;
    }[];
    favoriteTraits?: {
        trait: string;
        score: number;
        timesVotedFor: number;
        timesRejected: number;
    }[];
    totalListings?: number;
}


export default function ProfilePage() {
    const { address, isConnected } = useAccount();
    // const address = '0x1234567890123456789012345678901234567890'; // TEMP: Hardcoded for demo
    // const isConnected = true; // TEMP: Hardcoded for demo
    const [gvcs, setGvcs] = useState<GvcStats[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [collectorRank, setCollectorRank] = useState<number | null>(null);
    const prevActivityRef = useRef<string[]>([]);

    // Duo state
    const [myDuos, setMyDuos] = useState<DuoInfo[]>([]);
    const [showDuoModal, setShowDuoModal] = useState(false);
    const [selectedForDuo, setSelectedForDuo] = useState<number[]>([]);
    const [duoSubmitting, setDuoSubmitting] = useState(false);
    const [duoError, setDuoError] = useState<string | null>(null);
    const [gvcsInDuos, setGvcsInDuos] = useState<Set<number>>(new Set());

    // Recommendations state
    const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
    const [recLoading, setRecLoading] = useState(false);
    const [maxBudget, setMaxBudget] = useState(3); // Default 3 ETH
    const [activeRecTab, setActiveRecTab] = useState<'listed' | 'alltime'>('listed');
    const [activeTab, setActiveTab] = useState<'collection' | 'duos' | 'recs' | 'activity'>('collection');

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

        let isStale = false;

        setLoading(true);
        setError(null);

        fetch(`/api/profile/gvcs?address=${address}`)
            .then(res => res.json())
            .then(data => {
                if (isStale) return;
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
                if (!isStale) setError('Failed to load your GVCs');
            })
            .finally(() => {
                if (!isStale) setLoading(false);
            });

        return () => {
            isStale = true;
        };
    }, [address]);

    // Fetch user's Duos
    useEffect(() => {
        if (!address) {
            setMyDuos([]);
            return;
        }

        let isStale = false;

        fetch(`/api/duos/my-duos?wallet=${address}`)
            .then(res => res.json())
            .then(data => {
                if (isStale) return;
                if (data.duos) {
                    setMyDuos(data.duos);
                    const inDuos = new Set<number>();
                    data.duos.forEach((d: DuoInfo) => {
                        inDuos.add(d.gvc1.id);
                        inDuos.add(d.gvc2.id);
                    });
                    setGvcsInDuos(inDuos);
                }
            })
            .catch(err => {
                console.error('Failed to fetch Duos:', err);
            });

        return () => {
            isStale = true;
        };
    }, [address]);

    // Fetch activity feed for user's GVCs
    const gvcIds = gvcs.map(g => g.id).sort().join(',');

    const duoIds = myDuos.map(d => d.id).join(',');

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

    // Fetch Recommendations
    useEffect(() => {
        // --- MOCK DATA TOGGLE ---
        const USE_MOCK = false;

        if (USE_MOCK) {
            setRecLoading(true);

            // Generate dummy data from initial characters
            const dummyVibes = INITIAL_CHARACTERS.slice(0, 10).map((c, i) => ({
                id: c.id,
                name: c.name,
                url: c.url,
                score: 95 - i * 2,
                matchingTraits: ['Cool Shades', 'Mohawk', 'Vibe'],
                opensea: `https://opensea.io/assets/ethereum/0xb8ea78fcacef50d41375e44e6814ebba36bb33c4/${c.id}`
            }));

            const dummyListed = INITIAL_CHARACTERS.slice(10, 20).map((c, i) => ({
                id: c.id,
                name: c.name,
                url: c.url,
                score: 88 - i * 3,
                matchingTraits: ['Headphones', 'Beanie'],
                price: 0.05 + (i * 0.02),
                opensea: `https://opensea.io/assets/ethereum/0xb8ea78fcacef50d41375e44e6814ebba36bb33c4/${c.id}`
            }));

            const dummyData: RecommendationData = {
                needsMoreVotes: false,
                currentVotes: 25,
                requiredVotes: 20,
                allTimeVibes: dummyVibes,
                listedRecommendations: dummyListed,
                favoriteTraits: [
                    { trait: 'Mohawk', score: 50, timesVotedFor: 25, timesRejected: 5 },
                    { trait: 'Cool Shades', score: 45, timesVotedFor: 22, timesRejected: 3 },
                    { trait: 'Vibe', score: 40, timesVotedFor: 20, timesRejected: 8 },
                    { trait: 'Headphones', score: 35, timesVotedFor: 18, timesRejected: 2 },
                    { trait: 'Beanie', score: 30, timesVotedFor: 15, timesRejected: 4 },
                ],
                totalListings: 150
            };

            const timer = setTimeout(() => {
                setRecommendations(dummyData);
                setRecLoading(false);
            }, 800);

            return () => clearTimeout(timer);
        }

        if (!address) {
            setRecommendations(null);
            return;
        }

        const fetchRecs = async () => {
            setRecLoading(true);
            try {
                const res = await fetch(`/api/recommendations?wallet=${address}&maxBudget=${maxBudget}`);
                const data = await res.json();
                if (data.error) {
                    console.error('Recs error:', data.error);
                } else {
                    setRecommendations(data);
                }
            } catch (err) {
                console.error('Failed to fetch recs:', err);
            } finally {
                setRecLoading(false);
            }
        };

        // Debounce if triggered by slider
        const timer = setTimeout(() => {
            fetchRecs();
        }, 500);

        return () => clearTimeout(timer);
    }, [address, maxBudget]);

    const getWinRate = (gvc: GvcStats) => {
        if (gvc.allTime.matches === 0) return 0;
        return Math.round((gvc.allTime.wins / gvc.allTime.matches) * 100);
    };

    // Check if activity item involves user's GVC
    const isUserGvc = (id: number) => gvcs.some(g => g.id === id);

    // Toggle GVC selection for Duo creation
    const toggleDuoSelection = (id: number) => {
        if (gvcsInDuos.has(id)) return;
        setSelectedForDuo(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length < 2) return [...prev, id];
            return prev;
        });
    };

    // Submit a new Duo
    const submitDuo = async () => {
        if (selectedForDuo.length !== 2 || !address) return;
        setDuoSubmitting(true);
        setDuoError(null);
        try {
            const res = await fetch('/api/duos/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gvc1Id: selectedForDuo[0],
                    gvc2Id: selectedForDuo[1],
                    walletAddress: address
                })
            });
            const data = await res.json();
            if (res.ok) {
                const duosRes = await fetch(`/api/duos/my-duos?wallet=${address}`);
                const duosData = await duosRes.json();
                if (duosData.duos) {
                    setMyDuos(duosData.duos);
                    const inDuos = new Set<number>();
                    duosData.duos.forEach((d: DuoInfo) => {
                        inDuos.add(d.gvc1.id);
                        inDuos.add(d.gvc2.id);
                    });
                    setGvcsInDuos(inDuos);
                }
                setShowDuoModal(false);
                setSelectedForDuo([]);
            } else {
                setDuoError(data.error || 'Failed to create Duo');
            }
        } catch {
            setDuoError('Failed to create Duo');
        } finally {
            setDuoSubmitting(false);
        }
    };

    // Delete a Duo
    const deleteDuo = async (duoId: string) => {
        if (!address || !confirm('Are you sure you want to delete this Duo?')) return;
        try {
            const res = await fetch('/api/duos/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duoId, walletAddress: address })
            });
            if (res.ok) {
                // Refresh Duos list
                const duosRes = await fetch(`/api/duos/my-duos?wallet=${address}`);
                const duosData = await duosRes.json();
                if (duosData.duos) {
                    setMyDuos(duosData.duos);
                    const inDuos = new Set<number>();
                    duosData.duos.forEach((d: DuoInfo) => {
                        inDuos.add(d.gvc1.id);
                        inDuos.add(d.gvc2.id);
                    });
                    setGvcsInDuos(inDuos);
                } else {
                    setMyDuos([]);
                    setGvcsInDuos(new Set());
                }
            }
        } catch (err) {
            console.error('Failed to delete Duo:', err);
        }
    };

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



                {/* Tab Navigation */}
                {isConnected && (
                    <div className="flex justify-center mb-12">
                        <div className="flex gap-4 p-1 rounded-xl bg-zinc-900/50 border border-white/10 backdrop-blur-sm overflow-x-auto no-scrollbar max-w-full">
                            <button
                                onClick={() => setActiveTab('collection')}
                                className={`px-6 py-3 rounded-lg font-bold font-mundial text-sm tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'collection' ? 'bg-[#FFE048] text-black shadow-lg transform scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <LayoutGrid size={18} /> MY COLLECTION ({gvcs.length})
                            </button>
                            {gvcs.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('duos')}
                                    className={`px-6 py-3 rounded-lg font-bold font-mundial text-sm tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'duos' ? 'bg-[#FFE048] text-black shadow-lg transform scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Swords size={18} /> MY DUOS ({myDuos.length})
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab('recs')}
                                className={`px-6 py-3 rounded-lg font-bold font-mundial text-sm tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'recs' ? 'bg-[#FFE048] text-black shadow-lg transform scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Flame size={18} className={activeTab === 'recs' ? "" : ""} /> RECOMMENDATION MACHINE
                            </button>
                            <button
                                onClick={() => setActiveTab('activity')}
                                className={`px-6 py-3 rounded-lg font-bold font-mundial text-sm tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'activity' ? 'bg-[#FFE048] text-black shadow-lg transform scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Activity size={18} /> ACTIVITY
                            </button>
                        </div>
                    </div>
                )}

                {/* Section Title (Active Tab) */}
                {isConnected && (
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-white uppercase tracking-wider inline-flex items-center gap-3">
                            <LayoutGrid className={`w-8 h-8 md:w-10 md:h-10 text-gray-500 ${activeTab === 'collection' ? 'text-[#FFE048]' : 'hidden'}`} />
                            <Swords className={`w-8 h-8 md:w-10 md:h-10 text-gray-500 ${activeTab === 'duos' ? 'text-[#FFE048]' : 'hidden'}`} />
                            <Flame className={`w-8 h-8 md:w-10 md:h-10 text-gray-500 ${activeTab === 'recs' ? 'text-[#FFE048]' : 'hidden'}`} />
                            <Activity className={`w-8 h-8 md:w-10 md:h-10 text-gray-500 ${activeTab === 'activity' ? 'text-[#FFE048]' : 'hidden'}`} />

                            {activeTab === 'collection' && `YOUR GVCs (${gvcs.length})`}
                            {activeTab === 'duos' && `YOUR DUOS (${myDuos.length})`}
                            {activeTab === 'recs' && "RECOMMENDATION MACHINE"}
                            {activeTab === 'activity' && "RECENT ACTIVITY"}
                        </h2>
                        {activeTab === 'recs' && (
                            <p className="text-gray-500 text-sm font-mundial mt-2 tracking-wide uppercase">
                                Curated based on your voting history
                            </p>
                        )}
                    </div>
                )}


                {/* Recommendation Engine */}
                {isConnected && activeTab === 'recs' && (
                    <div className="mb-16">
                        {/* Content */}
                        {recLoading && !recommendations ? (
                            <div className="text-center py-12 border border-white/10 rounded-2xl bg-zinc-900/30">
                                <div className="animate-spin text-4xl mb-2">🔮</div>
                                <p className="text-gray-500 font-mundial">Consulting the oracles...</p>
                            </div>
                        ) : recommendations?.needsMoreVotes ? (
                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                                {/* Removed Emoji */}
                                <h3 className="text-2xl font-display text-white mb-2">Unlock Recommendations</h3>
                                <p className="text-gray-400 mb-6 font-mundial">
                                    Vote on at least <span className="text-[#FFE048] font-bold">20 matchups</span> to reveal your personalized GVC recommendations.
                                </p>
                                <div className="w-full bg-gray-800 rounded-full h-4 mb-4 overflow-hidden">
                                    <div
                                        className="bg-[#FFE048] h-full transition-all duration-1000 ease-out"
                                        style={{ width: `${(recommendations.currentVotes / recommendations.requiredVotes) * 100}%` }}
                                    />
                                </div>
                                <p className="text-sm text-gray-500 font-mono mb-6">
                                    {recommendations.currentVotes} / {recommendations.requiredVotes} Votes Cast
                                </p>
                                <Link
                                    href="/"
                                    className="inline-block px-8 py-3 bg-[#FFE048] text-black font-bold rounded-lg hover:bg-[#FFE048]/90 transition-colors uppercase tracking-wide"
                                >
                                    Go Vote!
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                {/* Favorite Traits (Left Sidebar) */}
                                <div className="lg:col-span-1 space-y-4">
                                    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 h-full">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            Your Vibe DNA
                                        </h3>
                                        <div className="space-y-4">
                                            {recommendations?.favoriteTraits?.map((trait, i) => (
                                                <div key={i} className="group">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-mundial text-white group-hover:text-[#FFE048] transition-colors">{trait.trait}</span>
                                                        <span className="text-xs font-mono text-gray-500">Score: {trait.score}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono uppercase">
                                                        <span className="text-green-500/80">{trait.timesVotedFor} Likes</span>
                                                        <span>•</span>
                                                        <span className="text-red-500/80">{trait.timesRejected} Dislikes</span>
                                                    </div>
                                                    <div className="w-full bg-gray-800/50 rounded-full h-1 mt-2">
                                                        <div
                                                            className="bg-gray-600 group-hover:bg-[#FFE048] h-full rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, (trait.score / (recommendations?.favoriteTraits?.[0].score || 1)) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendations Grid */}
                                <div className="lg:col-span-3">
                                    {/* Controls (Moved & Right Aligned) */}
                                    <div className="flex flex-col md:flex-row gap-4 md:items-center justify-end mb-8">
                                        {/* Budget Slider */}
                                        <div className="bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2 flex flex-col gap-1 min-w-[200px]">
                                            <div className="flex justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                                                <span>Max Price</span>
                                                <span className="text-[#FFE048]">{maxBudget} ETH</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.01"
                                                max="10"
                                                step="0.01"
                                                value={maxBudget}
                                                onChange={(e) => setMaxBudget(parseFloat(e.target.value))}
                                                className="w-full accent-[#FFE048] h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        {/* Tabs */}
                                        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-1 flex gap-1">
                                            <button
                                                onClick={() => setActiveRecTab('listed')}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${activeRecTab === 'listed'
                                                    ? 'bg-[#FFE048] text-black shadow-lg'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                Listed ({recommendations?.listedRecommendations?.length || 0})
                                            </button>
                                            <button
                                                onClick={() => setActiveRecTab('alltime')}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${activeRecTab === 'alltime'
                                                    ? 'bg-[#FFE048] text-black shadow-lg'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                All Time Vibes
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {(activeRecTab === 'listed' ? recommendations?.listedRecommendations : recommendations?.allTimeVibes)?.map((gvc, index) => {
                                            const isTopPick = index === 0;
                                            return (
                                                <a
                                                    key={gvc.id}
                                                    href={gvc.opensea}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`bg-zinc-900 rounded-2xl overflow-hidden transition-all group relative flex flex-col ${isTopPick
                                                        ? 'border-2 border-[#FFE048] shadow-[0_0_30px_rgba(255,224,72,0.2)] scale-[1.02] z-10'
                                                        : 'border border-white/10 hover:border-[#FFE048]/50 hover:scale-[1.02]'
                                                        }`}
                                                >
                                                    <div className="relative">
                                                        {isTopPick && (
                                                            <div className="absolute top-0 left-0 bg-[#FFE048] text-black text-[10px] font-bold px-3 py-1 rounded-br-xl z-20 shadow-lg tracking-widest uppercase flex items-center gap-1">
                                                                <Trophy size={12} className="fill-black" /> #1 CHOICE
                                                            </div>
                                                        )}
                                                        <img src={gvc.url} alt={gvc.name} className="w-full aspect-square object-cover" />
                                                        {/* Compatibility Score Badge */}
                                                        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-[#FFE048]/30 text-xs font-bold text-[#FFE048] z-10 font-mono shadow-lg">
                                                            {gvc.score > 0 ? '+' : ''}{gvc.score} MATCH
                                                        </div>
                                                        {/* Price Badge (Listed Only) */}
                                                        {'price' in gvc && (
                                                            <div className="absolute bottom-3 left-3 bg-[#FFE048] text-black px-3 py-1.5 rounded-lg font-bold text-sm shadow-xl z-20 flex items-center gap-1">
                                                                <span className="text-xs">Ξ</span> {(gvc as any).price}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-5 flex flex-col flex-grow">
                                                        <h3 className="font-display text-xl text-white mb-1 group-hover:text-[#FFE048] transition-colors">{gvc.name}</h3>
                                                        <div className="flex-grow">
                                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Why We Recommended It</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {gvc.matchingTraits.map((t, i) => (
                                                                    <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-gray-400 border border-white/5">
                                                                        {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 pt-4 border-t border-white/5">
                                                            {activeRecTab === 'listed' ? (
                                                                <div className="w-full bg-[#FFE048] text-black text-center py-2.5 rounded-lg font-bold font-mundial uppercase tracking-wider text-xs hover:bg-[#FFE048]/90 transition-colors shadow-lg">
                                                                    BUY ON OPENSEA
                                                                </div>
                                                            ) : (
                                                                <div className="w-full bg-white/10 text-white text-center py-2.5 rounded-lg font-bold font-mundial uppercase tracking-wider text-xs hover:bg-white/20 transition-colors border border-white/10">
                                                                    PLACE OFFER
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </a>
                                            );
                                        })}

                                        {activeRecTab === 'listed' && (!recommendations?.listedRecommendations || recommendations.listedRecommendations.length === 0) && (
                                            <div className="col-span-full py-12 text-center text-gray-500 font-mundial bg-zinc-900/30 rounded-2xl border border-white/5 border-dashed">
                                                No matches found under {maxBudget} ETH.<br />
                                                <button onClick={() => setMaxBudget(prev => Math.min(5, prev + 0.5))} className="text-[#FFE048] hover:underline mt-2">
                                                    Increase budget?
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* My Duos Section */}
                {isConnected && gvcs.length > 0 && activeTab === 'duos' && (
                    <div className="mb-12">
                        <div className="flex items-center justify-end mb-6">
                            <div className="flex gap-3">
                                <Link href="/duos" className="px-4 md:px-6 py-3 md:py-4 bg-[#FFE048] text-black rounded-lg font-bold font-mundial text-sm uppercase tracking-wider hover:bg-[#FFE048]/90 transition-colors">
                                    PLAY DUOS →
                                </Link>
                                <button onClick={() => setShowDuoModal(true)} className="px-4 md:px-6 py-3 md:py-4 bg-white/10 rounded-lg font-bold font-mundial text-sm uppercase tracking-wider hover:bg-white/20 transition-colors flex items-center gap-2">
                                    <Plus size={16} /> CREATE DUO
                                </button>
                            </div>
                        </div>
                        {myDuos.length === 0 ? (
                            <div className="bg-zinc-900/50 rounded-xl p-6 text-center border border-white/10">
                                <p className="text-gray-500 mb-2 font-mundial font-semibold uppercase tracking-wide">NO DUOS CREATED YET</p>
                                <p className="text-gray-600 text-sm font-mundial">Select 2 of your GVCs to enter them into the DUOS competition!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {myDuos.map(duo => {
                                    const duoMatches = duo.stats.wins + duo.stats.losses;
                                    const duoWinRate = duoMatches > 0 ? Math.round((duo.stats.wins / duoMatches) * 100) : 0;
                                    return (
                                        <Link
                                            key={duo.id}
                                            href={`/duos/${duo.id}`}
                                            className="bg-zinc-900/50 rounded-xl p-4 border border-white/10 hover:border-[#FFE048]/30 transition-colors relative group block"
                                        >
                                            {/* Delete button */}
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    deleteDuo(duo.id);
                                                }}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-400 z-10"
                                                title="Delete Duo"
                                            >
                                                <X size={14} />
                                            </button>
                                            {/* Duo images with labels - centered */}
                                            <div className="flex justify-center items-start gap-4 mb-3">
                                                <div className="flex flex-col items-center">
                                                    <img src={duo.gvc1.url} alt={duo.gvc1.name} className="w-24 h-24 rounded-lg object-cover" />
                                                    <div className="text-xs text-gray-400 mt-1 font-mundial font-semibold">GVC #{duo.gvc1.id}</div>
                                                </div>
                                                <div className="flex items-center text-gray-500 font-bold text-xl mt-8">+</div>
                                                <div className="flex flex-col items-center">
                                                    <img src={duo.gvc2.url} alt={duo.gvc2.name} className="w-24 h-24 rounded-lg object-cover" />
                                                    <div className="text-xs text-gray-400 mt-1 font-mundial font-semibold">GVC #{duo.gvc2.id}</div>
                                                </div>
                                            </div>
                                            {/* Stats - centered, matching YOUR GVCs format */}
                                            <div className="text-center mt-2">
                                                <div className="text-2xl md:text-3xl font-display text-gray-200">
                                                    {duo.stats.wins}-{duo.stats.losses} <span className={`text-lg font-bold ${duo.stats.wins - duo.stats.losses > 0 ? 'text-green-400' : duo.stats.wins - duo.stats.losses < 0 ? 'text-red-400' : 'text-gray-400'}`}>({duo.stats.wins - duo.stats.losses > 0 ? '+' : ''}{duo.stats.wins - duo.stats.losses})</span>
                                                </div>
                                                <div className="text-sm text-gray-500 font-mundial mt-1">
                                                    ({duoWinRate}% Win Rate)
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

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
                {isConnected && loading && (activeTab === 'collection' || activeTab === 'activity') && (
                    <div className="text-center py-20">
                        <div className="text-4xl animate-bounce mb-4">🤙</div>
                        <p className="text-gvc-gold font-display text-xl">Loading your vibes...</p>
                    </div>
                )}

                {/* Error State */}
                {isConnected && error && (activeTab === 'collection' || activeTab === 'activity') && (
                    <div className="text-center py-20">
                        <div className="text-4xl mb-4">😕</div>
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Connected with GVCs */}
                {/* Connected with GVCs (Split into Tabs) */}
                {/* COLECTION TAB */}
                {isConnected && !loading && !error && activeTab === 'collection' && (
                    <div className="space-y-8">

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
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {[...gvcs].sort((a, b) => {
                                    const diffA = a.allTime.wins - a.allTime.losses;
                                    const diffB = b.allTime.wins - b.allTime.losses;
                                    if (diffA !== diffB) return diffB - diffA;
                                    const rateA = a.allTime.matches > 0 ? a.allTime.wins / a.allTime.matches : 0;
                                    const rateB = b.allTime.matches > 0 ? b.allTime.wins / b.allTime.matches : 0;
                                    return rateB - rateA;
                                }).map(gvc => {
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
                                                    {gvc.allTime.wins}-{gvc.allTime.losses} <span className={`text-xl font-bold ${gvc.allTime.wins - gvc.allTime.losses > 0 ? 'text-green-400' : gvc.allTime.wins - gvc.allTime.losses < 0 ? 'text-red-400' : 'text-gray-400'}`}>({gvc.allTime.wins - gvc.allTime.losses > 0 ? '+' : ''}{gvc.allTime.wins - gvc.allTime.losses})</span>
                                                </div>
                                                <div className="text-sm text-gray-500 font-mundial mt-1">
                                                    ({getWinRate(gvc)}% Win Rate)
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ACTIVITY TAB */}
                {isConnected && !loading && !error && activeTab === 'activity' && (
                    <div className="max-w-3xl mx-auto">
                        <div className="space-y-3">
                            {activity.map((item, i) => {
                                const isWin = item.result === 'W';
                                const cardBorder = isWin ? 'border-green-500/50' : 'border-red-500/50';
                                const cardBg = isWin ? 'bg-green-900/10' : 'bg-red-900/10';
                                const resultText = isWin ? 'YOU WON!' : 'YOU LOST!';
                                const resultColor = isWin ? 'text-green-400' : 'text-red-400';
                                const actionText = isWin ? 'beat' : 'lost to';

                                return (
                                    <div
                                        key={i}
                                        className={`${cardBg} rounded-xl border ${cardBorder} p-4 flex items-center justify-between gap-4`}
                                    >
                                        {/* Left: Images */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={item.gvcUrl || '/api/placeholder/60/60'}
                                                    alt={item.gvcName}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                                <div className="text-xs font-bold text-gray-400">#{item.gvcId}</div>
                                            </div>
                                            <span className={`font-bold ${resultColor} text-lg`}>{isWin ? '>' : '<'}</span>
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={item.opponentUrl || '/api/placeholder/60/60'}
                                                    alt={item.opponentName}
                                                    className="w-12 h-12 rounded-lg object-cover grayscale opacity-70"
                                                />
                                                <div className="text-xs font-bold text-gray-600">#{item.opponentId}</div>
                                            </div>
                                        </div>

                                        {/* Center: Result Text */}
                                        <div className="flex-grow text-center">
                                            <div className={`font-display text-lg ${resultColor}`}>
                                                {resultText}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                                vs GVC #{item.opponentId}
                                            </div>
                                        </div>

                                        {/* Right: Timestamp */}
                                        <div className="text-right text-xs text-gray-600 font-mono">
                                            {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}<br />
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                )}
            </div>

            {/* Duo Creation Modal */}
            <AnimatePresence>
                {showDuoModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDuoModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-zinc-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/20"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-cooper font-bold text-[#FFE048]">Create a Duo</h2>
                                <button onClick={() => setShowDuoModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <p className="text-gray-400 mb-6 font-mundial">Select any 2 GVCs to pair together and enter into DUOS mode.</p>
                            {duoError && (
                                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">{duoError}</div>
                            )}
                            <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-black/30 rounded-xl">
                                {selectedForDuo.length > 0 ? (
                                    <>
                                        {selectedForDuo.map((id) => {
                                            const gvc = gvcs.find(g => g.id === id);
                                            return (
                                                <div key={id} className="relative">
                                                    <img src={gvc?.url} alt={gvc?.name} className="w-20 h-20 rounded-xl object-cover border-2 border-[#FFE048]" />
                                                    <div className="text-center text-xs text-gray-400 mt-1 font-mundial">#{id}</div>
                                                </div>
                                            );
                                        })}
                                        {selectedForDuo.length === 1 && (
                                            <>
                                                <Plus className="text-gray-500" size={24} />
                                                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-600">?</div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-gray-500 font-mundial">Select 2 GVCs Below</p>
                                )}
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6">
                                {gvcs.map(gvc => {
                                    const isInDuo = gvcsInDuos.has(gvc.id);
                                    const isSelected = selectedForDuo.includes(gvc.id);
                                    return (
                                        <button
                                            key={gvc.id}
                                            onClick={() => toggleDuoSelection(gvc.id)}
                                            disabled={isInDuo}
                                            className={`relative rounded-xl overflow-hidden border-2 transition-all ${isInDuo ? 'opacity-40 cursor-not-allowed border-gray-700' :
                                                isSelected ? 'border-[#FFE048] scale-105' :
                                                    'border-transparent hover:border-white/30'
                                                }`}
                                        >
                                            <img src={gvc.url} alt={gvc.name} className="w-full aspect-square object-cover" />
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-[#FFE048]/20 flex items-center justify-center">
                                                    <Check className="text-[#FFE048]" size={32} />
                                                </div>
                                            )}
                                            {isInDuo && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <span className="text-[10px] text-gray-400">IN DUO</span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-1 left-1 text-[10px] bg-black/70 px-1 rounded">#{gvc.id}</div>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={submitDuo}
                                disabled={selectedForDuo.length !== 2 || duoSubmitting}
                                className={`w-full py-4 rounded-xl font-bold font-mundial text-lg transition-all ${selectedForDuo.length === 2 ? 'bg-[#FFE048] text-black hover:bg-[#FFE048]/90' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {duoSubmitting ? 'Creating...' : selectedForDuo.length === 2 ? 'CREATE DUO' : `Select ${2 - selectedForDuo.length} More`}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main >
    );
}
