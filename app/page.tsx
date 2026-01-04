'use client';

import GameInterface from '@/components/GameInterface';
import Image from "next/image";
import { motion } from "framer-motion";

import dynamic from 'next/dynamic';


const GlobalFeedDrawer = dynamic(() => import('@/components/GlobalFeedDrawer'), { ssr: false });

export default function Home() {
    return (
        <main className="flex md:min-h-screen flex-col items-center justify-start md:justify-center p-4 pt-4 md:p-24 md:pt-12 bg-[url('/grid.svg')] bg-center">
            <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex mt-4 md:mt-0 mb-0">
                <div className="flex flex-col items-center">
                    <p className="text-gvc-gold font-bold font-mundial tracking-widest text-sm mb-4 uppercase">Good Vibes Club Presents</p>
                    <motion.h1
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 10,
                            mass: 1
                        }}
                        className="text-6xl md:text-8xl lg:text-9xl font-cooper text-center text-gvc-gold glowing-text leading-none"
                    >
                        VIBE OFF!
                    </motion.h1>
                </div>
            </div>

            <div className="mt-4 w-full">
                <GameInterface />
            </div>

            <GlobalFeedDrawer />
        </main>
    );
}
