/**
 * GET /api/duos/leaderboard
 * Get the DUOS leaderboard with Weekly/All-Time mode support
 * Query params: ?mode=weekly or ?mode=alltime (default: alltime)
 */

import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

export const dynamic = 'force-dynamic';

// Get ISO week key (YYYY-WNN format)
function getWeekKey(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

interface DuoData {
    gvc1Id: number;
    gvc2Id: number;
    gvc1Name: string;
    gvc2Name: string;
    gvc1Url: string;
    gvc2Url: string;
    owner: string;
    wins: number;
    losses: number;
    matches: number;
    elo: number;
}

interface WeeklyStats {
    wins?: number;
    losses?: number;
}

export async function GET(request: NextRequest) {
    try {
        const mode = request.nextUrl.searchParams.get('mode') || 'alltime';
        const isWeekly = mode === 'weekly';
        const weekKey = getWeekKey();

        // Get all Duo IDs
        const allDuoIds = await kv.zrange('duos:all', 0, -1) as string[];

        if (allDuoIds.length === 0) {
            return NextResponse.json({ duos: [], totalDuos: 0, mode, weekKey: isWeekly ? weekKey : undefined });
        }

        // Fetch all Duo base data
        const basePipeline = kv.pipeline();
        allDuoIds.forEach(id => {
            basePipeline.hgetall(`duos:${id}`);
        });
        const baseResults = await basePipeline.exec();

        // If weekly mode, also fetch weekly stats
        let weeklyResults: (WeeklyStats | null)[] = [];
        if (isWeekly) {
            const weeklyPipeline = kv.pipeline();
            allDuoIds.forEach(id => {
                weeklyPipeline.hgetall(`duos:weekly:${weekKey}:${id}`);
            });
            weeklyResults = await weeklyPipeline.exec() as (WeeklyStats | null)[];
        }

        const duos = allDuoIds.map((id, index) => {
            const data = baseResults[index] as DuoData | null;
            if (!data) return null;

            // Use weekly or all-time stats based on mode
            const wins = isWeekly
                ? (weeklyResults[index]?.wins || 0)
                : (data.wins || 0);
            const losses = isWeekly
                ? (weeklyResults[index]?.losses || 0)
                : (data.losses || 0);
            const matches = wins + losses;
            const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

            return {
                id,
                gvc1: { id: data.gvc1Id, name: data.gvc1Name, url: data.gvc1Url },
                gvc2: { id: data.gvc2Id, name: data.gvc2Name, url: data.gvc2Url },
                owner: data.owner,
                wins,
                losses,
                matches,
                winRate,
                elo: data.elo || 1000 // ELO is always all-time
            };
        }).filter(Boolean);

        // Sort by +/- (wins - losses), then by win rate
        duos.sort((a, b) => {
            if (!a || !b) return 0;
            const diffA = a.wins - a.losses;
            const diffB = b.wins - b.losses;
            if (diffA !== diffB) return diffB - diffA;
            return b.winRate - a.winRate;
        });

        return NextResponse.json({
            duos,
            totalDuos: duos.length,
            mode,
            weekKey: isWeekly ? weekKey : undefined
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 });
    }
}
