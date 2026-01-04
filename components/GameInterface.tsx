'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameLogic } from '@/lib/useGameLogic';
import { getIpfsUrl } from '@/lib/ipfs';
import VibeCard from './VibeCard';
import Leaderboard from './Leaderboard';
import { motion, AnimatePresence } from 'framer-motion';

export default function GameInterface() {
    const { gameState, matchup, matchupQueue, vote, remainingVotes, canVote, loading } = useGameLogic();
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [fetchedStats, setFetchedStats] = useState<Record<string, any>>({});
    const [dailyVoteAvailable, setDailyVoteAvailable] = useState(false);
    const [walletConnected, setWalletConnected] = useState(false);

    // Check if daily vote is available
    useEffect(() => {
        fetch('/api/daily')
            .then(res => res.json())
            .then(data => {
                setDailyVoteAvailable(!data.hasVoted);
            })
            .catch(() => setDailyVoteAvailable(false));
    }, []);

    // Check if wallet is connected (from localStorage)
    useEffect(() => {
        try {
            const myGvcs = localStorage.getItem('my_gvc_ids');
            setWalletConnected(!!myGvcs && JSON.parse(myGvcs).length > 0);
        } catch (e) {
            setWalletConnected(false);
        }
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

            {/* DOM-based Pre-loader: Hidden images to force browser to cache them */}
            <div className="hidden" aria-hidden="true">
                {matchupQueue.map((pair, i) => (
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
                    {/* Split Badge Vote Counter + Daily Icon */}
                    <div className="flex items-stretch gap-2">
                        <div className="flex rounded-lg overflow-hidden">
                            <div className="bg-[#1a1a1a] px-3 md:px-4 py-2 md:py-3 flex items-center">
                                <span className="text-gray-400 text-[10px] md:text-xs font-bold tracking-wider">DAILY VOTES</span>
                            </div>
                            <div className={`px-4 md:px-5 py-2 md:py-3 flex items-center ${canVote ? 'bg-gvc-gold' : 'bg-red-500'}`}>
                                <span className="text-black font-mono text-lg md:text-xl font-black">{remainingVotes}</span>
                            </div>
                        </div>

                        {/* THE DAILY Icon - B2 Checkbox */}
                        <a
                            href="/daily"
                            className="px-3 md:px-4 rounded-lg bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#252525] transition-all relative flex items-center"
                            title={dailyVoteAvailable ? 'THE DAILY - Vote now!' : 'THE DAILY - Already voted'}
                        >
                            {/* Notification badge */}
                            <span className={`absolute -top-1.5 -right-1.5 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black ${dailyVoteAvailable
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-gvc-gold text-black'
                                }`}>
                                {dailyVoteAvailable ? '1' : '✓'}
                            </span>
                            {/* Checkbox icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 11 12 14 22 4" />
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                            </svg>
                        </a>

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
                            className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-gvc-gold hover:bg-[#252525] transition-all font-bold text-[11px] md:text-sm uppercase tracking-wider border border-transparent hover:border-gvc-gold/30 flex items-center"
                        >
                            Hall of Vibes
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
                                        <p className="text-xs md:text-sm">Come back tomorrow to cast more votes.</p>
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
        </div >
    );
}
