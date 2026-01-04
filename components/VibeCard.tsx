import { Character } from '@/lib/data';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchNftOwner, getOwnerDisplayAndLink } from '@/lib/opensea';
import { IPFS_GATEWAYS, getIpfsUrl } from '@/lib/ipfs';

interface VibeCardProps {
    character: Character;
    onClick: () => void;
    disabled?: boolean;
    stats?: { wins: number; losses: number; matches: number; };
}

export default function VibeCard({ character, onClick, disabled, stats }: VibeCardProps) {
    const [realOwner, setRealOwner] = useState<{ address: string, username: string | null, display: string } | null>(null);
    const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
    const [isImageLoading, setIsImageLoading] = useState(true);

    const displayStats = stats || character.allTime || { wins: 0, losses: 0, matches: 0 };

    useEffect(() => {
        // Reset to primary gateway when character changes
        setCurrentGatewayIndex(0);
        setIsImageLoading(true);
        // Reset real owner
        setRealOwner(null);

        // Fetch real owner
        const getOwner = async () => {
            const ownerData = await fetchNftOwner(character.id);
            if (ownerData) setRealOwner(ownerData);
        };
        getOwner();
    }, [character.id, character.url]);

    const imageUrl = getIpfsUrl(character.url, currentGatewayIndex);

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex flex-col h-full bg-[#1A1A1A] rounded-lg md:rounded-2xl overflow-hidden border border-white/10 hover:border-gvc-gold hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] transition-all duration-300 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={onClick}
        >
            {/* Image Section - Full Square */}
            <div className={`relative aspect-square w-full ${isImageLoading ? 'bg-black' : 'bg-white'} transition-colors duration-300`}>
                {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="w-6 h-6 md:w-10 md:h-10 border-4 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin" />
                    </div>
                )}
                <Image
                    src={imageUrl}
                    alt={character.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 50vw"
                    priority
                    unoptimized
                    className={`object-cover brightness-105 transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoadingComplete={() => setIsImageLoading(false)}
                    onError={() => {
                        const nextIndex = currentGatewayIndex + 1;
                        if (nextIndex < IPFS_GATEWAYS.length) {
                            setCurrentGatewayIndex(nextIndex);
                        }
                    }}
                />
            </div>

            {/* Details Section - Minimal Footer */}
            <div className="flex justify-between items-center p-3 md:p-5 bg-[#1A1A1A] border-t border-white/5 flex-grow">

                {/* Left Side: Name & Owner */}
                <div className="flex flex-col min-w-0 pr-2">
                    {/* Name */}
                    <h3 className="text-lg md:text-2xl font-cooper text-white mb-0.5 md:mb-1 leading-tight truncate">
                        <span className="md:hidden">GVC #{character.id}</span>
                        <span className="hidden md:inline">{character.name}</span>
                    </h3>

                    {/* Owner */}
                    {(() => {
                        const ownerInfo = getOwnerDisplayAndLink(realOwner, character.owner);
                        return (
                            <div className="flex items-center gap-1 text-[10px] md:text-sm text-gray-400 font-mono truncate">
                                <span className="opacity-50">OWNER</span>
                                {ownerInfo.link ? (
                                    <a
                                        href={`https://opensea.io/${ownerInfo.link}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className={`truncate ${realOwner ? 'text-gvc-gold font-bold' : 'text-gray-500 hover:text-white'}`}
                                        title="View profile on OpenSea"
                                    >
                                        {ownerInfo.display}
                                    </a>
                                ) : (
                                    <span className={`truncate ${realOwner ? 'text-gvc-gold font-bold' : 'text-gray-500'}`}>
                                        {ownerInfo.display}
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Right Side: OpenSea Icon */}
                <a
                    href={`https://opensea.io/assets/ethereum/0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4/${character.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 bg-white/5 hover:bg-white/10 p-2 md:p-3 rounded-lg border border-white/5 hover:border-white/20 transition-all opacity-70 hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                    title="View on OpenSea"
                >
                    <img
                        src="/opensea-v2.png"
                        alt="OpenSea"
                        className="w-5 h-5 md:w-6 md:h-6 opacity-90"
                    />
                </a>
            </div>
        </motion.div>
    );
}
