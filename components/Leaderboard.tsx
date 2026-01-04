import { useState, useEffect, useMemo } from 'react';
import { Character } from '@/lib/data';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { fetchNftOwner, formatDisplayOwner, getOwnerDisplayAndLink, fetchWalletGvcCount } from '@/lib/opensea';
import { getIpfsUrl } from '@/lib/ipfs';

interface LeaderboardProps {
    characters: Character[];
    onClose: () => void;
}

type TimeFrame = 'weekly' | 'allTime';

export default function Leaderboard({ characters: _ignored, onClose }: LeaderboardProps) {
    const [leaderboardData, setLeaderboardData] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'vibes' | 'collectors'>('vibes');
    const [filter, setFilter] = useState<'all' | 'gold' | 'cosmic' | '1/1' | 'beard' | 'grayscale' | 'hoodie' | 'rainbow' | 'plastic' | 'female' | 'ranger'>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [realOwners, setRealOwners] = useState<Record<number, { address: string, username: string | null, display: string }>>({});
    const [walletGvcCounts, setWalletGvcCounts] = useState<Record<string, number>>({});
    const [expandedCollector, setExpandedCollector] = useState<string | null>(null);

    // Fetch Global Leaderboard (Always All Time)
    useEffect(() => {
        setLoading(true);
        fetch(`/api/leaderboard`)
            .then(res => res.json())
            .then(data => {
                if (data.characters) {
                    setLeaderboardData(data.characters);
                }
            })
            .catch(err => console.error("Failed to load leaderboard", err))
            .finally(() => setLoading(false));
    }, []);

    // Filter and Sort
    const sortedChars = [...leaderboardData]
        .filter(char => {
            try {
                if (!char) return false;
                // First apply type filter
                let passesTypeFilter = true;
                if (filter === 'all') passesTypeFilter = true;
                else if (filter === 'beard') passesTypeFilter = char.hasBeard;
                else if (filter === 'grayscale') passesTypeFilter = char.isGrayscale;
                else if (filter === 'hoodie') passesTypeFilter = char.hasHoodie;
                else if (filter === 'gold') passesTypeFilter = char.type === 'Gold';
                else if (filter === 'cosmic') passesTypeFilter = char.type === 'Cosmic';
                else if (filter === '1/1') passesTypeFilter = char.type === '1/1';
                else if (filter === 'rainbow') passesTypeFilter = char.type === 'Rainbow';
                else if (filter === 'plastic') passesTypeFilter = char.isPlastic;
                else if (filter === 'female') passesTypeFilter = char.isFemale;
                else if (filter === 'ranger') passesTypeFilter = char.isRanger;

                if (!passesTypeFilter) return false;

                // Then apply search filter
                if (searchQuery.trim() === '') return true;

                const query = searchQuery.toLowerCase().trim();
                const realOwnerData = realOwners[char.id];

                // Check: 1. Resolved Display Name (ENS), 2. Resolved Address, 3. Fallback/Original Owner Address
                const resolvedDisplay = (realOwnerData?.display || '').toLowerCase();
                const resolvedAddress = (realOwnerData?.address || '').toLowerCase();
                const rawOwner = (char.owner || '').toLowerCase();

                return resolvedDisplay.includes(query) || resolvedAddress.includes(query) || rawOwner.includes(query);
            } catch (e) {
                console.error("Filter error for char", char?.id, e);
                return true;
            }
        })

        .sort((a, b) => {
            const statsA = a.allTime;
            const statsB = b.allTime;

            // Primary sort: Wins (Descending)
            if (statsA.wins !== statsB.wins) return statsB.wins - statsA.wins;

            // Secondary sort: Win Rate
            const rateA = statsA.matches > 0 ? statsA.wins / statsA.matches : 0;
            const rateB = statsB.matches > 0 ? statsB.wins / statsB.matches : 0;
            if (Math.abs(rateA - rateB) > 0.0001) return rateB - rateA;

            // Tertiary sort: ID (Ascending) - STABILITY FIX
            // This ensures the source list is ALWAYS in the same order.
            // Without this, the "first found" character for a collector (bestVibe) changes randomly,
            // causing the Collector Leaderboard to shuffle.
            return a.id - b.id;
        }); // Do not slice yet, we need full list for collector stats

    // Aggregate Collector Stats
    const sortedCollectors = useMemo(() => {
        if (viewMode !== 'collectors') return [];

        // 1. Create a map of "Initial Owner String" -> "Resolved Owner Data"
        const resolvedMap: Record<string, { address: string, username: string | null, display: string }> = {};

        // NEW: Create a Reverse Map of Username -> Address to fix "Splitting"
        // If *any* item resolves "WalletArt" -> "0x123", we want ALL "WalletArt" items to group under "0x123"
        const usernameToAddress: Record<string, string> = {};

        sortedChars.forEach(char => {
            if (realOwners[char.id]) {
                const key = (char.owner || 'Unknown').trim().toLowerCase();
                resolvedMap[key] = realOwners[char.id];
            }
        });

        // Populate reverse map from ALL known owners (current and past fetches)
        Object.values(realOwners).forEach(data => {
            if (data.username && data.address) {
                usernameToAddress[data.username.trim().toLowerCase()] = data.address;
            }
        });

        // (Debug logs removed for production)


        // Helper: Get owner display and link info
        // Display: OpenSea username > wallet address > placeholder
        // Link: username (for nice URL) > wallet address > never ENS
        const getStrictOwner = (charId: number, rawOwner: string): { id: string, display: string, link: string } => {
            const normalizedRaw = (rawOwner || 'Unknown').trim().toLowerCase();
            const data = realOwners[charId] || resolvedMap[normalizedRaw];

            // Case A: We have direct resolution data from OpenSea
            if (data?.address) {
                const address = data.address;
                const username = data.username;

                // If we have a username (and it's not an ENS name), use it for display AND link
                if (username && !username.toLowerCase().endsWith('.eth')) {
                    return { id: username, display: username, link: username };
                }
                // No username, use wallet address for both display and link
                return { id: address, display: formatDisplayOwner(address), link: address };
            }

            // Case B: We know this username maps to an address
            if (usernameToAddress[normalizedRaw]) {
                const address = usernameToAddress[normalizedRaw];
                return { id: address, display: formatDisplayOwner(address), link: address };
            }

            // Case C: Fallback to raw owner
            // If raw owner is an ENS name, DISPLAY it but DON'T link with it (links break with ENS)
            const isENS = normalizedRaw.endsWith('.eth');
            if (isENS) {
                // Show ENS name for display, but empty link (will be populated when resolved)
                return { id: rawOwner, display: rawOwner, link: '' };
            }
            // Raw owner is a wallet address
            if (rawOwner.startsWith('0x')) {
                return { id: rawOwner, display: formatDisplayOwner(rawOwner), link: rawOwner };
            }
            // Unknown format - display as-is
            return { id: rawOwner, display: rawOwner, link: rawOwner };
        };

        // 2. Collect unique wallet addresses that need GVC count fetching
        const addressesToFetch = new Set<string>();
        sortedChars.forEach(char => {
            const realData = realOwners[char.id];
            if (realData?.address) {
                const address = realData.address.toLowerCase();
                if (!walletGvcCounts[address]) {
                    addressesToFetch.add(address);
                }
            }
        });

        // Trigger GVC count fetches for addresses we don't have yet (side effect)
        addressesToFetch.forEach(address => {
            fetchWalletGvcCount(address).then(count => {
                setWalletGvcCounts(prev => ({ ...prev, [address]: count }));
            });
        });


        const map: Record<string, {
            address: string,
            display: string,
            wins: number,
            losses: number,
            matches: number,
            count: number,
            bestVibe: Character | null,
            bestVibeWins: number,
            gvcs: Character[]
        }> = {};

        const BLACKLIST_WALLETS = [
            '0xd0cc2b0efb168bfe1f94a948d8df70fa10257196',
            '0xf41b389e0c1950dc0b16c9498eae77131cc08a56'
        ].map(w => w.toLowerCase());

        sortedChars.forEach(char => {
            // Check blacklist based on real address or raw owner
            const knownAddress = realOwners[char.id]?.address?.toLowerCase();
            const rawOwner = (char.owner || '').toLowerCase();

            if (knownAddress && BLACKLIST_WALLETS.includes(knownAddress)) return;
            if (BLACKLIST_WALLETS.includes(rawOwner)) return;

            const { id, display, link } = getStrictOwner(char.id, char.owner);
            // Clean ID for grouping key
            const groupKey = id.replace(/address\//g, '').trim().toLowerCase();

            // Double check groupKey just in case it is the address
            if (BLACKLIST_WALLETS.includes(groupKey)) return;

            if (!map[groupKey]) {
                map[groupKey] = {
                    address: link || groupKey,
                    display: display,
                    wins: 0,
                    losses: 0,
                    matches: 0,
                    count: 0,
                    bestVibe: null,
                    bestVibeWins: -1,
                    gvcs: []
                };
            }

            // UPDATE display if we now have a better one (resolved username or address)
            // Priority: OpenSea username > shortened wallet address > placeholder
            const currentDisplay = map[groupKey].display;
            const isCurrentPlaceholder = currentDisplay === '—' || currentDisplay === 'Unknown';
            const isNewBetter = display !== '—' && display !== 'Unknown';
            if (isCurrentPlaceholder && isNewBetter) {
                map[groupKey].display = display;
                map[groupKey].address = link || groupKey;
            }

            map[groupKey].wins += char.allTime.wins;
            map[groupKey].losses += char.allTime.losses;
            map[groupKey].matches += char.allTime.matches;
            map[groupKey].gvcs.push(char);

            // Use walletGvcCounts from OpenSea API for accurate holdings
            const realData = realOwners[char.id];
            const holdingsKey = realData?.address?.toLowerCase() || groupKey.toLowerCase();
            map[groupKey].count = walletGvcCounts[holdingsKey] || 0;

            if (char.allTime.wins > map[groupKey].bestVibeWins) {
                map[groupKey].bestVibe = char;
                map[groupKey].bestVibeWins = char.allTime.wins;
            }
        });


        return Object.values(map).sort((a, b) => {
            // 1. Primary: Wins (Descending)
            if (a.wins !== b.wins) return b.wins - a.wins;

            // 2. Secondary: Win Rate (Descending)
            const rateA = a.matches > 0 ? a.wins / a.matches : 0;
            const rateB = b.matches > 0 ? b.wins / b.matches : 0;
            // Float safety check for equality
            if (Math.abs(rateA - rateB) > 0.0001) return rateB - rateA;

            // 3. Tertiary: Stable ID (Ascending)
            // Use bestVibe.id to ensure the order NEVER flickers even if names/addresses resolve later.
            // Fallback to 0 if null (shouldn't happen for collectors with wins)
            return (a.bestVibe?.id || 0) - (b.bestVibe?.id || 0);
        });
    }, [sortedChars, viewMode, realOwners, leaderboardData, walletGvcCounts]);

    // Fetch owners from Redis (synced from OpenSea) for ALL characters
    useEffect(() => {
        if (leaderboardData.length === 0) return;

        // Fetch owners in batches from our Redis cache
        const fetchOwnersFromRedis = async () => {
            const allIds = leaderboardData.map(c => c.id);
            const batchSize = 500;

            for (let i = 0; i < allIds.length; i += batchSize) {
                const batchIds = allIds.slice(i, i + batchSize);
                const idsParam = batchIds.join(',');

                try {
                    const res = await fetch(`/api/owners?ids=${idsParam}`);
                    const data = await res.json();

                    if (data.owners) {
                        setRealOwners(prev => {
                            const next = { ...prev };
                            Object.entries(data.owners).forEach(([idStr, ownerData]: [string, any]) => {
                                if (ownerData) {
                                    next[parseInt(idStr)] = {
                                        address: ownerData.address,
                                        username: ownerData.username,
                                        display: ownerData.username || formatDisplayOwner(ownerData.address)
                                    };
                                }
                            });
                            return next;
                        });
                    }
                } catch (e) {
                    console.error('Failed to fetch owners batch:', e);
                }
            }
        };

        fetchOwnersFromRedis();
    }, [leaderboardData.length]); // Only run when data first loads

    const displayItems = viewMode === 'vibes' ? sortedChars : sortedCollectors;

    return (
        <div className="w-full mx-auto">
            {/* Header - Responsive */}
            <div className="flex flex-col gap-3 mb-4 md:mb-6">
                {/* Title Row */}
                <h2 className="text-xl md:text-3xl font-display text-gvc-gold glowing-text">
                    ALL TIME LEADERBOARD
                </h2>

                {/* Controls Row - Filters + Close */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-2 md:gap-4 items-center">
                        {/* View Mode Toggle */}
                        <div className="bg-black border-2 border-gray-600 rounded-full p-1 flex touch-action-manipulation">
                            <button
                                onClick={() => setViewMode('vibes')}
                                className={`px-3 md:px-6 py-2 md:py-2 rounded-full text-[10px] md:text-xs font-bold font-mundial uppercase tracking-wide transition-all active:scale-95 active:opacity-80 ${viewMode === 'vibes' ? 'bg-[#FFE048] text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                GVC Rankings
                            </button>
                            <button
                                onClick={() => setViewMode('collectors')}
                                className={`px-3 md:px-6 py-2 md:py-2 rounded-full text-[10px] md:text-xs font-bold font-mundial uppercase tracking-wide transition-all active:scale-95 active:opacity-80 ${viewMode === 'collectors' ? 'bg-[#FFE048] text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                Collector Rankings
                            </button>
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`w-11 h-11 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center transition-all active:scale-95 active:opacity-80 touch-action-manipulation
                                    ${isFilterOpen ? 'bg-white border-white text-black' :
                                        filter === 'gold' ? 'bg-gvc-gold border-gvc-gold text-black' :
                                            filter === 'cosmic' ? 'bg-purple-500 border-purple-500 text-white' :
                                                filter === '1/1' ? 'bg-cyan-500 border-cyan-500 text-black' :
                                                    filter === 'beard' ? 'bg-amber-600 border-amber-600 text-white' :
                                                        filter === 'grayscale' ? 'bg-gray-500 border-gray-500 text-white' :
                                                            filter === 'hoodie' ? 'bg-blue-600 border-blue-600 text-white' :
                                                                filter === 'rainbow' ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 border-purple-400 text-white' :
                                                                    filter === 'plastic' ? 'bg-pink-500 border-pink-500 text-white' :
                                                                        filter === 'female' ? 'bg-fuchsia-500 border-fuchsia-500 text-white' :
                                                                            filter === 'ranger' ? 'bg-green-600 border-green-600 text-white' :
                                                                                'bg-black border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                            </button>

                            {isFilterOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                                    <div className="p-1 flex flex-col gap-1">
                                        <button
                                            onClick={() => {
                                                setFilter('all');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            All Vibes
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('1/1');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${filter === '1/1' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>1/1s (Unique)</span>
                                            {filter === '1/1' && <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('beard');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${filter === 'beard' ? 'bg-amber-600/20 text-amber-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>Beards & Staches</span>
                                            {filter === 'beard' && <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('cosmic');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${filter === 'cosmic' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>Cosmic Guardians</span>
                                            {filter === 'cosmic' && <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('female');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${filter === 'female' ? 'bg-fuchsia-500/20 text-fuchsia-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>Females</span>
                                            {filter === 'female' && <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('gold');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${filter === 'gold' ? 'bg-gvc-gold/20 text-gvc-gold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>Golds</span>
                                            {filter === 'gold' && <span className="w-2 h-2 rounded-full bg-gvc-gold animate-pulse" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('grayscale');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${filter === 'grayscale' ? 'bg-gray-500/20 text-gray-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>Grayscales</span>
                                            {filter === 'grayscale' && <span className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('hoodie');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${filter === 'hoodie' ? 'bg-blue-600/20 text-blue-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>Hoodie Ups</span>
                                            {filter === 'hoodie' && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('plastic');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${filter === 'plastic' ? 'bg-pink-500/20 text-pink-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>Plastics</span>
                                            {filter === 'plastic' && <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('rainbow');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${filter === 'rainbow' ? 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 text-purple-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>Rainbows</span>
                                            {filter === 'rainbow' && <span className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('ranger');
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-between active:bg-white/10 ${filter === 'ranger' ? 'bg-green-600/20 text-green-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>Rangers</span>
                                            {filter === 'ranger' && <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Search Button/Input */}
                        <div className="relative flex items-center">
                            {isSearchOpen ? (
                                <div className="flex items-center gap-2 bg-black border-2 border-gvc-gold rounded-full px-3 py-1.5 md:py-1 touch-action-manipulation">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gvc-gold">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.3-4.3" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Wallet or username..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-transparent border-none outline-none text-white text-xs md:text-sm w-32 md:w-48 placeholder-gray-500"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setIsSearchOpen(false);
                                        }}
                                        className="text-gray-400 hover:text-white transition-colors p-2 active:scale-95 touch-action-manipulation"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 6 6 18" />
                                            <path d="m6 6 12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className={`w-11 h-11 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center transition-all active:scale-95 active:opacity-80 bg-black border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 touch-action-manipulation`}
                                >                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.3-4.3" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="bg-[#5C5228] text-[#DDD] hover:text-white hover:bg-[#6D6230] transition-colors border border-[#7D7036] px-4 md:px-6 py-2.5 md:py-2 rounded-full font-bold uppercase text-xs md:text-sm tracking-wide active:scale-95 active:opacity-80 touch-action-manipulation"
                    >
                        Close
                    </button>
                </div>
            </div>

            <div className="w-full bg-[#111] border border-white/20 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Table Header */}
                <div className={`grid ${viewMode === 'vibes'
                    ? 'grid-cols-[24px_32px_1fr_35px_35px_35px_24px] md:grid-cols-[60px_80px_2.5fr_80px_80px_80px_1.5fr_40px]'
                    : 'grid-cols-[24px_32px_1fr_35px_35px_35px_30px] md:grid-cols-[60px_80px_2.5fr_80px_80px_80px_80px_60px]'
                    } gap-1 md:gap-4 px-2 md:px-6 py-2 md:py-3 bg-white/5 border-b border-white/10 text-[8px] md:text-xs font-bold text-gray-400 uppercase tracking-wider`}>

                    {viewMode === 'vibes' ? (
                        <>
                            <div className="text-center">#</div>
                            <div className="">GVC</div>
                            <div className="md:hidden"></div>
                            <div className="hidden md:block pr-4">Name</div>
                            <div className="text-center">Wins</div>
                            <div className="text-center text-gray-400">Losses</div>
                            <div className="text-center">Win%</div>
                            <div className="hidden md:block text-center">Collector</div>
                            <div className="text-center hidden md:block">Link</div>
                            <div className="text-center md:hidden"></div>
                        </>
                    ) : (
                        <>
                            <div className="text-center">#</div>
                            <div className="">MVP</div>
                            <div className="">Collector</div>
                            <div className="text-center">Wins</div>
                            <div className="text-center text-gray-400">Losses</div>
                            <div className="text-center">Win%</div>
                            <div className="text-center hidden md:block">#GVCs</div>
                            <div className="text-center">Link</div>
                        </>
                    )}
                </div>

                {/* List */}
                <div className="max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gvc-gold mb-4"></div>
                            <div className="text-gvc-gold font-display text-xl animate-pulse">LOADING GLOBAL DATA...</div>
                        </div>
                    ) : displayItems.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            No data found.
                        </div>
                    ) : (
                        displayItems.slice(0, 100).map((item: any, index: number) => {
                            const isTop3 = index < 3;

                            if (viewMode === 'collectors') {
                                const collector = item;
                                const winRate = collector.matches > 0 ? Math.round((collector.wins / collector.matches) * 100) : 0;
                                const bestVibe = collector.bestVibe;
                                const isExpanded = expandedCollector === collector.display;
                                const contributingGvcs = collector.gvcs.filter((g: Character) => g.allTime.wins > 0 || g.allTime.losses > 0);

                                return (
                                    <div key={collector.display}>
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => setExpandedCollector(isExpanded ? null : collector.display)}
                                            className={`grid grid-cols-[24px_32px_1fr_35px_35px_35px_30px] md:grid-cols-[60px_80px_2.5fr_80px_80px_80px_80px_60px] gap-1 md:gap-4 items-center px-2 md:px-6 py-2 md:py-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${isTop3 ? 'bg-gradient-to-r from-gvc-gold/10 to-transparent' : ''} ${isExpanded ? 'bg-white/10' : ''}`}
                                            onViewportEnter={() => {
                                                if (bestVibe && !realOwners[bestVibe.id]) {
                                                    fetchNftOwner(bestVibe.id).then(ownerData => {
                                                        if (ownerData) setRealOwners(prev => ({ ...prev, [bestVibe.id]: ownerData }));
                                                    });
                                                }
                                            }}
                                        >
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

                                            {/* Best Vibe Image */}
                                            <div className="relative w-8 h-8 md:w-16 md:h-16 rounded-md md:rounded-lg overflow-hidden border border-white/20">
                                                {bestVibe && bestVibe.url ? (
                                                    <Image
                                                        src={getIpfsUrl(bestVibe.url, 2)}
                                                        alt={bestVibe.name || 'Best Vibe'}
                                                        fill
                                                        sizes="64px"
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-800" />
                                                )}
                                            </div>

                                            <div className="font-mono text-[10px] md:text-sm text-white truncate pr-2 flex items-center gap-2">
                                                <span>{collector.display}</span>
                                                <span className="text-gray-500 text-[8px]">{isExpanded ? '▲' : '▼'}</span>
                                            </div>

                                            {/* Wins */}
                                            <div className="text-center">
                                                <div className="text-gvc-gold font-display text-[10px] md:text-lg leading-tight">{collector.wins} W</div>
                                            </div>

                                            {/* Losses */}
                                            <div className="text-center">
                                                <div className="text-gray-400 font-display text-[10px] md:text-lg leading-tight">{collector.losses} L</div>
                                            </div>

                                            {/* Win Rate - New separate column */}
                                            <div className="text-center">
                                                <div className="text-white font-display text-[10px] md:text-lg">{winRate}%</div>
                                            </div>

                                            {/* GVCs Count */}
                                            <div className="hidden md:block text-center text-gray-400 font-display md:text-lg leading-tight">
                                                {collector.count}
                                            </div>

                                            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                                                {collector.address && !collector.address.endsWith('.eth') ? (
                                                    <a
                                                        href={`https://opensea.io/${collector.address}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-500 hover:text-[#2081E2] transition-colors opacity-50 hover:opacity-100"
                                                        title="View profile on OpenSea"
                                                    >
                                                        <img
                                                            src="/opensea-v2.png"
                                                            alt="OpenSea"
                                                            width={16}
                                                            height={16}
                                                            className="rounded-full hover:opacity-80 transition-opacity md:w-6 md:h-6"
                                                        />
                                                    </a>
                                                ) : (
                                                    <span className="opacity-30">
                                                        <img
                                                            src="/opensea-v2.png"
                                                            alt="OpenSea"
                                                            width={16}
                                                            height={16}
                                                            className="rounded-full md:w-6 md:h-6"
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>

                                        {/* Expandable GVC Breakdown */}
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-[#0a0a0a] border-b border-white/10 px-4 md:px-12 py-3"
                                            >
                                                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">GVCs with Stats ({contributingGvcs.length})</div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    {contributingGvcs.map((gvc: Character) => (
                                                        <div key={gvc.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                                                            <div className="relative w-8 h-8 rounded overflow-hidden border border-white/10">
                                                                <Image
                                                                    src={getIpfsUrl(gvc.url, 2)}
                                                                    alt={gvc.name}
                                                                    fill
                                                                    sizes="32px"
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-[10px] text-white truncate">{gvc.name}</div>
                                                                <div className="text-[9px] text-gray-400">
                                                                    <span className="text-gvc-gold">{gvc.allTime.wins}W</span>
                                                                    <span className="mx-1">/</span>
                                                                    <span>{gvc.allTime.losses}L</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {contributingGvcs.length === 0 && (
                                                    <div className="text-gray-600 text-xs">No GVCs with recorded matches yet.</div>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            }

                            // VIBES MODE
                            const char = item as Character;
                            try {
                                if (!char) return null;
                                const stats = char.allTime;
                                const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;

                                // Use real owner if available, otherwise default
                                const realOwnerData = realOwners[char.id];

                                // Get consistent display and link using the helper
                                const ownerInfo = getOwnerDisplayAndLink(realOwnerData, char.owner);

                                return (
                                    <motion.div
                                        key={char.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`grid grid-cols-[24px_32px_1fr_35px_35px_35px_24px] md:grid-cols-[60px_80px_2.5fr_80px_80px_80px_1.5fr_40px] gap-1 md:gap-4 items-center px-2 md:px-6 py-2 md:py-4 border-b border-white/5 hover:bg-white/5 transition-colors group ${isTop3 ? 'bg-gradient-to-r from-gvc-gold/10 to-transparent' : ''
                                            }`}
                                        onViewportEnter={() => {
                                            if (!realOwners[char.id]) {
                                                fetchNftOwner(char.id).then(ownerData => {
                                                    if (ownerData) setRealOwners(prev => ({ ...prev, [char.id]: ownerData }));
                                                });
                                            }
                                        }}
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

                                        {/* Image Preview */}
                                        <div className="relative w-7 h-7 md:w-16 md:h-16 rounded-md md:rounded-lg overflow-hidden border border-white/20 group-hover:border-gvc-gold transition-colors">
                                            {char.url ? (
                                                <Image
                                                    src={getIpfsUrl(char.url, 2)}
                                                    alt={char.name || 'Vibe'}
                                                    fill
                                                    sizes="64px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-800" />
                                            )}
                                        </div>

                                        {/* Name */}
                                        <div className="font-cooper text-[9px] md:text-base text-white truncate pr-4 md:pr-10">
                                            {char.name || 'Unknown'}
                                        </div>

                                        {/* Wins */}
                                        <div className="text-center">
                                            <div className="text-gvc-gold font-display text-[10px] md:text-lg leading-tight">{stats.wins} W</div>
                                        </div>

                                        {/* Losses */}
                                        <div className="text-center">
                                            <div className="text-gray-400 font-display text-[10px] md:text-lg leading-tight">{stats.losses} L</div>
                                        </div>

                                        {/* Win Rate - New separate column */}
                                        <div className="text-center">
                                            <div className="text-white font-display text-[10px] md:text-lg">{winRate}%</div>
                                        </div>

                                        {/* Owner - Hidden on Mobile */}
                                        <div className="hidden md:block text-center font-mono text-xs text-gray-500 truncate hover:text-[#2081E2]">
                                            {ownerInfo.link ? (
                                                <a href={`https://opensea.io/${ownerInfo.link}`} target="_blank" rel="noopener noreferrer" title="View profile on OpenSea">
                                                    {ownerInfo.display}
                                                </a>
                                            ) : (
                                                <span>{ownerInfo.display}</span>
                                            )}
                                        </div>

                                        {/* Link */}
                                        <div className="flex justify-center">
                                            <a
                                                href={`https://opensea.io/assets/ethereum/0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4/${char.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-500 hover:text-[#2081E2] transition-colors opacity-50 hover:opacity-100 p-0 md:p-2"
                                                title="View on OpenSea"
                                            >
                                                <img
                                                    src="/opensea-v2.png"
                                                    alt="OpenSea"
                                                    width={16}
                                                    height={16}
                                                    className="rounded-full hover:opacity-80 transition-opacity md:w-6 md:h-6"
                                                />
                                            </a>
                                        </div>
                                    </motion.div>
                                );
                            } catch (e) {
                                console.error("Render error for char", char?.id, e);
                                return null;
                            }
                        })
                    )}
                </div>
            </div>
        </div >
    );
}
