/**
 * GET /api/recommendations?wallet={address}&maxBudget={ethAmount}
 * 
 * Returns personalized GVC recommendations based on voting patterns.
 * - "All Time Vibes": Top 10 best matches regardless of listing status
 * - "Listed Recommendations": Top 10 currently listed GVCs within budget
 * - "Favorite Traits": User's top trait preferences from voting
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { INITIAL_CHARACTERS } from '@/lib/data';
import traitMap from '@/lib/trait_map.json';

export const dynamic = 'force-dynamic';

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || '003c902b643e4b06b14ae18bda215739';
const CONTRACT_ADDRESS = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';
const GVC_COLLECTION_SLUG = 'good-vibes-club';

// Character lookup map
const characterMap = new Map(INITIAL_CHARACTERS.map(c => [c.id, c]));

// ─── Trait Grouping (reuse from trait rankings) ────────────────────────────────
const TRAIT_GROUPS: { keyword: string; groupName: string; exclude?: string[] }[] = [
    { keyword: 'Headphones', groupName: 'Headphones' },
    { keyword: 'Middle Part', groupName: 'Middle Parts' },
    { keyword: 'Wide Brim Hat', groupName: 'Wide Brim Hats' },
    { keyword: 'Top Messy', groupName: 'Top Messy Hair' },
    { keyword: 'Bowl Cut', groupName: 'Bowl Cuts' },
    { keyword: 'Mohawk', groupName: 'Mohawks' },
    { keyword: 'Flat Top', groupName: 'Flat Tops' },
    { keyword: 'Manbun', groupName: 'Manbuns' },
    { keyword: 'Classic', groupName: 'Classic Hair' },
    { keyword: 'Ballcap', groupName: 'Ballcaps', exclude: ['Ballcap Forward Black Superrare'] },
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
};

// ─── Get traits for a GVC ID ───────────────────────────────────────────────────
const getGvcTraits = (id: number): string[] => {
    const traits = (traitMap as Record<string, Record<string, string>>)[String(id)];
    if (!traits) return [];
    return Object.values(traits).map(v => getGroupedTraitName(String(v)));
};

// ─── Listings Cache ────────────────────────────────────────────────────────────
let listingsCache: { tokenId: number; price: number; link: string }[] | null = null;
let listingsCacheTimestamp = 0;
const LISTINGS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const fetchActiveListings = async (): Promise<{ tokenId: number; price: number; link: string }[]> => {
    const now = Date.now();
    if (listingsCache && (now - listingsCacheTimestamp) < LISTINGS_CACHE_TTL) {
        return listingsCache;
    }

    try {
        const listings: { tokenId: number; price: number; link: string }[] = [];
        let next: string | null = null;

        // Paginate through all listings
        for (let page = 0; page < 10; page++) {
            const requestUrl: string = next ||
                `https://api.opensea.io/api/v2/listings/collection/${GVC_COLLECTION_SLUG}/all?limit=100`;

            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    'x-api-key': OPENSEA_API_KEY
                }
            });

            if (!response.ok) {
                console.error(`OpenSea Listings API Error: ${response.status}`);
                break;
            }

            const data = await response.json();

            if (data.listings) {
                for (const listing of data.listings) {
                    try {
                        const tokenId = parseInt(
                            listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria ||
                            listing.protocol_data?.parameters?.offerer_identifier || '0'
                        );
                        const priceWei = BigInt(
                            listing.price?.current?.value || '0'
                        );
                        const priceEth = Number(priceWei) / 1e18;

                        if (tokenId > 0 && tokenId <= 6969 && priceEth > 0) {
                            listings.push({
                                tokenId,
                                price: priceEth,
                                link: `https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}/${tokenId}`
                            });
                        }
                    } catch (e) {
                        // Skip malformed listings
                    }
                }
            }

            next = data.next ? `https://api.opensea.io/api/v2/listings/collection/${GVC_COLLECTION_SLUG}/all?limit=100&next=${data.next}` : null;
            if (!next) break;
        }

        // Deduplicate by tokenId, keeping lowest price
        const bestPrices = new Map<number, { tokenId: number; price: number; link: string }>();
        for (const listing of listings) {
            const existing = bestPrices.get(listing.tokenId);
            if (!existing || listing.price < existing.price) {
                bestPrices.set(listing.tokenId, listing);
            }
        }

        listingsCache = Array.from(bestPrices.values());
        listingsCacheTimestamp = now;

        console.log(`[Recommendations] Fetched ${listingsCache.length} active listings`);
        return listingsCache;
    } catch (err) {
        console.error('Failed to fetch listings:', err);
        return listingsCache || [];
    }
};

// ─── Main API Handler ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');
    const maxBudget = parseFloat(searchParams.get('maxBudget') || '999');

    if (!wallet) {
        return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    const normalizedWallet = wallet.toLowerCase();

    try {
        // 1. Fetch user's vote history
        const rawVotes = await kv.lrange(`votes:wallet:${normalizedWallet}`, 0, 199);
        const votes = rawVotes.map((v: any) => {
            try {
                return typeof v === 'string' ? JSON.parse(v) : v;
            } catch { return null; }
        }).filter(Boolean);

        const totalVotes = votes.length;

        if (totalVotes < 20) {
            return NextResponse.json({
                needsMoreVotes: true,
                currentVotes: totalVotes,
                requiredVotes: 20,
                message: `Vote on at least ${20 - totalVotes} more Vibe Offs to unlock recommendations!`
            });
        }

        // 2. Build trait preference profile
        const traitScores: Record<string, number> = {};
        const traitVoteCounts: Record<string, { voted: number; rejected: number }> = {};

        for (const vote of votes) {
            const winnerTraits = getGvcTraits(vote.winnerId);
            const loserTraits = getGvcTraits(vote.loserId);

            // Winner traits get +1
            for (const trait of winnerTraits) {
                traitScores[trait] = (traitScores[trait] || 0) + 1;
                if (!traitVoteCounts[trait]) traitVoteCounts[trait] = { voted: 0, rejected: 0 };
                traitVoteCounts[trait].voted++;
            }

            // Loser traits get -0.5
            for (const trait of loserTraits) {
                traitScores[trait] = (traitScores[trait] || 0) - 0.5;
                if (!traitVoteCounts[trait]) traitVoteCounts[trait] = { voted: 0, rejected: 0 };
                traitVoteCounts[trait].rejected++;
            }
        }

        // 3. Get user's owned GVCs (to exclude from recommendations)
        const ownedGvcsRaw = await kv.smembers(`owner:${normalizedWallet}`);
        const ownedGvcIds = new Set(ownedGvcsRaw.map((id: any) => Number(id)));

        // 4. Score ALL GVCs for "All Time Vibes"
        const allGvcScores: { id: number; score: number; matchingTraits: string[] }[] = [];

        for (let id = 1; id <= 6969; id++) {
            if (ownedGvcIds.has(id)) continue; // Skip owned

            const traits = getGvcTraits(id);
            if (traits.length === 0) continue;

            let score = 0;
            const matchingTraits: string[] = [];

            for (const trait of traits) {
                const traitScore = traitScores[trait] || 0;
                if (traitScore > 0) {
                    score += traitScore;
                    matchingTraits.push(trait);
                }
            }

            if (score > 0) {
                allGvcScores.push({ id, score, matchingTraits });
            }
        }

        // Sort by score descending
        allGvcScores.sort((a, b) => b.score - a.score);

        // 5. "All Time Vibes" — top 10 regardless of listing
        const allTimeVibes = allGvcScores.slice(0, 10).map(item => {
            const char = characterMap.get(item.id);
            return {
                id: item.id,
                name: char?.name || `GVC #${item.id}`,
                url: char?.url || '',
                score: Math.round(item.score * 10) / 10,
                matchingTraits: [...new Set(item.matchingTraits)].slice(0, 3),
                opensea: `https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}/${item.id}`
            };
        });

        // 6. Fetch active listings and filter for "Listed Recommendations"
        const listings = await fetchActiveListings();
        const listingMap = new Map(listings.map(l => [l.tokenId, l]));

        const listedRecommendations = allGvcScores
            .filter(item => {
                const listing = listingMap.get(item.id);
                return listing && listing.price <= maxBudget;
            })
            .slice(0, 10)
            .map(item => {
                const char = characterMap.get(item.id);
                const listing = listingMap.get(item.id)!;
                return {
                    id: item.id,
                    name: char?.name || `GVC #${item.id}`,
                    url: char?.url || '',
                    score: Math.round(item.score * 10) / 10,
                    matchingTraits: [...new Set(item.matchingTraits)].slice(0, 3),
                    price: Math.round(listing.price * 10000) / 10000,
                    opensea: listing.link
                };
            });

        // 7. "Favorite Traits" — top 5 trait preferences
        const favoriteTraits = Object.entries(traitScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([trait, score]) => ({
                trait,
                score: Math.round(score * 10) / 10,
                timesVotedFor: traitVoteCounts[trait]?.voted || 0,
                timesRejected: traitVoteCounts[trait]?.rejected || 0,
            }));

        return NextResponse.json({
            needsMoreVotes: false,
            totalVotes,
            allTimeVibes,
            listedRecommendations,
            favoriteTraits,
            totalListings: listings.length,
            maxBudget
        });

    } catch (error) {
        console.error('Recommendations API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
