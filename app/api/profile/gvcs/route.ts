import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_CHARACTERS } from '@/lib/data';
import { kv } from '@/lib/kv';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const OPENSEA_API_KEY = '003c902b643e4b06b14ae18bda215739';
const GVC_CONTRACT = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';

/**
 * Fetch vaults that have delegated to this hot wallet from delegate.xyz
 */
async function getVaultsForDelegate(hotWallet: string): Promise<string[]> {
    try {
        const response = await fetch(`https://api.delegate.xyz/registry/v2/${hotWallet}`);
        if (!response.ok) {
            console.error('delegate.xyz API error:', response.status);
            return [];
        }

        const delegations = await response.json();

        // Filter for incoming delegations (where this wallet is the 'to'/delegate)
        // Accept: ALL delegations OR contract-specific delegations for GVC
        const vaults = delegations
            .filter((d: any) => {
                const isIncoming = d.to?.toLowerCase() === hotWallet.toLowerCase();
                const isAll = d.type === 'ALL';
                const isGvcContract = d.contract?.toLowerCase() === GVC_CONTRACT.toLowerCase();
                return isIncoming && (isAll || isGvcContract);
            })
            .map((d: any) => d.from as string);

        // Dedupe vaults
        return Array.from(new Set(vaults));
    } catch (error) {
        console.error('Failed to fetch delegations:', error);
        return [];
    }
}

/**
 * Fetch GVCs owned by a specific address from OpenSea
 */
async function fetchGvcsForAddress(address: string): Promise<number[]> {
    try {
        const response = await fetch(
            `https://api.opensea.io/api/v2/chain/ethereum/account/${address}/nfts?limit=200`,
            {
                headers: {
                    'x-api-key': OPENSEA_API_KEY,
                    'accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.error(`OpenSea API error for ${address}:`, response.status);
            return [];
        }

        const data = await response.json();
        const nfts = data.nfts || [];

        // Filter to only GVC NFTs by contract address
        const gvcNfts = nfts.filter((nft: any) => {
            const contract = nft.contract?.toLowerCase() || nft.contract_address?.toLowerCase() || '';
            return contract === GVC_CONTRACT.toLowerCase();
        });

        // Extract GVC IDs
        return gvcNfts
            .map((nft: any) => parseInt(nft.identifier || nft.token_id || '0'))
            .filter((id: number) => id > 0 && id <= 6969);
    } catch (error) {
        console.error(`Failed to fetch GVCs for ${address}:`, error);
        return [];
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    try {
        // 1. Check for delegated vaults from delegate.xyz
        const delegatedVaults = await getVaultsForDelegate(address);
        console.log(`Found ${delegatedVaults.length} delegated vaults for ${address}`);

        // 2. Fetch GVCs from connected wallet + all delegated vaults
        const allAddresses = [address, ...delegatedVaults];
        const gvcIdsByAddress: Map<number, string> = new Map(); // Track which address owns which GVC

        for (const addr of allAddresses) {
            const gvcIds = await fetchGvcsForAddress(addr);
            gvcIds.forEach(id => {
                if (!gvcIdsByAddress.has(id)) {
                    gvcIdsByAddress.set(id, addr);
                }
            });
        }

        const allGvcIds = Array.from(gvcIdsByAddress.keys());
        console.log(`Found ${allGvcIds.length} total GVCs across ${allAddresses.length} addresses`);

        // 3. Fetch stats for each GVC
        const gvcsWithStats = await Promise.all(
            allGvcIds.map(async (id) => {
                const char = INITIAL_CHARACTERS.find(c => c.id === id);
                if (!char) return null;

                // Get stats from Redis
                let stats = { wins: 0, losses: 0, matches: 0, rank: 0, winStreak: 0 };
                try {
                    const redisStats = await kv.hgetall(`stats:alltime:${id}`);
                    const rank = await kv.zrevrank('leaderboard:alltime', id.toString());

                    if (redisStats) {
                        stats = {
                            wins: Number(redisStats.wins) || 0,
                            losses: Number(redisStats.losses) || 0,
                            matches: Number(redisStats.matches) || 0,
                            rank: (rank !== null ? rank + 1 : 0),
                            winStreak: Number(redisStats.winStreak) || 0
                        };
                    }
                } catch (e) {
                    console.error(`Failed to get stats for ${id}:`, e);
                }

                return {
                    id,
                    name: char.name,
                    url: char.url,
                    allTime: stats,
                    // Include source if from delegated vault
                    delegatedFrom: gvcIdsByAddress.get(id) !== address ? gvcIdsByAddress.get(id) : undefined
                };
            })
        );

        const gvcs = gvcsWithStats.filter(Boolean);

        return NextResponse.json({
            gvcs,
            gvcCount: allGvcIds.length,
            delegatedVaults: delegatedVaults.length > 0 ? delegatedVaults : undefined
        });
    } catch (error) {
        console.error('Profile GVCs error:', error);
        return NextResponse.json({ error: 'Failed to fetch GVCs' }, { status: 500 });
    }
}
