'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Swords } from 'lucide-react';

interface GvcInfo {
    id: number;
    name: string;
    url: string;
}

interface DuoStats {
    wins: number;
    losses: number;
    matches: number;
    elo: number;
}

interface Duo {
    id: string;
    gvc1: GvcInfo;
    gvc2: GvcInfo;
    owner: string;
    stats: DuoStats;
}

interface Matchup {
    duo1: Duo;
    duo2: Duo;
    totalDuos: number;
}

export default function DuosPage() {
    const [matchup, setMatchup] = useState<Matchup | null>(null);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);
    const [votesRemaining, setVotesRemaining] = useState(10);
    const [error, setError] = useState<string | null>(null);
    const [animatingWinner, setAnimatingWinner] = useState<1 | 2 | null>(null);

    const fetchMatchup = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/duos/matchup');
            const data = await res.json();

            if (res.ok) {
                setMatchup(data);
                setError(null);
            } else {
                setError(data.error || 'Failed to load matchup');
                setMatchup(null);
            }
        } catch (e) {
            setError('Failed to load matchup');
        } finally {
            setLoading(false);
        }
    };

    const fetchVoteCount = async () => {
        try {
            const res = await fetch('/api/duos/vote');
            const data = await res.json();
            setVotesRemaining(data.votesRemaining || 0);
        } catch (e) {
            // Ignore
        }
    };

    useEffect(() => {
        fetchMatchup();
        fetchVoteCount();
    }, []);

    const vote = async (winner: 1 | 2) => {
        if (!matchup || voting || votesRemaining <= 0) return;

        const winnerDuo = winner === 1 ? matchup.duo1 : matchup.duo2;
        const loserDuo = winner === 1 ? matchup.duo2 : matchup.duo1;

        setVoting(true);
        setAnimatingWinner(winner);

        try {
            const res = await fetch('/api/duos/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    winnerDuoId: winnerDuo.id,
                    loserDuoId: loserDuo.id
                })
            });

            const data = await res.json();

            if (res.ok) {
                setVotesRemaining(data.votesRemaining);
                // Wait for animation then fetch next matchup
                setTimeout(() => {
                    setAnimatingWinner(null);
                    fetchMatchup();
                }, 600);
            } else {
                setError(data.error);
                setAnimatingWinner(null);
            }
        } catch (e) {
            setError('Failed to submit vote');
            setAnimatingWinner(null);
        } finally {
            setVoting(false);
        }
    };

    const formatOwner = (owner: string) => {
        if (!owner) return 'Unknown';
        return `${owner.slice(0, 6)}...${owner.slice(-4)}`;
    };

    const getWinRate = (stats: DuoStats) => {
        if (stats.matches === 0) return 0;
        return Math.round((stats.wins / stats.matches) * 100);
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] text-white">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                        <span>Back</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Users className="text-[#FFE048]" size={24} />
                        <span className="text-xl font-bold">DUOS</span>
                    </div>
                    <div className="text-sm text-white/60">
                        {votesRemaining} votes left
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-brice)' }}>
                        <span className="text-[#FFE048]">DUOS</span> MODE
                    </h1>
                    <p className="text-white/60">Vote for your favorite GVC pair!</p>
                </div>

                {/* Matchup Area */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-12 h-12 border-4 border-[#FFE048] border-t-transparent rounded-full" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-white/60 mb-4">{error}</p>
                        {error.includes('Not enough') && (
                            <Link href="/profile" className="inline-block bg-[#FFE048] text-black px-6 py-3 rounded-lg font-bold hover:bg-[#FFE048]/90 transition-colors">
                                Create a Duo →
                            </Link>
                        )}
                    </div>
                ) : matchup && (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center">
                        {/* Duo 1 */}
                        <motion.div
                            className={`relative bg-white/5 rounded-2xl p-6 border-2 cursor-pointer transition-all ${animatingWinner === 1 ? 'border-[#FFE048] scale-105' :
                                    animatingWinner === 2 ? 'border-red-500/50 scale-95 opacity-50' :
                                        'border-white/10 hover:border-[#FFE048]/50'
                                }`}
                            onClick={() => vote(1)}
                            whileHover={{ scale: voting ? 1 : 1.02 }}
                            whileTap={{ scale: voting ? 1 : 0.98 }}
                        >
                            <div className="flex gap-4 mb-4">
                                <div className="relative w-32 h-32 rounded-xl overflow-hidden">
                                    <Image
                                        src={matchup.duo1.gvc1.url}
                                        alt={matchup.duo1.gvc1.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="relative w-32 h-32 rounded-xl overflow-hidden">
                                    <Image
                                        src={matchup.duo1.gvc2.url}
                                        alt={matchup.duo1.gvc2.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-white/60 mb-1">
                                    #{matchup.duo1.gvc1.id} + #{matchup.duo1.gvc2.id}
                                </div>
                                <div className="text-xs text-white/40 mb-2">
                                    Owner: {formatOwner(matchup.duo1.owner)}
                                </div>
                                <div className="flex items-center justify-center gap-4 text-sm">
                                    <span className="text-green-400">{matchup.duo1.stats.wins}W</span>
                                    <span className="text-red-400">{matchup.duo1.stats.losses}L</span>
                                    <span className="text-white/60">{getWinRate(matchup.duo1.stats)}%</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* VS */}
                        <div className="flex items-center justify-center">
                            <div className="text-4xl font-bold text-[#FFE048]" style={{ fontFamily: 'var(--font-brice)' }}>
                                VS
                            </div>
                        </div>

                        {/* Duo 2 */}
                        <motion.div
                            className={`relative bg-white/5 rounded-2xl p-6 border-2 cursor-pointer transition-all ${animatingWinner === 2 ? 'border-[#FFE048] scale-105' :
                                    animatingWinner === 1 ? 'border-red-500/50 scale-95 opacity-50' :
                                        'border-white/10 hover:border-[#FFE048]/50'
                                }`}
                            onClick={() => vote(2)}
                            whileHover={{ scale: voting ? 1 : 1.02 }}
                            whileTap={{ scale: voting ? 1 : 0.98 }}
                        >
                            <div className="flex gap-4 mb-4">
                                <div className="relative w-32 h-32 rounded-xl overflow-hidden">
                                    <Image
                                        src={matchup.duo2.gvc1.url}
                                        alt={matchup.duo2.gvc1.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="relative w-32 h-32 rounded-xl overflow-hidden">
                                    <Image
                                        src={matchup.duo2.gvc2.url}
                                        alt={matchup.duo2.gvc2.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-white/60 mb-1">
                                    #{matchup.duo2.gvc1.id} + #{matchup.duo2.gvc2.id}
                                </div>
                                <div className="text-xs text-white/40 mb-2">
                                    Owner: {formatOwner(matchup.duo2.owner)}
                                </div>
                                <div className="flex items-center justify-center gap-4 text-sm">
                                    <span className="text-green-400">{matchup.duo2.stats.wins}W</span>
                                    <span className="text-red-400">{matchup.duo2.stats.losses}L</span>
                                    <span className="text-white/60">{getWinRate(matchup.duo2.stats)}%</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Vote Counter */}
                {votesRemaining <= 0 && (
                    <div className="text-center mt-8 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                        <p className="text-yellow-400">You've used all 10 votes for today!</p>
                        <p className="text-white/60 text-sm mt-1">Come back tomorrow for more DUOS matchups.</p>
                    </div>
                )}

                {/* Info */}
                <div className="mt-12 text-center text-white/40 text-sm">
                    <p>{matchup?.totalDuos || 0} Duos submitted • Create yours on the <Link href="/profile" className="text-[#FFE048] hover:underline">Profile page</Link></p>
                </div>
            </div>
        </main>
    );
}
