'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users } from 'lucide-react';
import { fetchNftOwner, getOwnerDisplayAndLink } from '@/lib/opensea';

interface DuoMatchup {
    id: string;
    gvc1: { id: number; name: string; url: string };
    gvc2: { id: number; name: string; url: string };
    owner: string;
    stats: { wins: number; losses: number; elo: number };
}

interface LeaderboardDuo {
    id: string;
    gvc1: { id: number; name: string; url: string };
    gvc2: { id: number; name: string; url: string };
    owner: string;
    wins: number;
    losses: number;
    winRate: number;
}

// Helper to format owner display
function formatOwner(owner: string): string {
    if (!owner) return '—';
    if (owner.startsWith('0x') && owner.length > 12) {
        return `${owner.slice(0, 6)}...${owner.slice(-4)}`;
    }
    return owner;
}

export default function DuosPage() {
    const [matchup, setMatchup] = useState<[DuoMatchup, DuoMatchup] | null>(null);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);
    const [remainingVotes, setRemainingVotes] = useState(10);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardDuo[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [lastWinner, setLastWinner] = useState<string | null>(null);
    const [duoCount, setDuoCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [duoOwners, setDuoOwners] = useState<Record<string, { display: string; link: string | null }>>({});
    const [countdown, setCountdown] = useState<string | null>(null);

    const fetchMatchup = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/duos/matchup');
            const data = await res.json();
            if (data.matchup) {
                setMatchup(data.matchup);
                setDuoCount(data.totalDuos);
            } else {
                setError(data.message || 'Not enough Duos');
                setDuoCount(data.duoCount || 0);
            }
        } catch {
            setError('Failed to load matchup');
        } finally {
            setLoading(false);
        }
    };

    const fetchVotes = async () => {
        try {
            const res = await fetch('/api/duos/vote');
            const data = await res.json();
            setRemainingVotes(data.remainingVotes ?? 10);
        } catch {
            console.error('Failed to fetch votes');
        }
    };

    const fetchLeaderboard = async () => {
        try {
            setLoadingLeaderboard(true);
            const res = await fetch('/api/duos/leaderboard');
            const data = await res.json();
            setLeaderboard(data.duos || []);
        } catch {
            console.error('Failed to fetch leaderboard');
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    useEffect(() => {
        fetchMatchup();
        fetchVotes();
    }, []);

    useEffect(() => {
        if (showLeaderboard) {
            fetchLeaderboard();
        }
    }, [showLeaderboard]);

    const handleVote = useCallback(async (winnerId: string, loserId: string) => {
        if (voting || remainingVotes <= 0 || isTransitioning || countdown) return;
        setVoting(true);
        setLastWinner(winnerId);

        try {
            const res = await fetch('/api/duos/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ winnerId, loserId })
            });
            const data = await res.json();
            if (data.success) {
                setRemainingVotes(data.remainingVotes);
                // Start countdown sequence
                setLastWinner(null);
                setIsTransitioning(true);
                setMatchup(null);

                // 3-2-1 DUO! countdown
                setCountdown('3');
                setTimeout(() => setCountdown('2'), 600);
                setTimeout(() => setCountdown('1'), 1200);
                setTimeout(() => setCountdown('DUO!'), 1800);
                setTimeout(() => {
                    setCountdown(null);
                    fetchMatchup();
                }, 2400);
            }
        } catch {
            console.error('Vote failed');
            setLastWinner(null);
        } finally {
            setVoting(false);
        }
    }, [voting, remainingVotes, isTransitioning, countdown]);

    const canVote = remainingVotes > 0;

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!matchup || remainingVotes <= 0 || showLeaderboard || isTransitioning) return;

            if (e.key === 'ArrowLeft') {
                handleVote(matchup[0].id, matchup[1].id);
            } else if (e.key === 'ArrowRight') {
                handleVote(matchup[1].id, matchup[0].id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [matchup, remainingVotes, showLeaderboard, isTransitioning, handleVote]);

    // Fetch OpenSea owners for current matchup
    useEffect(() => {
        if (!matchup) return;

        const fetchOwners = async () => {
            for (const duo of matchup) {
                if (!duoOwners[duo.id]) {
                    // Fetch owner for first GVC of the duo
                    const ownerData = await fetchNftOwner(duo.gvc1.id);
                    if (ownerData) {
                        const info = getOwnerDisplayAndLink(ownerData, duo.owner);
                        setDuoOwners(prev => ({ ...prev, [duo.id]: info }));
                    }
                }
            }
        };
        fetchOwners();
    }, [matchup]);

    // Clear transition state when matchup loads
    useEffect(() => {
        if (matchup && isTransitioning) {
            setIsTransitioning(false);
        }
    }, [matchup, isTransitioning]);

    // Duo Card Component - Vertical Stack Layout
    const DuoCard = ({ duo, onClick, isWinner, isLoser }: { duo: DuoMatchup; onClick: () => void; isWinner?: boolean; isLoser?: boolean }) => (
        <motion.div
            whileHover={{ scale: canVote ? 1.02 : 1 }}
            whileTap={{ scale: canVote ? 0.98 : 1 }}
            className={`flex flex-col h-full bg-[#1A1A1A] rounded-lg md:rounded-2xl overflow-hidden border transition-all duration-300 ${isLoser ? 'border-red-500/50 opacity-50' :
                canVote ? 'border-white/10 hover:border-gvc-gold hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-pointer' :
                    'border-white/10 opacity-50 cursor-not-allowed'
                }`}
            onClick={onClick}
        >
            {/* Duo Images - Vertical Stack */}
            <div className="w-full p-3 md:p-4 flex flex-col gap-2 md:gap-3">
                {/* Top GVC */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                    <Image
                        src={duo.gvc1.url}
                        alt={`GVC #${duo.gvc1.id}`}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                </div>
                {/* Bottom GVC */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                    <Image
                        src={duo.gvc2.url}
                        alt={`GVC #${duo.gvc2.id}`}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                </div>
            </div>

            {/* Details Section - VibeCard style */}
            <div className="flex justify-between items-center p-3 md:p-5 bg-[#1A1A1A] border-t border-white/5 flex-grow">
                {/* Left Side: Name & Owner */}
                <div className="flex flex-col min-w-0 pr-2">
                    {/* Duo Name */}
                    <h3 className="text-lg md:text-2xl font-cooper text-white mb-0.5 md:mb-1 leading-tight">
                        GVC #{duo.gvc1.id} + #{duo.gvc2.id}
                    </h3>
                    {/* Owner */}
                    {(() => {
                        const ownerInfo = duoOwners[duo.id];
                        const displayName = ownerInfo?.display || formatOwner(duo.owner);
                        const linkPath = ownerInfo?.link || duo.owner;
                        return (
                            <div className="flex items-center gap-1 text-[10px] md:text-sm text-gray-400 font-mono truncate">
                                <span className="opacity-50">OWNER</span>
                                {linkPath ? (
                                    <a
                                        href={`https://opensea.io/${linkPath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className={`truncate ${ownerInfo ? 'text-gvc-gold font-bold' : 'text-gray-500 hover:text-white'}`}
                                        title="View profile on OpenSea"
                                    >
                                        {displayName}
                                    </a>
                                ) : (
                                    <span className={`truncate ${ownerInfo ? 'text-gvc-gold font-bold' : 'text-gray-500'}`}>
                                        {displayName}
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Right Side: OpenSea Icon */}
                <a
                    href={`https://opensea.io/${duoOwners[duo.id]?.link || duo.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 bg-white/5 hover:bg-white/10 p-2 md:p-3 rounded-lg border border-white/5 hover:border-white/20 transition-all opacity-70 hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                    title="View on OpenSea"
                >
                    <img
                        src="/opensea-v2.png"
                        alt="OpenSea"
                        className="w-5 h-5 md:w-6 md:h-6 opacity-90"
                    />
                </a>
            </div>
        </motion.div>
    );

    return (
        <main className="min-h-screen bg-black text-white bg-[url('/grid.svg')] bg-center">
            <div className="w-full min-h-screen p-4 md:p-8 flex flex-col items-center">
                {/* Main Content Container */}
                <div className="w-full max-w-[1000px] flex flex-col">
                    {/* Title */}
                    <div className="text-center mb-4 md:mb-6">
                        <p className="text-gvc-gold font-bold font-mundial tracking-widest text-sm mb-4 uppercase">Good Vibes Club Presents</p>
                        <motion.h1
                            initial={{ opacity: 0, y: -30, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 100, damping: 10 }}
                            className="text-6xl md:text-8xl lg:text-9xl font-cooper text-center text-gvc-gold glowing-text leading-none"
                        >
                            DUOS!
                        </motion.h1>
                    </div>

                    {/* Header Stats - Button Ribbon (like main page) */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-4 md:mb-8 w-full">
                        {/* Left: Back + Vote Counter */}
                        <div className="flex items-stretch gap-2">
                            <Link
                                href="/"
                                className="px-4 py-3 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#252525] transition-all font-bold font-mundial text-sm uppercase tracking-wider flex items-center gap-2"
                            >
                                <ArrowLeft size={18} />
                            </Link>
                            <div className="flex rounded-lg overflow-hidden">
                                <div className="bg-[#1a1a1a] px-4 py-3 flex items-center">
                                    <span className="text-gray-400 text-xs font-bold font-mundial tracking-wider">DAILY VOTES</span>
                                </div>
                                <div className={`px-5 py-3 flex items-center ${canVote ? 'bg-gvc-gold' : 'bg-red-500'}`}>
                                    <span className="text-black font-mono text-xl font-black">{remainingVotes}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Navigation */}
                        <div className="flex gap-2 md:gap-3">
                            <Link
                                href="/profile"
                                className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#252525] transition-all font-bold font-mundial text-sm uppercase tracking-wider flex items-center gap-2"
                            >
                                <Users size={18} /> Create Duo
                            </Link>
                            <button
                                onClick={() => setShowLeaderboard(!showLeaderboard)}
                                className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-gvc-gold text-black font-bold font-mundial text-sm uppercase tracking-wider hover:bg-[#FFE058] transition-all"
                            >
                                {showLeaderboard ? 'Back to Vote' : 'Leaderboard'}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {showLeaderboard ? (
                            /* Leaderboard View - Structured like main leaderboard */
                            <motion.div
                                key="leaderboard"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="w-full"
                            >
                                <h2 className="text-xl md:text-3xl font-display text-gvc-gold glowing-text mb-4 md:mb-6">DUOS LEADERBOARD</h2>

                                <div className="w-full bg-[#111] border border-white/20 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-[24px_60px_1fr_40px_40px_40px_24px] md:grid-cols-[60px_100px_2fr_80px_80px_80px_1.5fr_50px] gap-1 md:gap-4 px-2 md:px-6 py-2 md:py-3 bg-white/5 border-b border-white/10 text-[8px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <div className="text-center">#</div>
                                        <div>DUO</div>
                                        <div className="hidden md:block">GVCS</div>
                                        <div className="text-center">Wins</div>
                                        <div className="text-center">Losses</div>
                                        <div className="text-center">Win%</div>
                                        <div className="hidden md:block text-center">Collector</div>
                                        <div className="text-center">Link</div>
                                    </div>

                                    {/* List */}
                                    <div className="max-h-[60vh] overflow-y-auto">
                                        {loadingLeaderboard ? (
                                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gvc-gold mb-4"></div>
                                                <div className="text-gvc-gold font-display text-xl animate-pulse">LOADING...</div>
                                            </div>
                                        ) : leaderboard.length === 0 ? (
                                            <div className="text-center py-20 text-gray-500">No Duos have been voted on yet</div>
                                        ) : (
                                            leaderboard.slice(0, 50).map((duo, index) => {
                                                const isTop3 = index < 3;
                                                return (
                                                    <motion.div
                                                        key={duo.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.03 }}
                                                        className={`grid grid-cols-[24px_60px_1fr_40px_40px_40px_24px] md:grid-cols-[60px_100px_2fr_80px_80px_80px_1.5fr_50px] gap-1 md:gap-4 items-center px-2 md:px-6 py-2 md:py-4 border-b border-white/5 hover:bg-white/5 transition-colors ${isTop3 ? 'bg-gradient-to-r from-gvc-gold/10 to-transparent' : ''}`}
                                                    >
                                                        {/* Rank */}
                                                        <div className="flex justify-center">
                                                            <div className={`w-5 h-5 md:w-8 md:h-8 flex items-center justify-center rounded-full font-bold text-[10px] md:text-sm
                                                                ${index === 0 ? 'bg-[#FFD700] text-black shadow-[0_0_15px_#FFD700]' : ''}
                                                                ${index === 1 ? 'bg-[#C0C0C0] text-black' : ''}
                                                                ${index === 2 ? 'bg-[#CD7F32] text-black' : ''}
                                                                ${index > 2 ? 'text-gray-500' : ''}
                                                            `}>
                                                                {index + 1}
                                                            </div>
                                                        </div>

                                                        {/* Duo Images */}
                                                        <div className="flex gap-1">
                                                            <div className="relative w-8 h-8 md:w-12 md:h-12 rounded overflow-hidden border border-white/20">
                                                                <Image src={duo.gvc1.url} alt="" fill className="object-cover" unoptimized />
                                                            </div>
                                                            <div className="relative w-8 h-8 md:w-12 md:h-12 rounded overflow-hidden border border-white/20">
                                                                <Image src={duo.gvc2.url} alt="" fill className="object-cover" unoptimized />
                                                            </div>
                                                        </div>

                                                        {/* GVCS - Hidden on Mobile */}
                                                        <div className="hidden md:block font-cooper text-sm text-white truncate">
                                                            GVC #{duo.gvc1.id} + #{duo.gvc2.id}
                                                        </div>

                                                        {/* Wins */}
                                                        <div className="text-center">
                                                            <div className="text-gvc-gold font-display text-[10px] md:text-lg">{duo.wins} W</div>
                                                        </div>

                                                        {/* Losses */}
                                                        <div className="text-center">
                                                            <div className="text-gray-400 font-display text-[10px] md:text-lg">{duo.losses} L</div>
                                                        </div>

                                                        {/* Win Rate */}
                                                        <div className="text-center">
                                                            <div className="text-white font-display text-[10px] md:text-lg">{duo.winRate}%</div>
                                                        </div>

                                                        {/* Collector - Hidden on Mobile */}
                                                        <div className="hidden md:block text-center font-mono text-xs text-gray-500 truncate">
                                                            {formatOwner(duo.owner)}
                                                        </div>

                                                        {/* OpenSea Link */}
                                                        <div className="flex justify-center">
                                                            <a
                                                                href={`https://opensea.io/${duo.owner}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-gray-500 hover:text-[#2081E2] transition-colors opacity-50 hover:opacity-100"
                                                                title="View profile on OpenSea"
                                                            >
                                                                <img
                                                                    src="/opensea-v2.png"
                                                                    alt="OpenSea"
                                                                    className="w-4 h-4 md:w-6 md:h-6 rounded-full"
                                                                />
                                                            </a>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* Voting View */
                            <motion.div
                                key="voting"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="w-full flex flex-col items-center"
                            >
                                {(loading || isTransitioning) ? (
                                    /* Loading State - Countdown or Skeleton Cards */
                                    <div className="relative">
                                        {/* Countdown Overlay */}
                                        {countdown ? (
                                            <motion.div
                                                key={countdown}
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 1.5, opacity: 0 }}
                                                className="flex items-center justify-center py-40"
                                            >
                                                <motion.span
                                                    initial={{ scale: 0.8 }}
                                                    animate={{ scale: [1, 1.1, 1] }}
                                                    transition={{ duration: 0.4 }}
                                                    className={`text-6xl md:text-9xl font-cooper ${countdown === 'DUO!' ? 'text-gvc-gold' : 'text-white'}`}
                                                >
                                                    {countdown}
                                                </motion.span>
                                            </motion.div>
                                        ) : (
                                            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-8 items-center w-full">
                                                {/* Left Loading Card - matches DuoCard structure exactly */}
                                                <div className="flex flex-col h-full bg-[#1A1A1A] rounded-lg md:rounded-2xl overflow-hidden border border-white/10">
                                                    {/* Duo Images - Vertical Stack */}
                                                    <div className="w-full p-3 md:p-4 flex flex-col gap-2 md:gap-3">
                                                        {/* Top GVC */}
                                                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center">
                                                            <div className="w-10 h-10 md:w-16 md:h-16 border-4 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin" />
                                                        </div>
                                                        {/* Bottom GVC */}
                                                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center">
                                                            <div className="w-10 h-10 md:w-16 md:h-16 border-4 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin" />
                                                        </div>
                                                    </div>
                                                    {/* Details Section - matches DuoCard footer */}
                                                    <div className="flex justify-between items-center p-3 md:p-5 bg-[#1A1A1A] border-t border-white/5 flex-grow">
                                                        <div className="flex flex-col min-w-0 pr-2">
                                                            <div className="h-6 md:h-8 w-36 md:w-48 bg-white/10 rounded animate-pulse mb-0.5 md:mb-1" />
                                                            <div className="h-3 md:h-4 w-20 md:w-24 bg-white/5 rounded animate-pulse" />
                                                        </div>
                                                        <div className="shrink-0 bg-white/5 p-2 md:p-3 rounded-lg border border-white/5">
                                                            <div className="w-5 h-5 md:w-6 md:h-6 bg-white/10 rounded animate-pulse" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* VS Badge */}
                                                <div className="flex items-center justify-center">
                                                    <span className="text-2xl md:text-4xl font-display italic text-gvc-gold/50">VS</span>
                                                </div>

                                                {/* Right Loading Card - matches DuoCard structure exactly */}
                                                <div className="flex flex-col h-full bg-[#1A1A1A] rounded-lg md:rounded-2xl overflow-hidden border border-white/10">
                                                    {/* Duo Images - Vertical Stack */}
                                                    <div className="w-full p-3 md:p-4 flex flex-col gap-2 md:gap-3">
                                                        {/* Top GVC */}
                                                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center">
                                                            <div className="w-10 h-10 md:w-16 md:h-16 border-4 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin" />
                                                        </div>
                                                        {/* Bottom GVC */}
                                                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center">
                                                            <div className="w-10 h-10 md:w-16 md:h-16 border-4 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin" />
                                                        </div>
                                                    </div>
                                                    {/* Details Section - matches DuoCard footer */}
                                                    <div className="flex justify-between items-center p-3 md:p-5 bg-[#1A1A1A] border-t border-white/5 flex-grow">
                                                        <div className="flex flex-col min-w-0 pr-2">
                                                            <div className="h-6 md:h-8 w-36 md:w-48 bg-white/10 rounded animate-pulse mb-0.5 md:mb-1" />
                                                            <div className="h-3 md:h-4 w-20 md:w-24 bg-white/5 rounded animate-pulse" />
                                                        </div>
                                                        <div className="shrink-0 bg-white/5 p-2 md:p-3 rounded-lg border border-white/5">
                                                            <div className="w-5 h-5 md:w-6 md:h-6 bg-white/10 rounded animate-pulse" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-400 mb-4 font-mundial">{error}</p>
                                        <p className="text-gray-600 text-sm font-mundial mb-6">{duoCount} Duos submitted • Need at least 2 to start</p>
                                        <Link
                                            href="/profile"
                                            className="px-6 py-3 bg-gvc-gold text-black rounded-lg font-bold font-mundial uppercase tracking-wider hover:bg-[#FFE058] transition-all"
                                        >
                                            Create a Duo →
                                        </Link>
                                    </div>
                                ) : matchup ? (
                                    <>
                                        {/* Vote Limit Warning */}
                                        {!canVote && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-center w-full"
                                            >
                                                <p className="font-bold font-mundial">Daily Limit Reached!</p>
                                                <p className="text-sm font-mundial">Come back tomorrow to cast more votes.</p>
                                            </motion.div>
                                        )}

                                        {/* Matchup Grid - Side by Side */}
                                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-8 items-center w-full">
                                            {/* Left Duo */}
                                            <DuoCard
                                                duo={matchup[0]}
                                                onClick={() => canVote && handleVote(matchup[0].id, matchup[1].id)}
                                                isWinner={lastWinner === matchup[0].id}
                                                isLoser={lastWinner === matchup[1].id}
                                            />

                                            {/* VS Badge */}
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="flex items-center justify-center"
                                            >
                                                <span className="text-2xl md:text-4xl font-display italic text-gvc-gold">VS</span>
                                            </motion.div>

                                            {/* Right Duo */}
                                            <DuoCard
                                                duo={matchup[1]}
                                                onClick={() => canVote && handleVote(matchup[1].id, matchup[0].id)}
                                                isWinner={lastWinner === matchup[1].id}
                                                isLoser={lastWinner === matchup[0].id}
                                            />
                                        </div>
                                    </>
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer - Main Page Style */}
                    <div className="text-center mt-12">
                        <p className="hidden md:block text-gray-500 text-sm font-mundial">
                            Tap a card or use ⬅️ ➡️ arrow keys • {duoCount} DUOS competing
                        </p>
                        <p className="md:hidden text-gray-500 text-xs font-mundial">
                            Tap a card to vote • {duoCount} DUOS competing
                        </p>
                        <p className="text-gray-600 mt-2 text-xs font-mono">
                            vibe coded by <a href="https://x.com/brydisanto" target="_blank" rel="noopener noreferrer" className="hover:text-gvc-gold transition-colors">@brydisanto</a>
                        </p>
                        {/* Shaka Footer */}
                        <div className="mt-6 md:mt-8 opacity-90 hover:opacity-100 transition-opacity animate-pulse flex justify-center">
                            <img
                                src="/shaka-footer.png"
                                alt="Good Vibes Club"
                                className="w-10 h-10 md:w-20 md:h-20 object-contain"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main >
    );
}
