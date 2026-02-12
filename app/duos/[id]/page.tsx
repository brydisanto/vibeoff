'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getIpfsUrl } from '@/lib/ipfs';
import { formatDistanceToNow } from 'date-fns';

interface DuoDetails {
    duo: {
        id: string;
        gvc1: { id: number; name: string; url: string };
        gvc2: { id: number; name: string; url: string };
        owner: string;
    };
    stats: {
        wins: number;
        losses: number;
        matches: number;
        winRate: number;
        elo: number;
        rank: number | string;
    };
    history: Array<{
        opponentId: string;
        opponentGvc1: { id: number; name: string; url: string } | null;
        opponentGvc2: { id: number; name: string; url: string } | null;
        result: 'W' | 'L';
        timestamp: number;
    }>;
    totalDuos: number;
}

export default function DuoDetailPage() {
    const params = useParams();
    const [data, setData] = useState<DuoDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (params.id) {
            fetch(`/api/duos/${params.id}`)
                .then(res => {
                    if (!res.ok) throw new Error('DUO not found');
                    return res.json();
                })
                .then(setData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    const formatOwner = (owner: string) => {
        if (!owner) return '...';
        if (owner.endsWith('.eth')) return owner;
        if (owner.startsWith('0x')) {
            return `${owner.slice(0, 6)}...${owner.slice(-4)}`;
        }
        return owner.length > 15 ? `${owner.slice(0, 12)}...` : owner;
    };

    if (loading) return <div className="min-h-screen bg-black text-gvc-gold flex items-center justify-center font-display text-2xl animate-pulse">LOADING DUO...</div>;
    if (error || !data) return <div className="min-h-screen bg-black text-red-500 flex flex-col gap-4 items-center justify-center font-display text-2xl">
        <div>{error || 'Error loading data'}</div>
        <Link href="/duos/lookup" className="text-sm bg-white/10 px-4 py-2 rounded-lg text-white font-mono">Typo? Try Again</Link>
    </div>;

    const { duo, stats, history, totalDuos } = data;

    return (
        <main className="min-h-screen bg-black bg-[url('/grid.svg')] bg-center text-white">
            {/* Hero Section */}
            <div>
                <div className="max-w-4xl mx-auto px-4 pt-6 pb-10 md:pt-8 md:pb-14">
                    {/* Navigation */}
                    <div className="flex justify-between items-center mb-10 md:mb-14">
                        <Link
                            href="/duos"
                            className="px-4 md:px-6 py-3 md:py-4 bg-black/50 backdrop-blur text-gray-400 hover:text-white hover:bg-black/70 rounded-lg font-bold uppercase text-[11px] md:text-sm tracking-wide transition-all border border-white/10 hover:border-white/20 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                            BACK
                        </Link>
                        <Link
                            href="/duos/lookup"
                            className="bg-black/50 backdrop-blur text-gray-400 hover:text-white hover:bg-black/70 transition-colors border border-white/10 hover:border-white/20 px-6 py-3 rounded-lg font-bold uppercase text-xs md:text-sm tracking-wide"
                        >
                            LOOKUP
                        </Link>
                    </div>

                    {/* Title */}
                    <h1 className="text-center font-display text-4xl md:text-6xl lg:text-7xl text-white mb-8 md:mb-12">
                        GVC #{duo.gvc1.id} <span className="text-white">+</span> #{duo.gvc2.id}
                    </h1>

                    {/* Large GVC Images */}
                    <div className="flex justify-center gap-4 md:gap-8 mb-8">
                        <div className="relative w-56 h-56 md:w-80 md:h-80 lg:w-96 lg:h-96">
                            <Image
                                src={getIpfsUrl(duo.gvc1.url, 2)}
                                alt={duo.gvc1.name}
                                fill
                                className="object-cover rounded-2xl border-2 border-white/20 shadow-2xl"
                            />
                        </div>
                        <div className="relative w-56 h-56 md:w-80 md:h-80 lg:w-96 lg:h-96">
                            <Image
                                src={getIpfsUrl(duo.gvc2.url, 2)}
                                alt={duo.gvc2.name}
                                fill
                                className="object-cover rounded-2xl border-2 border-white/20 shadow-2xl"
                            />
                        </div>
                    </div>

                    {/* Owner */}
                    <div className="text-center mb-10">
                        <span className="text-gray-500 font-mono text-sm">OWNER: </span>
                        <a
                            href={`https://opensea.io/${duo.owner}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gvc-gold hover:underline hover:text-white transition-colors font-mono text-sm"
                        >
                            {formatOwner(duo.owner)}
                        </a>
                    </div>

                    {/* Stats - Hero +/- Layout */}
                    <div className="grid grid-cols-[1fr_2fr] gap-4">
                        {/* Hero +/- */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#0a1a0a] to-[#111] border border-green-500/20 rounded-2xl p-8 flex flex-col justify-center items-center text-center">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.05)_0%,transparent_60%)]" />
                            <div className="relative z-10">
                                <div className="text-green-400 text-[0.65rem] font-bold uppercase tracking-[3px] mb-2">Plus / Minus</div>
                                <div className={`text-5xl font-display font-bold ${stats.wins - stats.losses > 0 ? 'text-green-400' : stats.wins - stats.losses < 0 ? 'text-red-400' : 'text-gray-400'}`} style={{ textShadow: '0 0 30px rgba(74,222,128,0.3)' }}>
                                    {stats.wins - stats.losses > 0 ? '+' : ''}{stats.wins - stats.losses}
                                </div>
                                <div className="text-gray-600 text-xs font-mundial mt-2">{stats.wins}W — {stats.losses}L</div>
                            </div>
                        </div>
                        {/* Side Stats */}
                        <div className="grid grid-cols-2 grid-rows-3 gap-2">
                            {/* Rank - spans full width */}
                            <div className="col-span-2 bg-gradient-to-r from-[#1a1500] to-[#111] border border-yellow-500/15 rounded-xl px-4 py-3 flex items-center justify-between">
                                <div className="text-gray-500 text-[0.6rem] font-bold uppercase tracking-wider">Rank</div>
                                <div className="text-xl font-display text-gvc-gold">#{stats.rank} <span className="text-xs text-gray-600 font-mundial">of {totalDuos}</span></div>
                            </div>
                            <div className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                                <div className="text-gray-600 text-[0.6rem] font-bold uppercase tracking-wider">Win Rate</div>
                                <div className={`text-xl font-display ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{stats.winRate}%</div>
                            </div>
                            <div className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                                <div className="text-gray-600 text-[0.6rem] font-bold uppercase tracking-wider">Matches</div>
                                <div className="text-xl font-display text-white">{stats.matches}</div>
                            </div>
                            <div className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                                <div className="text-gray-600 text-[0.6rem] font-bold uppercase tracking-wider">Wins</div>
                                <div className="text-xl font-display text-gvc-gold">{stats.wins}</div>
                            </div>
                            <div className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                                <div className="text-gray-600 text-[0.6rem] font-bold uppercase tracking-wider">Losses</div>
                                <div className="text-xl font-display text-gray-400">{stats.losses}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Match History Section */}
            <div className="max-w-4xl mx-auto px-4 py-10">
                <h3 className="text-xl font-display text-gray-400 mb-6 flex items-center gap-2">
                    RECENT BATTLES
                    <span className="text-xs bg-white/10 text-gray-500 px-2 py-0.5 rounded-full font-sans">LAST 50</span>
                </h3>

                <div className="space-y-2">
                    {history.length === 0 ? (
                        <div className="text-center py-12 bg-[#111] rounded-2xl border border-white/5 text-gray-500 font-mono">
                            No recent battles recorded.
                        </div>
                    ) : (
                        history.map((match, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#111] hover:bg-[#1a1a1a] p-3 rounded-xl border border-white/5 transition-colors group">
                                {/* Result */}
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold font-mono ${match.result === 'W' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                        }`}>
                                        {match.result}
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 font-bold uppercase">
                                            {match.result === 'W' ? 'Won against' : 'Lost to'}
                                        </span>
                                        <Link href={`/duos/${match.opponentId}`} className="text-white font-display hover:text-gvc-gold transition-colors">
                                            {match.opponentGvc1 && match.opponentGvc2
                                                ? `#${match.opponentGvc1.id} + #${match.opponentGvc2.id}`
                                                : match.opponentId}
                                        </Link>
                                    </div>
                                </div>

                                {/* Opponent & Time */}
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden md:block">
                                        <div className="text-xs text-gray-500 font-mono">
                                            {formatDistanceToNow(match.timestamp, { addSuffix: true })}
                                        </div>
                                    </div>

                                    {match.opponentGvc1 && match.opponentGvc2 && (
                                        <Link href={`/duos/${match.opponentId}`} className="flex gap-1">
                                            <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                                                <Image
                                                    src={getIpfsUrl(match.opponentGvc1.url, 2)}
                                                    alt=""
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                                                <Image
                                                    src={getIpfsUrl(match.opponentGvc2.url, 2)}
                                                    alt=""
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
