/**
 * Daily Vibe Off - Data Layer
 * 
 * Manages the daily matchup mode with:
 * - Auto-rotation at 12:00 PM EST
 * - One vote per user per day
 * - Separate stats from main game
 * - History tracking
 */

import { kv } from './kv';

// ============ Types ============

export interface DailyMatchup {
    char1Id: number;
    char2Id: number;
    startTime: number;      // Unix timestamp (ms)
    votes1: number;
    votes2: number;
    dateKey: string;        // YYYY-MM-DD format for deduplication
}

export interface DailyHistoryEntry {
    dateKey: string;
    char1Id: number;
    char2Id: number;
    votes1: number;
    votes2: number;
    winnerId: number | null;  // null if tie
}

export interface DailyCharStats {
    wins: number;
    losses: number;
    appearances: number;
}

// ============ Constants ============

const TOTAL_GVCS = 6969;
const ROTATION_HOUR_EST = 12;  // 12 PM EST

// Redis Keys
const KEYS = {
    current: 'daily:current',
    history: 'daily:history',
    votes: (dateKey: string) => `daily:votes:${dateKey}`, // Stores IPs
    votesDevice: (dateKey: string) => `daily:votes:device:${dateKey}`, // Stores Cookies (Device IDs)
    userVote: (dateKey: string, identifier: string) => `daily:uservote:${dateKey}:${identifier}`,
    charStats: (charId: number) => `daily:stats:${charId}`,
};

// ============ Utility Functions ============

/**
 * Get current date key in YYYY-MM-DD format based on EST timezone
 * A "day" starts at 12 PM EST and ends at 11:59 AM EST the next day
 */
export function getCurrentDateKey(): string {
    const now = new Date();

    // Convert to EST (UTC-5)
    const estOffset = -5 * 60;
    const utcOffset = now.getTimezoneOffset();
    const estTime = new Date(now.getTime() + (utcOffset + estOffset) * 60 * 1000);

    // If before noon EST, use yesterday's date key
    if (estTime.getHours() < ROTATION_HOUR_EST) {
        estTime.setDate(estTime.getDate() - 1);
    }

    return estTime.toISOString().split('T')[0];
}

/**
 * Get the next rotation time (12 PM EST)
 */
export function getNextRotationTime(): Date {
    const now = new Date();

    // Convert to EST
    const estOffset = -5 * 60;
    const utcOffset = now.getTimezoneOffset();
    const estNowTimestamp = now.getTime() + (utcOffset + estOffset) * 60 * 1000;
    const estNow = new Date(estNowTimestamp);

    // Create target time (noon EST)
    const estTarget = new Date(estNowTimestamp);
    estTarget.setHours(ROTATION_HOUR_EST, 0, 0, 0);

    // If already past noon EST, go to tomorrow
    if (estNow >= estTarget) {
        estTarget.setDate(estTarget.getDate() + 1);
    }

    // Convert back to UTC
    return new Date(estTarget.getTime() - (utcOffset + estOffset) * 60 * 1000);
}

/**
 * Generate two random, distinct character IDs
 */
function generateRandomMatchup(): { char1Id: number; char2Id: number } {
    const char1Id = Math.floor(Math.random() * TOTAL_GVCS) + 1;
    let char2Id = Math.floor(Math.random() * TOTAL_GVCS) + 1;

    // Ensure they're different
    while (char2Id === char1Id) {
        char2Id = Math.floor(Math.random() * TOTAL_GVCS) + 1;
    }

    return { char1Id, char2Id };
}

/**
 * Get the current daily matchup
 * Auto-creates a new one if none exists or if rotation is needed
 * Uses a lock to prevent race conditions
 */
