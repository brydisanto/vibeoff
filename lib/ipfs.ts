export const IPFS_GATEWAYS = [
    'https://nftstorage.link/ipfs/',    // Fastest - Cloudflare CDN backed
    'https://dweb.link/ipfs/',           // Fast - Protocol Labs CDN
    'https://cloudflare-ipfs.com/ipfs/', // Slower fallback
    'https://ipfs.io/ipfs/'              // Slowest fallback
];

export const getIpfsUrl = (originalUrl: string, gatewayIndex: number = 0): string => {
    const parts = originalUrl.split('/ipfs/');
    if (parts.length < 2) return originalUrl;

    const hashAndPath = parts[1].trim();
    // Ensure we don't have double hyphens or spaces if distinct from original structure
    // Logic assumes: originalUrl is valid IPFS url or just needs gateway swap

    // Safety check for index
    const safeIndex = Math.min(Math.max(0, gatewayIndex), IPFS_GATEWAYS.length - 1);

    return `${IPFS_GATEWAYS[safeIndex]}${hashAndPath}`;
};
