'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getIpfsUrl } from '@/lib/ipfs';
import { formatDistanceToNow } from 'date-fns';

interface GvcDetails {
    character: any;
    stats: {
        allTime: { wins: number; losses: number; matches: number };
        weekly: { wins: number; losses: number; matches: number };
        rank: number | string;
    };
    history: Array<{
        opponentId: number;
        result: 'W' | 'L';
        timestamp: number;
        opponent: { id: number; name: string; url: string } | null;
    }>;
}

export default function GvcDetailPage() {
    const params = useParams();
    const [data, setData] = useState<GvcDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (params.id) {
            fetch(`/api/gvc/${params.id}`)
                .then(res => {
                    if (!res.ok) throw new Error('GVC not found');
                    return res.json();
                })
                .then(setData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    if (loading) return <div className="min-h-screen bg-black text-gvc-gold flex items-center justify-center font-display text-2xl animate-pulse">LOADING VIBES...</div>;
    if (error || !data) return <div className="min-h-screen bg-black text-red-500 flex flex-col gap-4 items-center justify-center font-display text-2xl">
        <div>{error || 'Error loading data'}</div>
        <Link href="/lookup" className="text-sm bg-white/10 px-4 py-2 rounded-lg text-white font-mono">Typo? Try Again</Link>
    </div>;

    const { character, stats, history } = data;
    const winRate = stats.allTime.matches > 0 ? Math.round((stats.allTime.wins / stats.allTime.matches) * 100) : 0;

    return (
        <main className="min-h-screen bg-black text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Navigation */}
                <div className="flex justify-between items-center mb-12">
                    <Link
                        href="/"
                        className="px-4 md:px-6 py-3 md:py-4 bg-[#111] text-gray-400 hover:text-white hover:bg-[#222] rounded-lg font-bold uppercase text-[11px] md:text-sm tracking-wide transition-all border border-transparent hover:border-white/20 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                        BACK
                    </Link>
                    <Link
                        href="/lookup"
                        className="bg-[#5C5228] text-[#DDD] hover:text-white hover:bg-[#6D6230] transition-colors border border-[#7D7036] px-6 py-3 rounded-lg font-bold uppercase text-xs md:text-sm tracking-wide"
                    >
                        LOOKUP AGAIN
                    </Link>
                </div>

                {/* Profile Header */}
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-16">
                    {/* Image */}
                    <div className="relative w-64 h-64 md:w-80 md:h-80 shrink-0">
                        <div className="absolute inset-0 bg-gvc-gold/20 blur-3xl rounded-full"></div>
                        <img
                            src={getIpfsUrl(character.url, character.id)}
                            alt={character.name}
                            className="relative w-full h-full object-cover rounded-3xl border-4 border-white/10 shadow-2xl"
                        />
                        <div className="absolute -bottom-4 -right-4 bg-black border border-white/20 text-white px-4 py-1 rounded-full font-mundial text-sm">
                            #{character.id}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 w-full text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-display text-white mb-2">{character.name}</h1>
                        <div className="text-gray-400 font-mundial text-sm mb-8 break-all">
                            OWNER: <a
                                href={`https://opensea.io/assets/ethereum/0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4/${character.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gvc-gold hover:underline hover:text-white transition-colors"
                            >
                                {character.owner}
                            </a>
                        </div>

                        {/* Stats - Hero +/- Layout */}
                        <div className="grid grid-cols-[1fr_2fr] gap-4">
                            {/* Hero +/- */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-[#0a1a0a] to-[#111] border border-green-500/20 rounded-2xl p-8 flex flex-col justify-center items-center text-center">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.05)_0%,transparent_60%)]" />
                                <div className="relative z-10">
                                    <div className="text-green-400 text-[0.65rem] font-bold uppercase tracking-[3px] mb-2">Plus / Minus</div>
                                    <div className={`text-5xl font-display font-bold ${stats.allTime.wins - stats.allTime.losses > 0 ? 'text-green-400' : stats.allTime.wins - stats.allTime.losses < 0 ? 'text-red-400' : 'text-gray-400'}`} style={{ textShadow: '0 0 30px rgba(74,222,128,0.3)' }}>
                                        {stats.allTime.wins - stats.allTime.losses > 0 ? '+' : ''}{stats.allTime.wins - stats.allTime.losses}
                                    </div>
                                    <div className="text-gray-600 text-xs font-mundial mt-2">{stats.allTime.wins}W — {stats.allTime.losses}L</div>
                                </div>
                            </div>
                            {/* Side Stats */}
                            <div className="grid grid-cols-2 grid-rows-3 gap-2">
                                {/* Rank - spans full width */}
                                <div className="col-span-2 bg-gradient-to-r from-[#1a1500] to-[#111] border border-yellow-500/15 rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div className="text-gray-500 text-[0.6rem] font-bold uppercase tracking-wider">Rank</div>
                                    <div className="text-xl font-display text-gvc-gold">#{stats.rank}</div>
                                </div>
                                <div className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div className="text-gray-600 text-[0.6rem] font-bold uppercase tracking-wider">Win Rate</div>
                                    <div className={`text-xl font-display ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{winRate}%</div>
                                </div>
                                <div className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div className="text-gray-600 text-[0.6rem] font-bold uppercase tracking-wider">Matches</div>
                                    <div className="text-xl font-display text-white">{stats.allTime.matches}</div>
                                </div>
                                <div className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div className="text-gray-600 text-[0.6rem] font-bold uppercase tracking-wider">Wins</div>
                                    <div className="text-xl font-display text-gvc-gold">{stats.allTime.wins}</div>
                                </div>
                                <div className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div className="text-gray-600 text-[0.6rem] font-bold uppercase tracking-wider">Losses</div>
                                    <div className="text-xl font-display text-gray-400">{stats.allTime.losses}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Match History */}
                <div className="w-full">
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
                                            <Link href={`/gvc/${match.opponentId}`} className="text-white font-display hover:text-gvc-gold transition-colors">
                                                {match.opponent?.name || `GVC #${match.opponentId}`}
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

                                        {match.opponent && (
                                            <Link href={`/gvc/${match.opponentId}`} className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                                                <img
                                                    src={getIpfsUrl(match.opponent.url, match.opponent.id)}
                                                    alt={match.opponent.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