export async function getCurrentDaily(): Promise<DailyMatchup> {
    const currentDateKey = getCurrentDateKey();

    // Fetch existing matchup
    const existing = await kv.get<DailyMatchup>(KEYS.current);

    console.log(`[Daily] getCurrentDaily called. currentDateKey=${currentDateKey}, existing=${JSON.stringify(existing)}`);

    // If matchup exists and is for today, return it
    if (existing && existing.dateKey && String(existing.dateKey) === String(currentDateKey)) {
        console.log(`[Daily] Returning existing matchup for ${currentDateKey}`);
        return existing;
    }

    console.log(`[Daily] Need new matchup. existing.dateKey=${existing?.dateKey}, currentDateKey=${currentDateKey}`);

    // Need to create a new matchup - use lock to prevent race condition
    const lockKey = 'daily:lock';
    const lockValue = Date.now().toString();

    // Try to acquire lock (expires in 10 seconds)
    const acquired = await kv.set(lockKey, lockValue, { nx: true, ex: 10 });
    console.log(`[Daily] Lock acquired: ${acquired}`);

    if (!acquired) {
        // Another process is creating the matchup, wait and retry
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryExisting = await kv.get<DailyMatchup>(KEYS.current);
        if (retryExisting && retryExisting.dateKey && String(retryExisting.dateKey) === String(currentDateKey)) {
            console.log(`[Daily] After wait, returning existing matchup`);
            return retryExisting;
        }
        // If still no matchup, proceed anyway (lock may have expired)
    }

    try {
        // Double-check after acquiring lock
        const doubleCheck = await kv.get<DailyMatchup>(KEYS.current);
        if (doubleCheck && doubleCheck.dateKey && String(doubleCheck.dateKey) === String(currentDateKey)) {
            console.log(`[Daily] Double-check: returning existing matchup`);
            return doubleCheck;
        }

        // Archive the old matchup if it exists
        if (doubleCheck) {
            console.log(`[Daily] Archiving old matchup from ${doubleCheck.dateKey}`);
            await archiveMatchup(doubleCheck);
        }

        // Generate new matchup
        const { char1Id, char2Id } = generateRandomMatchup();
        const newMatchup: DailyMatchup = {
            char1Id,
            char2Id,
            startTime: Date.now(),
            votes1: 0,
            votes2: 0,
            dateKey: currentDateKey,
        };

        await kv.set(KEYS.current, newMatchup);
        console.log(`[Daily] Created NEW matchup: ${char1Id} vs ${char2Id} for ${currentDateKey}`);
        return newMatchup;
    } finally {
        // Release lock
        await kv.del(lockKey);
    }
}

/**
 * Archive a completed matchup to history
 */
async function archiveMatchup(matchup: DailyMatchup): Promise<void> {
    const entry: DailyHistoryEntry = {
        dateKey: matchup.dateKey,
        char1Id: matchup.char1Id,
        char2Id: matchup.char2Id,
        votes1: matchup.votes1,
        votes2: matchup.votes2,
        winnerId: matchup.votes1 > matchup.votes2
            ? matchup.char1Id
            : matchup.votes2 > matchup.votes1
                ? matchup.char2Id
                : null,
    };

    // Store in sorted set with timestamp as score
    await kv.zadd(KEYS.history, {
        score: new Date(matchup.dateKey).getTime(),
        member: JSON.stringify(entry),
    });

    // Update character stats
    await updateCharStats(matchup);

    // Clean up old votes sets
    await kv.del(KEYS.votes(matchup.dateKey));
    await kv.del(KEYS.votesDevice(matchup.dateKey));
}

/**
 * Update daily-mode stats for both characters
 */
async function updateCharStats(matchup: DailyMatchup): Promise<void> {
    const winner = matchup.votes1 > matchup.votes2 ? matchup.char1Id : matchup.char2Id;
    const loser = winner === matchup.char1Id ? matchup.char2Id : matchup.char1Id;
    const isTie = matchup.votes1 === matchup.votes2;

    // Update winner
    const winnerStats = await kv.get<DailyCharStats>(KEYS.charStats(winner)) || { wins: 0, losses: 0, appearances: 0 };
    if (!isTie) winnerStats.wins++;
    winnerStats.appearances++;
    await kv.set(KEYS.charStats(winner), winnerStats);

    // Update loser
    const loserStats = await kv.get<DailyCharStats>(KEYS.charStats(loser)) || { wins: 0, losses: 0, appearances: 0 };
    if (!isTie) loserStats.losses++;
    loserStats.appearances++;
    await kv.set(KEYS.charStats(loser), loserStats);
}

