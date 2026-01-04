/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'openseauserdata.com',
            },
            {
                protocol: 'https',
                hostname: 'dweb.link',
            },
            {
                protocol: 'https',
                hostname: 'nftstorage.link',
            },
            {
                protocol: 'https',
                hostname: 'i.seadn.io', // Common OpenSea image host
            },
            {
                protocol: 'https',
                hostname: 'cloudflare-ipfs.com',
            },
            {
                protocol: 'https',
                hostname: 'ipfs.io',
            }
        ],
    },
};

export default nextConfig;
