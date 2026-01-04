'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchNftOwner, getOwnerDisplayAndLink } from '@/lib/opensea';

interface HistoryEntry {
    date: string;
    char1: { id: number; name: string; url: string } | null;
    char2: { id: number; name: string; url: string } | null;
    winner: { id: number; name: string; url: string } | null;
    votes: { char1: number; char2: number };
    isTie: boolean;
}

interface OwnerData {
    address: string;
    username: string | null;
    display: string;
}

const OPENSEA_CONTRACT = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';

export default function DailyHistoryPage() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [owners, setOwners] = useState<Record<number, OwnerData>>({});

    useEffect(() => {
        fetch('/api/daily/history?limit=50')
            .then(res => res.json())
            .then(data => {
                if (data.history) {
                    setHistory(data.history);

                    // Fetch owners for all characters
                    const charIds = new Set<number>();
                    data.history.forEach((entry: HistoryEntry) => {
                        if (entry.char1) charIds.add(entry.char1.id);
                        if (entry.char2) charIds.add(entry.char2.id);
                    });

                    charIds.forEach(async (id) => {
                        const ownerData = await fetchNftOwner(id);
                        if (ownerData) {
                            setOwners(prev => ({ ...prev, [id]: ownerData }));
                        }
                    });
                }
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load history');
            })
            .finally(() => setLoading(false));
    }, []);

    const getOwnerInfo = (charId: number) => {
        const owner = owners[charId];
        if (!owner) return { display: '...', link: null };
        return getOwnerDisplayAndLink(owner, owner.address);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-gvc-gold text-2xl font-display animate-pulse">
                    LOADING HISTORY...
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <Link
                        href="/daily"
                        className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#252525] transition-all font-bold text-[11px] md:text-sm uppercase tracking-wider border border-transparent hover:border-white/30"
                    >
                        ← BACK
                    </Link>
                    <Link
                        href="/"
                        className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#252525] transition-all font-bold text-[11px] md:text-sm uppercase tracking-wider border border-transparent hover:border-white/30"
                    >
                        HOME
                    </Link>
                </div>

                {/* Title */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-display text-gvc-gold mb-2">
                        DAILY VIBE OFF HISTORY
                    </h1>
                    <p className="text-gray-400">
                        Previous daily matchups and their winners
                    </p>
                </div>

                {/* No history */}
                {history.length === 0 && !error && (
                    <div className="text-center py-20">
                        <div className="text-gray-500 text-xl">No matchups recorded yet.</div>
                        <div className="text-gray-600 text-sm mt-2">
                            Check back after the first daily matchup completes!
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-center py-20">
                        <div className="text-red-500 text-xl">{error}</div>
                    </div>
                )}

                {/* History List */}
                <div className="space-y-6">
                    {history.map((entry) => {
                        const totalVotes = entry.votes.char1 + entry.votes.char2;
                        const percent1 = totalVotes > 0 ? Math.round((entry.votes.char1 / totalVotes) * 100) : 50;
                        const percent2 = totalVotes > 0 ? Math.round((entry.votes.char2 / totalVotes) * 100) : 50;
                        const isChar1Winner = entry.winner?.id === entry.char1?.id;
                        const isChar2Winner = entry.winner?.id === entry.char2?.id;

                        const owner1Info = entry.char1 ? getOwnerInfo(entry.char1.id) : null;
                        const owner2Info = entry.char2 ? getOwnerInfo(entry.char2.id) : null;

                        return (
                            <div
                                key={entry.date}
                                className="bg-[#111] rounded-xl border border-white/10 overflow-hidden"
                            >
                                {/* Date Header */}
                                <div className="bg-[#0a0a0a] border-b border-white/5 px-6 py-3 flex justify-between items-center">
                                    <div className="text-gvc-gold font-mono text-sm">
                                        {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="text-gray-500 text-xs">
                                        {totalVotes} votes
                                    </div>
                                </div>

                                {/* Matchup - Taller panels */}
                                <div className="p-4 md:p-6">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
                                        {/* Char 1 */}
                                        {entry.char1 && (
                                            <div className={`flex-1 flex w-full md:w-auto items-center justify-center md:justify-start gap-4 md:gap-4 ${isChar1Winner ? 'opacity-100' : 'opacity-60'
                                                }`}>
                                                <a
                                                    href={`https://opensea.io/assets/ethereum/${OPENSEA_CONTRACT}/${entry.char1.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`relative w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden border-2 hover:scale-105 transition-transform flex-shrink-0 ${isChar1Winner
                                                        ? 'border-gvc-gold shadow-[0_0_15px_rgba(255,204,77,0.3)]'
                                                        : 'border-white/10 hover:border-white/30'
                                                        }`}
                                                >
                                                    <Image
                                                        src={entry.char1.url}
                                                        alt={entry.char1.name}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                    {isChar1Winner && (
                                                        <div className="absolute top-1 right-1 bg-gvc-gold text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                                            Winner
                                                        </div>
                                                    )}
                                                </a>
                                                <div className="min-w-0 flex-1">
                                                    <a
                                                        href={`https://opensea.io/assets/ethereum/${OPENSEA_CONTRACT}/${entry.char1.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`font-display text-lg md:text-base hover:text-gvc-gold transition-colors block truncate ${isChar1Winner ? 'text-gvc-gold' : 'text-white'
                                                            }`}
                                                    >
                                                        {entry.char1.name}
                                                    </a>
                                                    <div className={`font-bold text-2xl md:text-xl ${isChar1Winner ? 'text-gvc-gold' : 'text-gray-400'
                                                        }`}>
                                                        {entry.votes.char1}
                                                        <span className="text-gray-500 text-sm ml-1">({percent1}%)</span>
                                                    </div>
                                                    {/* Owner */}
                                                    <div className="text-xs text-gray-500 font-mono mt-1 truncate">
                                                        OWNER: {owner1Info?.link ? (
                                                            <a
                                                                href={`https://opensea.io/${owner1Info.link}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-gray-400 hover:text-gvc-gold transition-colors"
                                                            >
                                                                {owner1Info.display}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400">{owner1Info?.display || '...'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* VS */}
                                        <div className="text-gray-600 font-display text-2xl px-2 py-2 md:py-0">
                                            VS
                                        </div>

                                        {/* Char 2 */}
                                        {entry.char2 && (
                                            <div className={`flex-1 flex w-full md:w-auto items-center justify-center md:justify-end gap-4 md:gap-4 ${isChar2Winner ? 'opacity-100' : 'opacity-60'
                                                }`}>
                                                <div className="text-right min-w-0 flex-1">
                                                    <a
                                                        href={`https://opensea.io/assets/ethereum/${OPENSEA_CONTRACT}/${entry.char2.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`font-display text-lg md:text-base hover:text-gvc-gold transition-colors block truncate ${isChar2Winner ? 'text-gvc-gold' : 'text-white'
                                                            }`}
                                                    >
                                                        {entry.char2.name}
                                                    </a>
                                                    <div className={`font-bold text-2xl md:text-xl ${isChar2Winner ? 'text-gvc-gold' : 'text-gray-400'
                                                        }`}>
                                                        {entry.votes.char2}
                                                        <span className="text-gray-500 text-sm ml-1">({percent2}%)</span>
                                                    </div>
                                                    {/* Owner */}
                                                    <div className="text-xs text-gray-500 font-mono mt-1 truncate">
                                                        OWNER: {owner2Info?.link ? (
                                                            <a
                                                                href={`https://opensea.io/${owner2Info.link}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-gray-400 hover:text-gvc-gold transition-colors"
                                                            >
                                                                {owner2Info.display}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400">{owner2Info?.display || '...'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <a
                                                    href={`https://opensea.io/assets/ethereum/${OPENSEA_CONTRACT}/${entry.char2.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`relative w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden border-2 hover:scale-105 transition-transform flex-shrink-0 ${isChar2Winner
                                                        ? 'border-gvc-gold shadow-[0_0_15px_rgba(255,204,77,0.3)]'
                                                        : 'border-white/10 hover:border-white/30'
                                                        }`}
                                                >
                                                    <Image
                                                        src={entry.char2.url}
                                                        alt={entry.char2.name}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                    {isChar2Winner && (
                                                        <div className="absolute top-1 right-1 bg-gvc-gold text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                                            Winner
                                                        </div>
                                                    )}
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Vote Bar */}
                                    <div className="mt-4 h-2 bg-[#222] rounded-full overflow-hidden flex">
                                        <div
                                            className={`h-full transition-all duration-300 ${isChar1Winner ? 'bg-gvc-gold' : 'bg-gray-600'
                                                }`}
                                            style={{ width: `${percent1}%` }}
                                        />
                                        <div
                                            className={`h-full transition-all duration-300 ${isChar2Winner ? 'bg-gvc-gold' : 'bg-gray-600'
                                                }`}
                                            style={{ width: `${percent2}%` }}
                                        />
                                    </div>

                                    {/* Tie indicator */}
                                    {entry.isTie && (
                                        <div className="text-center mt-3">
                                            <span className="text-gray-500 text-sm">TIE</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
