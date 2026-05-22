'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameLogic } from '@/lib/useGameLogic';
import { getIpfsUrl, checkIpfsBlocked } from '@/lib/ipfs';
import VibeCard from './VibeCard';
import Leaderboard from './Leaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import BuyVotesModal from './BuyVotesModal';

export default function GameInterface() {
    const { address } = useAccount();
    const { gameState, matchup, matchupQueue, vote, remainingVotes, canVote, refreshLimit, loading } = useGameLogic(address);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [fetchedStats, setFetchedStats] = useState<Record<string, any>>({});
    const [walletConnected, setWalletConnected] = useState(false);
    const [showBuyModal, setShowBuyModal] = useState(false);

    // Handle Twitter/X share with image
    const handleShare = () => {
        if (!matchup) return;
        const char1 = matchup[0];
        const char2 = matchup[1];
        const tweetText = `LEFT OR RIGHT!? ⬅️➡️\n\nGVC #${char1.id} vs. GVC #${char2.id}\n\nIt's time for a VIBE OFF! 👀🤙🔥\n\n(Built by @brydisanto for @GoodVibesClub)`;
        const shareUrl = `https://vibeoff.xyz/share?ids=${char1.id},${char2.id}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=520');
    };

    // Check if wallet is connected (from localStorage)
    useEffect(() => {
        try {
            const myGvcs = localStorage.getItem('my_gvc_ids');
            setWalletConnected(!!myGvcs && JSON.parse(myGvcs).length > 0);
        } catch (e) {
            setWalletConnected(false);
        }
    }, []);

    // Proactively check if IPFS is blocked (e.g. Dubai/UAE)
    useEffect(() => {
        checkIpfsBlocked();
    }, []);

    // Fetch global stats for current matchup
    useEffect(() => {
        if (!matchup) return;

        const ids = matchup.map(c => c.id).join(',');
        fetch(`/api/stats?ids=${ids}`)
            .then(res => res.json())
            .then(data => {
                if (data.stats) {
                    setFetchedStats(prev => ({ ...prev, ...data.stats }));
                }
            })
            .catch(console.error);
    }, [matchup]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!matchup || !canVote || showLeaderboard) return;

            if (e.key === 'ArrowLeft') {
                vote(matchup[0].id);
            } else if (e.key === 'ArrowRight') {
                vote(matchup[1].id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [matchup, canVote, showLeaderboard, vote]);

    // NO useEffect pre-loader. We use DOM pre-loading below.

    if (loading) return <div className="text-neon-blue animate-pulse">Initializing Vibes...</div>;
    if (!gameState) return null;

    return (
        <div className="w-full min-h-screen p-2 md:p-8 flex flex-col items-center">

            {/* DOM-based Pre-loader: Only load the next 2 matchups (4 images) to prevent mobile connection starvation */}
            <div className="hidden" aria-hidden="true">
                {matchupQueue.slice(0, 2).map((pair, i) => (
                    pair.map(char => (
                        <img
                            key={`preload-${i}-${char.id}`}
                            src={getIpfsUrl(char.url, 0)}
                            alt="preload"
                            loading="eager"
                            decoding="async"
                        />
                    ))
                ))}
            </div>

            {/* Main Content Container - Aligned Width */}
            <div className="w-full max-w-[1000px] flex flex-col">

                {/* Header Stats - Responsive */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-4 md:mb-8 w-full">
                    {/* Vote Counter Badge */}
                    <div className="flex items-stretch gap-2">
                        <div className="flex rounded-lg overflow-hidden">
                            <div className="bg-[#1a1a1a] px-3 md:px-4 py-2 md:py-3 flex items-center">
                                <span className="text-gray-400 text-[10px] md:text-xs font-bold tracking-wider">DAILY VOTES</span>
                            </div>
                            <div className={`px-4 md:px-5 py-2 md:py-3 flex items-center ${canVote ? 'bg-gvc-gold' : 'bg-red-500'}`}>
                                <span className="text-black font-mono text-lg md:text-xl font-black">{remainingVotes ?? '...'}</span>
                            </div>
                        </div>

                        {/* Profile Icon */}
                        <a
                            href="/profile"
                            className="px-3 md:px-4 rounded-lg bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#252525] transition-all relative flex items-center"
                            title={walletConnected ? 'My Collection' : 'Connect Wallet'}
                        >
                            {/* Connection status badge - Chain link */}
                            <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-black ${walletConnected
                                ? 'bg-gvc-gold text-black'
                                : 'bg-red-500 text-white animate-pulse'
                                }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            </span>
                            {/* User icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </a>
                    </div>

                    <div className="flex gap-2 md:gap-3">
                        <a
                            href="/lookup"
                            className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#252525] transition-all font-bold text-[11px] md:text-sm uppercase tracking-wider border border-transparent hover:border-white/30 flex items-center justify-center"
                            title="Lookup GVC"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        </a>
                        <a
                            href="/vibe-o-meter"
                            className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#252525] transition-all font-bold text-[11px] md:text-sm uppercase tracking-wider border border-transparent hover:border-white/30 flex items-center justify-center"
                            title="Vibe-O-Meter"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m12 14 4-4" />
                                <path d="M3.34 19a10 10 0 1 1 17.32 0" />
                            </svg>
                        </a>
                        <a
                            href="/hall-of-fame"
                            className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-gvc-gold hover:bg-[#252525] transition-all font-bold text-[11px] md:text-sm uppercase tracking-wider border border-transparent hover:border-gvc-gold/30 flex items-center justify-center"
                            title="Hall of Vibes"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                <path d="M4 22h16" />
                                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                            </svg>
                        </a>
                        <button
                            onClick={() => setShowLeaderboard(!showLeaderboard)}
                            className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-gvc-gold text-black font-bold text-[11px] md:text-sm uppercase tracking-wider hover:bg-[#FFE058] transition-all flex items-center"
                        >
                            {showLeaderboard ? 'Back to Vote' : 'Leaderboard'}
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {showLeaderboard ? (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Leaderboard characters={gameState.characters} onClose={() => setShowLeaderboard(false)} />
                        </motion.div>
                    ) : (
                        matchup ? (
                            <div className="flex flex-col items-center w-full relative">
                                {!canVote && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mb-4 md:mb-8 p-3 md:p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-center w-full"
                                    >
                                        <p className="font-bold text-sm md:text-base">Daily Limit Reached!</p>
                                        <button
                                            onClick={() => setShowBuyModal(true)}
                                            className="mt-2 px-4 py-2 bg-gvc-gold text-black font-bold text-xs md:text-sm uppercase tracking-wider rounded-lg hover:bg-[#FFE058] transition-all"
                                        >
                                            Get More Votes
                                        </button>
                                    </motion.div>
                                )}

                                {/* Matchup Grid - Side by Side on All Screens */}
                                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-8 items-center w-full px-1 md:px-0">
                                    {/* Left Card */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        className="w-full"
                                    >
                                        <VibeCard
                                            character={matchup[0]}
                                            onClick={() => canVote && vote(matchup[0].id)}
                                            disabled={!canVote}
                                            stats={fetchedStats[matchup[0].id]}
                                        />
                                    </motion.div>

                                    {/* VS Badge - Large Bold Style */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="relative z-10 flex items-center justify-center"
                                    >
                                        <span className="text-2xl md:text-4xl font-display italic text-gvc-gold">VS</span>
                                    </motion.div>

                                    {/* Right Card */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 50 }}
                                        className="w-full"
                                    >
                                        <VibeCard
                                            character={matchup[1]}
                                            onClick={() => canVote && vote(matchup[1].id)}
                                            disabled={!canVote}
                                            stats={fetchedStats[matchup[1].id]}
                                        />
                                    </motion.div>
                                </div>

                                {/* Twitter/X Share Button - Below Cards */}
                                <motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    onClick={handleShare}
                                    className="mt-6 md:mt-8 px-6 py-3 rounded-full bg-black text-white font-bold text-sm uppercase tracking-wider hover:bg-[#1a1a1a] transition-all flex items-center gap-2 border border-white/30 hover:border-white/50 shadow-lg"
                                    title="Share this matchup on X/Twitter"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    Share This Matchup
                                </motion.button>

                                {/* Mode Toggle Ribbon */}
                                <div className="flex items-center gap-6 mt-6 md:mt-8">
                                    <span className="font-extrabold font-mundial text-sm md:text-base uppercase tracking-widest text-white">
                                        1v1 Mode
                                    </span>
                                    <span className="w-0.5 h-6 bg-[#333]"></span>
                                    <a
                                        href="/duos"
                                        className="font-extrabold font-mundial text-sm md:text-base uppercase tracking-widest text-[#333] hover:text-[#666] transition-all"
                                    >
                                        2v2 Mode
                                    </a>
                                </div>

                                {/* Footer - Hide keyboard hint on mobile */}
                                <p className="hidden md:block text-gray-500 mt-12 text-sm font-mundial">
                                    Tap a card or use ⬅️ ➡️ arrow keys • 69 votes per day
                                </p>
                                <p className="md:hidden text-gray-500 mt-6 text-xs font-mundial">
                                    Tap a card to vote • 69 votes per day
                                </p>
                                <p className="text-gray-600 mt-2 text-xs font-mono">
                                    vibe coded by <a href="https://x.com/brydisanto" target="_blank" rel="noopener noreferrer" className="hover:text-gvc-gold transition-colors">@brydisanto</a>
                                </p>
                                {/* Shaka Footer */}
                                <div className="mt-6 md:mt-8 opacity-90 hover:opacity-100 transition-opacity animate-pulse">
                                    <img
                                        src="/shaka-footer.png"
                                        alt="Good Vibes Club"
                                        className="w-10 h-10 md:w-20 md:h-20 object-contain"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">Loading Matchup...</div>
                        )
                    )}
                </AnimatePresence>
            </div >

            {/* Buy Votes Modal */}
            <BuyVotesModal
                isOpen={showBuyModal}
                onClose={() => setShowBuyModal(false)}
                packageType="1v1"
                onSuccess={() => {
                    refreshLimit();
                }}
            />
        </div >
    );
}
