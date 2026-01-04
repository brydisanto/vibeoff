import { useState, useEffect } from 'react';
import { Character, INITIAL_CHARACTERS } from './data';

const STORAGE_KEY = 'neon_solstice_state_v20';
const SESSION_MATCHUP_KEY = 'current_matchup_ids';
const DAILY_LIMIT = 69;

interface UserState {
    lastPlayedDate: string;
    votesToday: number;
}

// Sparse storage for stats: Map<CharacterID, [wins, losses, matches]>
// We use arrays to save space: [weeklyWins, weeklyLosses, weeklyMatches, allTimeWins, allTimeLosses, allTimeMatches]
type StatArray = [number, number, number, number, number, number];
interface StoredStats {
    [id: number]: StatArray;
}

interface StoredData {
    stats: StoredStats;
    userState: UserState;
}

interface GameState {
    characters: Character[];
    userState: UserState;
}

const getToday = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

export function useGameLogic() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [matchup, setMatchup] = useState<[Character, Character] | null>(null);
    const [matchupQueue, setMatchupQueue] = useState<[Character, Character][]>([]);

    // Cleanup old versions to free up space
    useEffect(() => {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('neon_solstice_state_') && key !== STORAGE_KEY) {
                    console.log('Cleaning up old key:', key);
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            console.error('Cleanup failed:', e);
        }
    }, []);

    // Load state from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const today = getToday();

        if (saved) {
            try {
                const parsed: StoredData = JSON.parse(saved);

                // Reset user state if new day
                if (parsed.userState.lastPlayedDate !== today) {
                    parsed.userState = { lastPlayedDate: today, votesToday: 0 };
                    // Clear session matchup on new day
                    sessionStorage.removeItem(SESSION_MATCHUP_KEY);
                }

                // Rehydrate full characters from stored stats
                const hydratedCharacters = INITIAL_CHARACTERS.map(char => {
                    const stats = parsed.stats[char.id];
                    if (stats) {
                        return {
                            ...char,
                            weekly: { wins: stats[0], losses: stats[1], matches: stats[2] },
                            allTime: { wins: stats[3], losses: stats[4], matches: stats[5] }
                        };
                    }
                    return char;
                });

                setGameState({
                    characters: hydratedCharacters,
                    userState: parsed.userState
                });
            } catch (e) {
                console.error("Failed to parse saved state", e);
                initializeState();
            }
        } else {
            initializeState();
        }
    }, []);

    // Save state whenever it changes
    useEffect(() => {
        if (!gameState) return;

        // Convert full characters back to sparse stats for storage
        // Only store stats for characters that have matches > 0
        const sparseStats: StoredStats = {};
        gameState.characters.forEach(c => {
            if (c.allTime.matches > 0) {
                sparseStats[c.id] = [
                    c.weekly.wins, c.weekly.losses, c.weekly.matches,
                    c.allTime.wins, c.allTime.losses, c.allTime.matches
                ];
            }
        });

        const dataToSave: StoredData = {
            stats: sparseStats,
            userState: gameState.userState
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.error("Storage failed (Quota Exceeded?)", e);
        }

    }, [gameState]);

    const initializeState = () => {
        const today = getToday();
        setGameState({
            characters: INITIAL_CHARACTERS,
            userState: { lastPlayedDate: today, votesToday: 0 }
        });
    };

    const getNewPair = (chars: Character[]): [Character, Character] => {
        const c1 = chars[Math.floor(Math.random() * chars.length)];
        let c2 = chars[Math.floor(Math.random() * chars.length)];
        // Ensure different ID and URL
        while (c1.id === c2.id || c1.url === c2.url) {
            c2 = chars[Math.floor(Math.random() * chars.length)];
        }
        return [c1, c2];
    };

    const generateMatchup = () => {
        if (!gameState) return;
        const { characters } = gameState;

        setMatchupQueue(prev => {
            const newQueue = [...prev];
            // Ensure we always have 12 pairs in the queue for smoother rapid voting
            while (newQueue.length < 12) {
                newQueue.push(getNewPair(characters));
            }

            // If we don't have a current matchup, take the first one
            if (!matchup) {
                const first = newQueue.shift();
                if (first) {
                    setMatchup(first);
                    // Store in session so we can detect refresh-skipping
                    sessionStorage.setItem(SESSION_MATCHUP_KEY, JSON.stringify([first[0].id, first[1].id]));
                }
            }

            return newQueue;
        });
    };

    // Call this when voting
    const advanceQueue = () => {
        if (!gameState) return;
        setMatchupQueue(prev => {
            const newQueue = [...prev];
            // Shift the next one from queue to be the current matchup
            const next = newQueue.shift();
            if (next) {
                setMatchup(next);
                // Update session storage with new matchup
                sessionStorage.setItem(SESSION_MATCHUP_KEY, JSON.stringify([next[0].id, next[1].id]));
            }

            // Top up the queue
            newQueue.push(getNewPair(gameState.characters));
            return newQueue;
        });
    };

    // Check for refresh-skipping on load
    useEffect(() => {
        if (!gameState) return;

        // Check if user had a matchup in session that they didn't vote on
        const savedMatchup = sessionStorage.getItem(SESSION_MATCHUP_KEY);
        if (savedMatchup && !matchup) {
            // User refreshed without voting - this costs 1 vote
            try {
                const [id1, id2] = JSON.parse(savedMatchup);
                console.log(`Refresh detected with pending matchup: ${id1} vs ${id2}. Costing 1 vote.`);

                // Only penalize if they have votes remaining
                if (gameState.userState.votesToday < DAILY_LIMIT) {
                    setGameState(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            userState: {
                                ...prev.userState,
                                votesToday: prev.userState.votesToday + 1
                            }
                        };
                    });
                }
            } catch (e) {
                console.error('Failed to parse saved matchup:', e);
            }
            // Clear the old matchup
            sessionStorage.removeItem(SESSION_MATCHUP_KEY);
        }

        // Generate new matchup
        if (!matchup) {
            generateMatchup();
        }
    }, [gameState]);

    const vote = async (winnerId: number) => {
        if (!gameState || !matchup) return;

        const loserId = matchup[0].id === winnerId ? matchup[1].id : matchup[0].id;

        // Optimistic UI update: Just update daily votes, do NOT update local stats
        // Local stats would drift from global stats otherwise
        setGameState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                userState: {
                    ...prev.userState,
                    votesToday: prev.userState.votesToday + 1
                }
            };
        });

        // Store local vote for filtering toasts
        try {
            const recent = JSON.parse(localStorage.getItem('my_recent_votes') || '[]');
            const newVote = { winnerId, loserId, timestamp: Date.now() };
            // Keep last 20
            const updated = [newVote, ...recent].slice(0, 20);
            localStorage.setItem('my_recent_votes', JSON.stringify(updated));
        } catch (e) { console.error("Failed to save local vote", e); }

        // Send to API (Fire and forget)
        fetch('/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ winnerId, loserId })
        }).catch(e => console.error("Failed to submit vote:", e));

        // Advance to next matchup immediately
        advanceQueue();
    };

    const remainingVotes = gameState ? DAILY_LIMIT - gameState.userState.votesToday : DAILY_LIMIT;
    const canVote = gameState ? gameState.userState.votesToday < DAILY_LIMIT : false;

    return {
        gameState,
        matchup,
        matchupQueue, // Exposed for preloading
        vote,
        remainingVotes,
        canVote,
        loading: !gameState
    };
}
