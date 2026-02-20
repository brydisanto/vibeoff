import { kv } from '@/lib/kv';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface TraitStats {
    value: string;
    wins: number;
    losses: number;
    matches: number;
    uniqueGvcs: number;
    topGvcId: number;
}

interface Rankings {
    categories: string[];
    rankings: Record<string, TraitStats[]>;
}

export async function GET() {
    try {
        // Load trait map
        const traitMapPath = path.join(process.cwd(), 'lib/trait_map.json');
        if (!fs.existsSync(traitMapPath)) {
            return NextResponse.json({ error: 'Trait map not found' }, { status: 404 });
        }

        const traitMap = JSON.parse(fs.readFileSync(traitMapPath, 'utf-8'));

        // Fetch all-time stats for all characters from Redis
        const count = await kv.zcard('leaderboard:alltime');
        const topIds = await kv.zrange('leaderboard:alltime', 0, count > 0 ? count - 1 : -1, { rev: true });

        if (!topIds || topIds.length === 0) {
            return NextResponse.json({ categories: [], rankings: {} });
        }

        // Fetch stats in batches
        const batchSize = 250;
        const statsResults: any[] = [];

        for (let i = 0; i < topIds.length; i += batchSize) {
            const batch = topIds.slice(i, i + batchSize);
            const pipeline = kv.pipeline();
            batch.forEach(id => {
                pipeline.hgetall(`stats:alltime:${id}`);
            });
            const results = await pipeline.exec();
            statsResults.push(...(results || []));
        }

        // Trait grouping rules: if a trait value contains the keyword, map it to the group name
        // Order matters: first match wins
        const TRAIT_GROUPS: { keyword: string; groupName: string; exclude?: string[] }[] = [
            // Hair traits
            { keyword: 'Headphones', groupName: 'Headphones' },
            { keyword: 'Middle Part', groupName: 'Middle Parts' },
            { keyword: 'Wide Brim Hat', groupName: 'Wide Brim Hats' },
            { keyword: 'Top Messy', groupName: 'Top Messy Hair' },
            { keyword: 'Bowl Cut', groupName: 'Bowl Cuts' },
            { keyword: 'Mohawk', groupName: 'Mohawks' },
            { keyword: 'Flat Top', groupName: 'Flat Tops' },
            { keyword: 'Manbun', groupName: 'Manbuns' },
            { keyword: 'Classic', groupName: 'Classic Hair' },
            { keyword: 'Ballcap', groupName: 'Ballcaps', exclude: ['Ballcap Forward Black SuperRare'] },
            { keyword: 'Short', groupName: 'Short Hair' },
            { keyword: 'Afro', groupName: 'Afros' },
            { keyword: 'Moto Helmet', groupName: 'Moto Helmets' },
            { keyword: 'Comb Over', groupName: 'Comb Overs' },
            { keyword: 'Bucket Hat', groupName: 'Bucket Hats', exclude: ['Bucket Hat Black SuperRare'] },
            { keyword: 'Slick Back', groupName: 'Slick Back Hair' },
            { keyword: 'Backwards Hat', groupName: 'Backwards Hats' },
            { keyword: 'Dundee Hat', groupName: 'Dundee Hats' },
            { keyword: 'Beanie', groupName: 'Beanies' },
            { keyword: 'Football Helmet', groupName: 'Football Helmets' },
            { keyword: 'Female Bob Cut', groupName: 'Bobs' },
            { keyword: 'Female Ponytail', groupName: 'Ponytails' },
            { keyword: 'Female Bun', groupName: 'Buns' },
            { keyword: 'Knight Helm', groupName: 'Knight Helmets' },
            // Face traits
            { keyword: 'Aviator Sunglasses', groupName: 'Aviators' },
            { keyword: 'Hex Sunglasses', groupName: 'Hex Sunglasses' },
            { keyword: 'Library Glasses', groupName: 'Library Glasses' },
            { keyword: 'Cubic Sunglasses', groupName: 'Cubic Sunglasses' },
            { keyword: 'Robo Visor', groupName: 'Robo Visors' },
            { keyword: 'Diver Mask', groupName: 'Diver Masks' },
            { keyword: '80s Glasses', groupName: '80s Glasses' },
            { keyword: 'Snowboard Goggles', groupName: 'Snowboard Goggles' },
            { keyword: 'Circle Glasses', groupName: 'Circle Glasses' },
            { keyword: 'Nouns Glasses', groupName: 'Nouns Glasses' },
            { keyword: 'Beard', groupName: 'Beards', exclude: ['Beard Sweettooth'] },
            { keyword: 'No Face', groupName: 'Ranger Helmets' },
            { keyword: 'Plastic Helmet', groupName: 'Ranger Helmets' },
            // Body traits
            { keyword: 'Henley', groupName: 'Henleys' },
            { keyword: 'Short Sleeve Button Up', groupName: 'Short Sleeve Button Ups' },
            { keyword: 'Plastic Armor', groupName: 'Plastic Armor' },
            { keyword: 'TShirt', groupName: 'Graphic Tees' },
            { keyword: 'Retro Windbreaker', groupName: 'Retro Windbreakers' },
            { keyword: 'Suit', groupName: 'Suits' },
            { keyword: 'Overalls', groupName: 'Overalls & Shirts' },
            { keyword: 'Leather Jacket', groupName: 'Leather Jackets' },
            { keyword: 'Turtleneck', groupName: 'Turtlenecks' },
            { keyword: 'Letterman Jacket', groupName: 'Letterman Jackets' },
            { keyword: 'Hoodie White', groupName: 'VSC Hoodie' },
            { keyword: 'Puffy Jacket', groupName: 'Puffy Jackets' },
            { keyword: 'Puffy Vest', groupName: 'Puffy Vests' },
            { keyword: 'Driving Jacket', groupName: 'Driving Jackets' },
            { keyword: 'Pilot Jacket', groupName: 'Pilot Jackets' },
            { keyword: 'Hooded Jacket', groupName: 'Hooded Jackets' },
            { keyword: 'Fur Jacket', groupName: 'Fur Jackets' },
            { keyword: 'Hoodie Up', groupName: 'Hoodie Ups', exclude: ['Hoodie Up Doge', 'Hoodie Up Pepe'] },
            { keyword: 'Hoodie', groupName: 'Hoodies (Down)', exclude: ['Hoodie Up Doge', 'Hoodie Up Pepe', 'Hoodie Black SuperRare'] },
            { keyword: 'Surfer', groupName: 'Surfers' },
            { keyword: 'Farmer Plants', groupName: 'Farmer & Plants' },
        ];

        const getGroupedTraitName = (value: string): string => {
            for (const rule of TRAIT_GROUPS) {
                if (value.includes(rule.keyword)) {
                    if (rule.exclude && rule.exclude.includes(value)) continue;
                    return rule.groupName;
                }
            }
            return value;
        }

        // Aggregate stats by trait
        const traitStats: Record<string, TraitStats> = {};
        // Track best GVC per trait (highest +/-)
        const bestGvcPerTrait: Record<string, { id: number; diff: number }> = {};
        // Track which GVCs have already been counted per group to avoid double-counting
        const seenGvcsPerGroup: Record<string, Set<number>> = {};

        // Hardcoded 1/1 token IDs — aggregate their stats directly
        const ONE_OF_ONE_IDS = new Set([1400, 430, 6731, 975, 1151, 2943, 4889, 5275, 4113]);
        let bestOneOfOneDiff = -Infinity;
        let bestOneOfOneId = 1400;
        const oneOfOneEntry: TraitStats = {
            value: '1-of-1s',
            wins: 0,
            losses: 0,
            matches: 0,
            uniqueGvcs: 0,
            topGvcId: 1400
        };
        topIds.forEach((idStr, index) => {
            const numId = Number(idStr);
            if (!ONE_OF_ONE_IDS.has(numId)) return;
            const stats: any = statsResults[index] || { wins: 0, losses: 0, matches: 0 };
            const wins = Number(stats.wins || 0);
            const losses = Number(stats.losses || 0);
            const matches = Number(stats.matches || 0);
            const diff = wins - losses;
            oneOfOneEntry.wins += wins;
            oneOfOneEntry.losses += losses;
            oneOfOneEntry.matches += matches;
            oneOfOneEntry.uniqueGvcs += 1;
            if (diff > bestOneOfOneDiff) {
                bestOneOfOneDiff = diff;
                bestOneOfOneId = numId;
                oneOfOneEntry.topGvcId = numId;
            }
        });
        traitStats['1-of-1s'] = oneOfOneEntry;
        bestGvcPerTrait['1-of-1s'] = { id: bestOneOfOneId, diff: bestOneOfOneDiff };
        seenGvcsPerGroup['1-of-1s'] = new Set(ONE_OF_ONE_IDS);

        topIds.forEach((idStr, index) => {
            const id = String(idStr);
            const numId = Number(id);

            // Skip 1/1 GVCs from normal trait processing
            if (ONE_OF_ONE_IDS.has(numId)) return;

            const stats: any = statsResults[index] || { wins: 0, losses: 0, matches: 0 };
            const wins = Number(stats.wins || 0);
            const losses = Number(stats.losses || 0);
            const matches = Number(stats.matches || 0);
            const diff = wins - losses;

            const traits = traitMap[id];
            if (!traits) return;

            Object.entries(traits).forEach(([category, value]) => {
                if (category === 'Background' || category === 'Type' || category === 'Rank' || category === 'Score' || category === 'id') return;

                const rawVal = String(value);
                const valStr = getGroupedTraitName(rawVal);

                if (!traitStats[valStr]) {
                    traitStats[valStr] = {
                        value: valStr,
                        wins: 0,
                        losses: 0,
                        matches: 0,
                        uniqueGvcs: 0,
                        topGvcId: numId
                    };
                    bestGvcPerTrait[valStr] = { id: numId, diff };
                    seenGvcsPerGroup[valStr] = new Set();
                }

                // Only count this GVC's stats once per group
                if (!seenGvcsPerGroup[valStr].has(numId)) {
                    seenGvcsPerGroup[valStr].add(numId);
                    const entry = traitStats[valStr];
                    entry.wins += wins;
                    entry.losses += losses;
                    entry.matches += matches;
                    entry.uniqueGvcs += 1;

                    // Track the GVC with the best +/- for this trait
                    if (!bestGvcPerTrait[valStr] || diff > bestGvcPerTrait[valStr].diff) {
                        bestGvcPerTrait[valStr] = { id: numId, diff };
                        entry.topGvcId = numId;
                    }
                }
            });
        });

        // Convert to array, filter excluded traits, and sort
        const EXCLUDED_TRAITS = [
            'No Hair',
            'Holo Leader Eyes',
            'Holographic Helmet',
            'Holographic Armor',
            'Champion Eyes',
            'Champion Helmet',
            'Champion Plate Armor',
            'Chill Vibes Guy Shirt',
            'XRay Skull',
            'Skull',
            'Bones',
            'Electro Mischevious',
            'Pebbles and Seeds',
            'Bud',
            'Stems',
            'Cosmic Calm Smile',
            'Cosmic Meditation',
            'Boogie Hair',
            'Groove Fur',
            'Cosmic Smile',
            'Candy Blob',
            'Melted',
            'Candy Glass',
            'Cosmic Wide Smile',
            'Cosmic Wink',
            'Cosmic Mischevious',
            'Stone Smile',
            'Chiseled Rock',
            'Tank Top Cosmic',
            'Cosmic Happy',
            'Bad Vibes Eyes',
            'Storm Cloud',
            'Cloud Body',
        ];
        const rankings = Object.values(traitStats)
            .filter(t => !EXCLUDED_TRAITS.includes(t.value))
            .sort((a, b) => {
                const rateA = a.matches > 0 ? a.wins / a.matches : 0;
                const rateB = b.matches > 0 ? b.wins / b.matches : 0;
                if (rateA !== rateB) return rateB - rateA;

                const diffA = a.wins - a.losses;
                const diffB = b.wins - b.losses;
                return rateB - rateA;
            });

        return NextResponse.json({
            rankings
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });

    } catch (error) {
        console.error('Trait Rankings API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