/**
 * Cast a vote for the daily matchup
 * Returns { success, message, votes1, votes2 }
 */
export async function voteDailyMatchup(
    charId: number,
    ip: string,
    deviceId: string
): Promise<{ success: boolean; message: string; votes1?: number; votes2?: number }> {
    const matchup = await getCurrentDaily();

    // Validate character is part of this matchup
    if (charId !== matchup.char1Id && charId !== matchup.char2Id) {
        return { success: false, message: 'Invalid character for this matchup' };
    }

    // Check if user already voted (IP or Device)
    const votesIpKey = KEYS.votes(matchup.dateKey);
    const votesDeviceKey = KEYS.votesDevice(matchup.dateKey);

    const [votedIp, votedDevice] = await Promise.all([
        kv.sismember(votesIpKey, ip),
        kv.sismember(votesDeviceKey, deviceId)
    ]);

    if (votedIp || votedDevice) {
        return {
            success: false,
            message: 'You have already voted today',
            votes1: matchup.votes1,
            votes2: matchup.votes2,
        };
    }

    // Record vote (Both)
    await Promise.all([
        kv.sadd(votesIpKey, ip),
        kv.sadd(votesDeviceKey, deviceId),
        // Store which character this user voted for (using Device ID for UI persistence)
        kv.set(KEYS.userVote(matchup.dateKey, deviceId), charId, { ex: 86400 * 2 })
    ]);

    // Update vote count
    if (charId === matchup.char1Id) {
        matchup.votes1++;
    } else {
        matchup.votes2++;
    }

    await kv.set(KEYS.current, matchup);

    return {
        success: true,
        message: 'Vote recorded!',
        votes1: matchup.votes1,
        votes2: matchup.votes2,
    };
}

/**
 * Get daily matchup history
 */
export async function getDailyHistory(limit: number = 30): Promise<DailyHistoryEntry[]> {
    const raw = await kv.zrange(KEYS.history, 0, limit - 1, { rev: true });

    return raw.map((entry) => {
        if (typeof entry === 'string') {
            return JSON.parse(entry) as DailyHistoryEntry;
        }
        return entry as DailyHistoryEntry;
    });
}

/**
 * Get daily-mode stats for a character
 */
export async function getDailyCharStats(charId: number): Promise<DailyCharStats> {
    const stats = await kv.get<DailyCharStats>(KEYS.charStats(charId));
    return stats || { wins: 0, losses: 0, appearances: 0 };
}

/**
 * Manually override the daily matchup (admin function)
 */
export async function setManualMatchup(char1Id: number, char2Id: number): Promise<DailyMatchup> {
    const currentDateKey = getCurrentDateKey();
    const existing = await kv.get<DailyMatchup>(KEYS.current);

    // Archive the old matchup if it exists and is from today
    if (existing && existing.dateKey === currentDateKey) {
        await archiveMatchup(existing);
    }

    // Create manual matchup
    const newMatchup: DailyMatchup = {
        char1Id,
        char2Id,
        startTime: Date.now(),
        votes1: 0,
        votes2: 0,
        dateKey: currentDateKey,
    };

    await kv.set(KEYS.current, newMatchup);
    return newMatchup;
}

/**
 * Check if a user has voted today (by IP or Device)
 */
export async function hasVotedToday(ip: string, deviceId: string): Promise<boolean> {
    const currentDateKey = getCurrentDateKey();
    const [votedIp, votedDevice] = await Promise.all([
        kv.sismember(KEYS.votes(currentDateKey), ip),
        kv.sismember(KEYS.votesDevice(currentDateKey), deviceId)
    ]);
    return (votedIp === 1 || votedDevice === 1);
}

/**
 * Get which character the user voted for today (returns null if not voted)
 */
export async function getUserVoteToday(ip: string, deviceId: string): Promise<number | null> {
    const currentDateKey = getCurrentDateKey();
    // Check device first (primary), then IP (legacy)
    const deviceVote = await kv.get<number>(KEYS.userVote(currentDateKey, deviceId));
    if (deviceVote !== null) return deviceVote;

    const ipVote = await kv.get<number>(KEYS.userVote(currentDateKey, ip));
    return ipVote !== null ? ipVote : null;
}
