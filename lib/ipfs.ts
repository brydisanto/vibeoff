export const IPFS_GATEWAYS = [
    'https://nftstorage.link/ipfs/',    // Fastest - Cloudflare CDN backed
    'https://dweb.link/ipfs/',           // Fast - Protocol Labs CDN
    'https://cloudflare-ipfs.com/ipfs/', // Slower fallback
    'https://ipfs.io/ipfs/'              // Slowest fallback
];

// Track whether IPFS is blocked (e.g. in UAE/Dubai)
let ipfsBlocked: boolean | null = null; // null = not yet tested
let blockCheckPromise: Promise<boolean> | null = null;

// Test if IPFS gateways are reachable
export const checkIpfsBlocked = async (): Promise<boolean> => {
    if (ipfsBlocked !== null) return ipfsBlocked;
    if (blockCheckPromise) return blockCheckPromise;

    blockCheckPromise = (async () => {
        try {
            // Try a tiny HEAD request to the fastest gateway
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch('https://nftstorage.link/', {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal,
            });
            clearTimeout(timeout);
            ipfsBlocked = false;
        } catch {
            ipfsBlocked = true;
        }
        return ipfsBlocked;
    })();

    return blockCheckPromise;
};

// Mark IPFS as blocked (called when images fail to load)
export const markIpfsBlocked = () => {
    ipfsBlocked = true;
};

export const isIpfsBlocked = () => ipfsBlocked === true;

export const getIpfsUrl = (originalUrl: string, gatewayIndex: number = 0): string => {
    const parts = originalUrl.split('/ipfs/');
    if (parts.length < 2) return originalUrl;

    const hashAndPath = parts[1].trim();

    // If IPFS is blocked, route through our server-side proxy
    if (ipfsBlocked === true) {
        return `/api/ipfs/${hashAndPath}`;
    }

    // Safety check for index
    const safeIndex = Math.min(Math.max(0, gatewayIndex), IPFS_GATEWAYS.length - 1);

    return `${IPFS_GATEWAYS[safeIndex]}${hashAndPath}`;
};

