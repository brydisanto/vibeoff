'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { fetchNftOwner, getOwnerDisplayAndLink } from '@/lib/opensea';

interface CharacterData {
    id: number;
    name: string;
    url: string;
}

interface DailyData {
    matchup: {
        char1: CharacterData;
        char2: CharacterData;
    };
    votes: {
        char1: number;
        char2: number;
    };
    endsAt: string;
    hasVoted: boolean;
    dateKey: string;
}

interface OwnerData {
    address: string;
    username: string | null;
    display: string;
}

const OPENSEA_CONTRACT = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';

export default function DailyVibeOffPage() {
    const [data, setData] = useState<DailyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);
    const [votedFor, setVotedFor] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState({ hours: '00', mins: '00', secs: '00' });
    const [error, setError] = useState<string | null>(null);
    const [owners, setOwners] = useState<Record<number, OwnerData>>({});

    // Fetch current daily matchup
    const fetchDaily = useCallback(async () => {
        try {
            const res = await fetch('/api/daily');
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setData(json);
            if (json.votedForId) {
                setVotedFor(json.votedForId);
            }

            // Fetch owners for both characters
            [json.matchup.char1.id, json.matchup.char2.id].forEach(async (id) => {
                const ownerData = await fetchNftOwner(id);
                if (ownerData) {
                    setOwners(prev => ({ ...prev, [id]: ownerData }));
                }
            });
        } catch (err) {
            setError('Failed to load daily matchup');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Vote handler
    const handleVote = async (charId: number) => {
        if (voting || votedFor !== null) return;

        setVoting(true);
        try {
            const res = await fetch('/api/daily/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ charId }),
            });

            const json = await res.json();

            if (res.ok && json.success) {
                setVotedFor(charId);
                setData(prev => prev ? {
                    ...prev,
                    votes: json.votes,
                    hasVoted: true,
                } : null);
            } else {
                setError(json.error || 'Failed to vote');
            }
        } catch (err) {
            setError('Failed to record vote');
            console.error(err);
        } finally {
            setVoting(false);
        }
    };

    const getOwnerInfo = (charId: number) => {
        const owner = owners[charId];
        if (!owner) return { display: '...', link: null };
        return getOwnerDisplayAndLink(owner, owner.address);
    };

    // Countdown timer
    useEffect(() => {
        if (!data?.endsAt) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const end = new Date(data.endsAt).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft({ hours: '00', mins: '00', secs: '00' });
                setTimeout(() => fetchDaily(), 2000);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({
                hours: hours.toString().padStart(2, '0'),
                mins: mins.toString().padStart(2, '0'),
                secs: secs.toString().padStart(2, '0'),
            });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [data?.endsAt, fetchDaily]);

    // Initial fetch
    useEffect(() => {
        fetchDaily();
    }, [fetchDaily]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-gvc-gold text-2xl font-display animate-pulse">
                    LOADING THE DAILY...
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-red-500 text-xl">{error || 'Something went wrong'}</div>
            </div>
        );
    }

    const { matchup, votes } = data;
    const totalVotes = votes.char1 + votes.char2;
    const percent1 = totalVotes > 0 ? Math.round((votes.char1 / totalVotes) * 100) : 50;
    const percent2 = totalVotes > 0 ? Math.round((votes.char2 / totalVotes) * 100) : 50;
    const hasVoted = votedFor !== null || data.hasVoted;

    const owner1Info = getOwnerInfo(matchup.char1.id);
    const owner2Info = getOwnerInfo(matchup.char2.id);

    return (
        <main className="min-h-screen bg-black text-white bg-[url('/grid.svg')] bg-center">
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Header - Like Homepage */}
                <div className="flex flex-col items-center mt-8 mb-6">
                    <p className="text-gvc-gold font-bold font-mundial tracking-wider md:tracking-widest text-[10px] md:text-sm mb-4 uppercase text-center whitespace-nowrap">
                        One matchup. 24 hours. Winner takes the vibes.
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
                        className="text-6xl md:text-8xl lg:text-9xl font-cooper text-center text-gvc-gold glowing-text leading-none"
                    >
                        THE DAILY!
                    </motion.h1>
                </div>

                {/* Menu Bar - Like Homepage */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-8 w-full max-w-4xl mx-auto">
                    {/* Timer Badge */}
                    <div className="flex rounded-lg overflow-hidden">
                        <div className="bg-[#1a1a1a] px-3 md:px-4 py-2 md:py-3 flex items-center">
                            <span className="text-gray-400 text-[10px] md:text-xs font-bold tracking-wider">TIME LEFT</span>
                        </div>
                        <div className="bg-gvc-gold px-4 md:px-5 py-2 md:py-3 flex items-center gap-1">
                            <span className="text-black font-mono text-lg md:text-xl font-black">{timeLeft.hours}:{timeLeft.mins}:{timeLeft.secs}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 md:gap-3">
                        <Link
                            href="/"
                            className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#252525] transition-all font-bold text-[11px] md:text-sm uppercase tracking-wider border border-transparent hover:border-white/30"
                        >
                            ← HOME
                        </Link>
                        <Link
                            href="/daily/history"
                            className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-gvc-gold text-black font-bold text-[11px] md:text-sm uppercase tracking-wider hover:bg-[#FFE058] transition-all"
                        >
                            Match History
                        </Link>
                    </div>
                </div>


                {/* Matchup */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto relative">
                    {/* VS Badge - Desktop */}
                    <div className="hidden md:flex absolute left-1/2 top-1/3 transform -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="bg-black text-gvc-gold font-display text-2xl px-4 py-3 border-2 border-gvc-gold rounded-full shadow-[0_0_20px_rgba(255,204,77,0.3)]">
                            VS
                        </div>
                    </div>

                    {/* Character 1 */}
                    <motion.div
                        whileHover={{ scale: hasVoted ? 1 : 1.02 }}
                        whileTap={{ scale: hasVoted ? 1 : 0.98 }}
                        onClick={() => !hasVoted && handleVote(matchup.char1.id)}
                        className={`relative cursor-pointer group ${hasVoted ? 'cursor-default' : ''}`}
                    >
                        <div className={`bg-[#111] rounded-2xl overflow-hidden border-2 transition-all duration-300 ${votedFor === matchup.char1.id
                            ? 'border-gvc-gold shadow-[0_0_40px_rgba(255,204,77,0.4)]'
                            : hasVoted
                                ? 'border-white/10'
                                : 'border-white/10 hover:border-gvc-gold'
                            }`}>

                            <div className="relative aspect-square">
                                <Image
                                    src={matchup.char1.url}
                                    alt={matchup.char1.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                                {!hasVoted && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-gvc-gold text-black font-black text-2xl px-6 py-3 rounded-full border-2 border-black">
                                            VOTE!
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <a
                                            href={`https://opensea.io/assets/ethereum/${OPENSEA_CONTRACT}/${matchup.char1.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-lg md:text-xl font-display text-white hover:text-gvc-gold transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {matchup.char1.name}
                                        </a>
                                        <div className="text-[10px] md:text-xs text-gray-500 font-mono">
                                            OWNER: {owner1Info.link ? (
                                                <a
                                                    href={`https://opensea.io/${owner1Info.link}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-400 hover:text-gvc-gold transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {owner1Info.display}
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">{owner1Info.display}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl md:text-3xl font-bold text-gvc-gold">{votes.char1}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">votes</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* VS Badge - Mobile */}
                    <div className="flex md:hidden justify-center -my-4 z-10">
                        <div className="bg-black text-gvc-gold font-display text-xl px-4 py-2 border-2 border-gvc-gold rounded-full">
                            VS
                        </div>
                    </div>

                    {/* Character 2 */}
                    <motion.div
                        whileHover={{ scale: hasVoted ? 1 : 1.02 }}
                        whileTap={{ scale: hasVoted ? 1 : 0.98 }}
                        onClick={() => !hasVoted && handleVote(matchup.char2.id)}
                        className={`relative cursor-pointer group ${hasVoted ? 'cursor-default' : ''}`}
                    >
                        <div className={`bg-[#111] rounded-2xl overflow-hidden border-2 transition-all duration-300 ${votedFor === matchup.char2.id
                            ? 'border-gvc-gold shadow-[0_0_40px_rgba(255,204,77,0.4)]'
                            : hasVoted
                                ? 'border-white/10'
                                : 'border-white/10 hover:border-gvc-gold'
                            }`}>

                            <div className="relative aspect-square">
                                <Image
                                    src={matchup.char2.url}
                                    alt={matchup.char2.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                                {!hasVoted && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-gvc-gold text-black font-black text-2xl px-6 py-3 rounded-full border-2 border-black">
                                            VOTE!
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <a
                                            href={`https://opensea.io/assets/ethereum/${OPENSEA_CONTRACT}/${matchup.char2.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-lg md:text-xl font-display text-white hover:text-gvc-gold transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {matchup.char2.name}
                                        </a>
                                        <div className="text-[10px] md:text-xs text-gray-500 font-mono">
                                            OWNER: {owner2Info.link ? (
                                                <a
                                                    href={`https://opensea.io/${owner2Info.link}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-400 hover:text-gvc-gold transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {owner2Info.display}
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">{owner2Info.display}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl md:text-3xl font-bold text-gvc-gold">{votes.char2}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">votes</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Vote Results Banner - Option B */}
                <div className="max-w-4xl mx-auto mt-10">
                    <div className="bg-gradient-to-br from-[#1a1a0a] to-[#0a0a0a] border border-gvc-gold/20 rounded-2xl p-6 md:p-8">
                        {/* Percentage labels */}
                        <div className="flex justify-between mb-3">
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`text-4xl md:text-5xl font-bold ${percent1 >= percent2 ? 'text-gvc-gold' : 'text-gray-600'}`}
                            >
                                {percent1}%
                            </motion.span>
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`text-4xl md:text-5xl font-bold ${percent2 > percent1 ? 'text-gvc-gold' : 'text-gray-600'}`}
                            >
                                {percent2}%
                            </motion.span>
                        </div>
                        {/* Wide progress bar */}
                        <div className="h-6 bg-[#222] rounded-xl overflow-hidden flex mb-4">
                            <motion.div
                                initial={{ width: '50%' }}
                                animate={{ width: `${percent1}%` }}
                                transition={{ duration: 0.5 }}
                                className={`h-full rounded-xl ${percent1 >= percent2
                                    ? 'bg-gradient-to-r from-gvc-gold to-yellow-500'
                                    : 'bg-gradient-to-r from-gray-600 to-gray-500'
                                    }`}
                            />
                            <motion.div
                                initial={{ width: '50%' }}
                                animate={{ width: `${percent2}%` }}
                                transition={{ duration: 0.5 }}
                                className={`h-full ${percent2 > percent1
                                    ? 'bg-gradient-to-r from-gvc-gold to-yellow-500'
                                    : 'bg-gradient-to-r from-gray-600 to-gray-500'
                                    }`}
                            />
                        </div>
                        {/* Vote count centered */}
                        <div className="text-center text-gray-500 text-sm uppercase tracking-widest">
                            {totalVotes} Total Vote{totalVotes !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Success pill */}
                    {hasVoted && (
                        <div className="text-center mt-6">
                            <div className="inline-flex items-center gap-3 bg-gvc-gold text-black font-bold px-6 py-3 rounded-lg text-base">
                                <span className="text-xl">✓</span>
                                <span>YOUR VOTE IS IN!</span>
                            </div>
                            <div className="text-gray-600 text-sm mt-3">Come back later for a new matchup</div>
                        </div>
                    )}
                </div>

                {/* Shaka Footer */}
                <div className="flex justify-center mt-10 mb-6 opacity-90 hover:opacity-100 transition-opacity animate-pulse">
                    <img
                        src="/shaka-footer.png"
                        alt="Good Vibes Club"
                        className="w-10 h-10 md:w-20 md:h-20 object-contain"
                    />
                </div>
            </div>
        </main>
    );
}
