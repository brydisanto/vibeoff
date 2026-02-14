'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOwnerDisplayAndLink } from '@/lib/opensea';

interface DuoData {
    id: string;
    gvc1: { id: number; name: string; url: string };
    gvc2: { id: number; name: string; url: string };
    owner: string;
    wins: number;
    losses: number;
    matches: number;
    winRate: number;
    elo: number;
}

interface OwnerData {
    address: string;
    username: string | null;
    display: string;
}

export default function HallOfDuosPage() {
    const [duos, setDuos] = useState<DuoData[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvedOwners, setResolvedOwners] = useState<Record<string, OwnerData>>({});

    // Fetch DUOS Leaderboard
    useEffect(() => {
        setLoading(true);
        fetch('/api/duos/leaderboard')
            .then(res => res.json())
            .then(data => {
                if (data.duos) {
                    setDuos(data.duos.slice(0, 25)); // Top 25
                }
            })
            .catch(err => console.error("Failed to load DUOS leaderboard", err))
            .finally(() => setLoading(false));
    }, []);

    // Fetch resolved usernames for DUO owners
    // We use fetchNftOwner for GVC1 because OpenSea returns owner username
    useEffect(() => {
        if (duos.length === 0) return;

        // Fetch owner info for each duo's first GVC
        duos.forEach(duo => {
            if (resolvedOwners[duo.id]) return; // Already fetched

            // Import dynamically to avoid issues
            import('@/lib/opensea').then(({ fetchNftOwner }) => {
                fetchNftOwner(duo.gvc1.id).then(ownerData => {
                    if (ownerData) {
                        setResolvedOwners(prev => ({
                            ...prev,
                            [duo.id]: {
                                address: ownerData.address,
                                username: ownerData.username,
                                display: ownerData.username || formatAddress(ownerData.address)
                            }
                        }));
                    }
                });
            });
        });
    }, [duos]);

    const formatAddress = (address: string) => {
        if (!address) return '...';
        if (address.startsWith('0x')) {
            return `${address.slice(0, 6)}...${address.slice(-4)}`;
        }
        return address;
    };

    const getOwnerDisplay = (duo: DuoData) => {
        const resolved = resolvedOwners[duo.id];
        if (resolved) {
            const link = resolved.username || resolved.address;
            return { name: resolved.display, url: `https://opensea.io/${link}` };
        }
        // Fallback to raw owner
        return { name: formatAddress(duo.owner), url: `https://opensea.io/${duo.owner}` };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-gvc-gold flex items-center justify-center font-display text-2xl animate-pulse">
                LOADING HALL OF DUOS...
            </div>
        );
    }

    if (duos.length === 0) {
        return (
            <div className="min-h-screen bg-black text-gvc-gold flex items-center justify-center font-display text-2xl">
                NO DUOS FOUND
            </div>
        );
    }

    const first = duos[0];
    const second = duos[1];
    const third = duos[2];
    const runnersUp = duos.slice(3);

    // DUO Card component for podium
    const DuoCard = ({ duo, rank }: { duo: DuoData; rank: number }) => {
        const isFirst = rank === 1;
        const isSecond = rank === 2;
        const isThird = rank === 3;

        const borderColor = isFirst ? 'border-gvc-gold' : isSecond ? 'border-gray-400' : 'border-[#CD7F32]';
        const glowColor = isFirst ? 'shadow-[0_0_80px_rgba(255,204,77,0.5)]' : isSecond ? 'shadow-[0_0_40px_rgba(192,192,192,0.3)]' : 'shadow-[0_0_40px_rgba(205,127,50,0.3)]';
        const bgGradient = isFirst ? 'from-gvc-gold via-gvc-gold to-yellow-600' : isSecond ? 'from-gray-800 to-[#1a1a1a]' : 'from-[#8B4513] to-[#1a1a1a]';
        const textColor = isFirst ? 'text-black' : 'text-white';
        const recordColor = isFirst ? 'text-black' : isSecond ? 'text-gray-300' : 'text-[#CD7F32]';

        return (
            <div className={`block relative bg-[#111] ${isFirst ? 'rounded-3xl border-4' : 'rounded-2xl border-3'} overflow-hidden ${borderColor} w-full hover:scale-105 transition-transform duration-300 ${glowColor}`}>
                {/* Duo Images - Stacked */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-black relative z-10 pointer-events-none">
                    <div className="relative aspect-square rounded-lg overflow-hidden">
                        <Image
                            src={duo.gvc1.url}
                            alt={duo.gvc1.name}
                            fill
                            className="object-cover"
                            sizes="150px"
                            unoptimized
                        />
                    </div>
                    <div className="relative aspect-square rounded-lg overflow-hidden">
                        <Image
                            src={duo.gvc2.url}
                            alt={duo.gvc2.name}
                            fill
                            className="object-cover"
                            sizes="150px"
                            unoptimized
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className={`p-4 text-center bg-gradient-to-b ${bgGradient} relative z-10 pointers-events-none`}>
                    <h2 className={`text-lg md:text-xl font-display ${textColor} mb-1 leading-tight truncate`}>
                        GVC #{duo.gvc1.id} + #{duo.gvc2.id}
                    </h2>
                    <div className={`text-4xl md:text-5xl font-display ${recordColor} mb-1`}>
                        {duo.wins}-{duo.losses} <span className={`text-2xl ${duo.wins - duo.losses > 0 ? (isFirst ? 'text-black/70' : 'text-green-400') : duo.wins - duo.losses < 0 ? 'text-red-400' : 'text-gray-400'}`}>({duo.wins - duo.losses > 0 ? '+' : ''}{duo.wins - duo.losses})</span>
                    </div>
                    {isFirst ? (
                        <div className="inline-block bg-black text-gvc-gold px-4 py-1 rounded-full font-bold text-lg mb-2">
                            {duo.winRate}% WIN RATE
                        </div>
                    ) : (
                        <div className="text-lg text-white font-mono mb-2">
                            ({duo.winRate}% Win Rate)
                        </div>
                    )}
                    <div className={`text-xs ${isFirst ? 'text-black/70' : 'text-gray-500'} font-mono pointer-events-auto`}>
                        OWNER: <a
                            href={getOwnerDisplay(duo).url}
                            target="_blank"
                            rel="noreferrer"
                            className={`${isFirst ? 'text-black hover:text-white' : 'text-gray-400 hover:text-white'} transition-colors relative z-20`}
                        >
                            {getOwnerDisplay(duo).name}
                        </a>
                    </div>
                </div>

                {/* Full Card Link Overlay */}
                <Link href={`/duos/${duo.id}`} className="absolute inset-0 z-0" aria-label={`View Duo ${duo.id}`} />
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-black text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <div className="w-full flex justify-start mb-6">
                    <Link
                        href="/duos"
                        className="px-4 md:px-6 py-3 md:py-4 bg-[#111] text-gray-400 hover:text-white hover:bg-[#222] rounded-lg font-bold uppercase text-[11px] md:text-sm tracking-wide transition-all border border-transparent hover:border-white/20 flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        BACK TO DUOS
                    </Link>
                </div>

                {/* Header */}
                <div className="flex flex-col items-center mb-32">
                    <p className="text-gvc-gold font-bold font-mundial tracking-wider md:tracking-widest text-[10px] md:text-sm mb-4 uppercase text-center whitespace-nowrap">
                        Curate. Dominate. Bask In The Glory.
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
                        HALL OF DUOS
                    </motion.h1>
                </div>

                {/* Top 3 Podium */}
                {first && (
                    <div className="flex flex-col md:flex-row justify-center items-end gap-8 mb-20 relative px-4">

                        {/* 2nd Place (Left) */}
                        {second && (
                            <div className="order-2 md:order-1 w-full md:w-72 relative flex flex-col items-center">
                                <div className="text-gray-300 font-display text-3xl mb-3">🥈 #2</div>
                                <DuoCard duo={second} rank={2} />
                            </div>
                        )}

                        {/* 1st Place (Center) */}
                        <div className="order-1 md:order-2 w-full md:w-96 relative -mt-12 md:-mt-24 z-10 flex flex-col items-center">
                            <div className="text-gvc-gold font-display text-3xl mb-3 animate-bounce">👑 KING OF DUOS 👑</div>
                            <DuoCard duo={first} rank={1} />
                        </div>

                        {/* 3rd Place (Right) */}
                        {third && (
                            <div className="order-3 w-full md:w-72 relative flex flex-col items-center">
                                <div className="text-[#CD7F32] font-display text-3xl mb-3">🥉 #3</div>
                                <DuoCard duo={third} rank={3} />
                            </div>
                        )}
                    </div>
                )}

                {/* Runners Up (4-25) */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {runnersUp.map((duo, index) => {
                        const rank = index + 4;

                        return (
                            <div key={duo.id} className="relative group opacity-90 hover:opacity-100 transition-opacity">
                                <div className="block relative bg-[#111] rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-colors">
                                    {/* Rank Badge */}
                                    <div className="absolute top-2 left-2 z-10 w-8 h-8 flex items-center justify-center rounded-full font-mono text-sm border bg-black/80 text-white border-white/20">
                                        #{rank}
                                    </div>

                                    {/* Duo Images */}
                                    <div className="grid grid-cols-2 gap-2 p-3 bg-black relative z-10 pointer-events-none">
                                        <div className="relative aspect-square rounded-lg overflow-hidden">
                                            <Image
                                                src={duo.gvc1.url}
                                                alt={duo.gvc1.name}
                                                fill
                                                className="object-cover"
                                                sizes="100px"
                                                unoptimized
                                            />
                                        </div>
                                        <div className="relative aspect-square rounded-lg overflow-hidden">
                                            <Image
                                                src={duo.gvc2.url}
                                                alt={duo.gvc2.name}
                                                fill
                                                className="object-cover"
                                                sizes="100px"
                                                unoptimized
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="p-4 text-center relative z-10 pointer-events-none">
                                        <h2 className="text-sm font-display text-gray-200 mb-1 truncate">
                                            GVC #{duo.gvc1.id} + #{duo.gvc2.id}
                                        </h2>
                                        <div className="text-3xl font-display text-white mb-1">
                                            {duo.wins}-{duo.losses} <span className={`text-xl ${duo.wins - duo.losses > 0 ? 'text-green-400' : duo.wins - duo.losses < 0 ? 'text-red-400' : 'text-gray-400'}`}>({duo.wins - duo.losses > 0 ? '+' : ''}{duo.wins - duo.losses})</span>
                                        </div>
                                        <div className="text-sm font-mono text-gray-400 mb-2">
                                            ({duo.winRate}% Win Rate)
                                        </div>
                                        <div className="text-xs text-gray-600 font-mono pointer-events-auto">
                                            OWNER: <a
                                                href={getOwnerDisplay(duo).url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-gray-400 hover:text-gvc-gold transition-colors relative z-20"
                                            >
                                                {getOwnerDisplay(duo).name}
                                            </a>
                                        </div>
                                    </div>

                                    {/* Link Overlay */}
                                    <Link href={`/duos/${duo.id}`} className="absolute inset-0 z-0" aria-label={`View Duo ${duo.id}`} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
