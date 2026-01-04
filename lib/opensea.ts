const OPENSEA_API_KEY = '003c902b643e4b06b14ae18bda215739';
const CONTRACT_ADDRESS = '0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4';

interface OpenSeaNftResponse {
    nft: {
        identifier: string;
        collection: string;
        contract: string;
        token_standard: string;
        name: string;
        description: string;
        image_url: string;
        metadata_url: string;
        owners: {
            address: string;
            quantity: number;
        }[];
    };
}

interface OwnerData {
    address: string;
    username: string | null;
    display: string;
}

// Cache to prevent hitting rate limits
const ownerCache = new Map<number, OwnerData>();
const accountCache = new Map<string, string | null>(); // Address -> Username

// Rate Limiting Queue
let requestQueue = Promise.resolve();
const throttle = () => {
    const delay = 500; // 500ms delay between requests (2 req/s) - Safe for free tier
    requestQueue = requestQueue.then(() => new Promise(resolve => setTimeout(resolve, delay)));
    return requestQueue;
};

const resolveAccount = async (address: string): Promise<string | null> => {
    if (accountCache.has(address)) {
        return accountCache.get(address) || null;
    }

    // Wait for throttle before request
    await throttle();

    try {
        const url = `https://api.opensea.io/api/v2/accounts/${address}`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'x-api-key': OPENSEA_API_KEY
            }
        };

        const response = await fetch(url, options);
        if (!response.ok) {
            accountCache.set(address, null);
            return null;
        }

        const data: any = await response.json();
        const username = data.username;

        if (username) {
            accountCache.set(address, username);
            return username;
        }

        accountCache.set(address, null);
        return null; // No username found
    } catch (err) {
        console.error('Error resolving account:', err);
        return null;
    }
}

export const fetchNftOwner = async (tokenId: number): Promise<OwnerData | null> => {
    // Check cache first (Token ID -> OwnerData)
    if (ownerCache.has(tokenId)) {
        return ownerCache.get(tokenId) || null;
    }

    // Wait for throttle before request
    await throttle();

    try {
        const url = `https://api.opensea.io/api/v2/chain/ethereum/contract/${CONTRACT_ADDRESS}/nfts/${tokenId}`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'x-api-key': OPENSEA_API_KEY
            }
        };

        const response = await fetch(url, options);

        if (!response.ok) {
            console.error(`OpenSea API Error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data: any = await response.json();

        // Try to find the first owner
        const firstOwner = data.nft?.owners?.[0];

        if (!firstOwner) return null;

        const ownerAddress = firstOwner.address;

        // Resolve to username if possible
        const username = await resolveAccount(ownerAddress);
        const display = username || ownerAddress;

        const result = { address: ownerAddress, username, display };
        ownerCache.set(tokenId, result);
        return result;

    } catch (err) {
        console.error('Failed to fetch from OpenSea:', err);
        return null;
    }
};

export const formatDisplayOwner = (owner: string | null): string => {
    if (!owner) return 'Unknown';

    // If it's a wallet address, shorten it
    if (owner.startsWith('0x') && owner.length > 10) {
        return `${owner.substring(0, 6)}...${owner.substring(owner.length - 4)}`;
    }

    // Return as-is for usernames or ENS names
    return owner;
};

/**
 * Get display text and OpenSea link for an owner.
 * Priority: OpenSea username > wallet address
 * ENS names should show the wallet address instead (with working link)
 * Links should NEVER use truncated addresses (containing ...)
 */
export const getOwnerDisplayAndLink = (
    realOwnerData: { address: string; username: string | null } | null,
    fallbackOwner: string
): { display: string; link: string } => {
    // If we have resolved OpenSea data (contains real wallet address)
    if (realOwnerData) {
        const { address, username } = realOwnerData;

        // Username available - use it for both display AND link
        if (username) {
            return { display: username, link: username };
        }

        // No username - use wallet address for display and link
        // This ensures ENS owners get a working link via their wallet address
        return { display: formatDisplayOwner(address), link: address };
    }

    // Fallback to raw owner data (no OpenSea data available)
    // If it's a full wallet address (not truncated)
    if (fallbackOwner?.startsWith('0x') && !fallbackOwner.includes('...')) {
        return { display: formatDisplayOwner(fallbackOwner), link: fallbackOwner };
    }

    // Truncated address - display but don't link (link would be broken)
    if (fallbackOwner?.startsWith('0x') && fallbackOwner.includes('...')) {
        return { display: fallbackOwner, link: '' };
    }

    // ENS name without resolved address - display but can't link without wallet address
    return { display: fallbackOwner || 'Unknown', link: '' };
};

// Cache for wallet holdings count
const holdingsCache = new Map<string, number>();

/**
 * Fetch the total number of GVC NFTs owned by a wallet address.
 * Uses OpenSea API to get accurate collection holdings.
 */
export const fetchWalletGvcCount = async (walletAddress: string): Promise<number> => {
    const normalizedAddress = walletAddress.toLowerCase();

    // Check cache first
    if (holdingsCache.has(normalizedAddress)) {
        return holdingsCache.get(normalizedAddress) || 0;
    }

    // Wait for throttle before request
    await throttle();

    try {
        // Use OpenSea's NFTs by account endpoint with collection filter
        const url = `https://api.opensea.io/api/v2/chain/ethereum/account/${walletAddress}/nfts?collection=good-vibes-club&limit=200`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'x-api-key': OPENSEA_API_KEY
            }
        };

        const response = await fetch(url, options);

        if (!response.ok) {
            console.error(`OpenSea Holdings API Error: ${response.status}`);
            return 0;
        }

        const data: any = await response.json();
        const count = data.nfts?.length || 0;

        // Cache the result
        holdingsCache.set(normalizedAddress, count);

        return count;
    } catch (err) {
        console.error('Failed to fetch wallet holdings:', err);
        return 0;
    }
};
