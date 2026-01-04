'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LookupPage() {
    const [searchId, setSearchId] = useState('');
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const id = parseInt(searchId);
        if (id > 0 && id <= 6969) {
            router.push(`/gvc/${id}`);
        } else {
            alert('Please enter a valid GVC ID (1-6969)');
        }
    };

    return (
        <main className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
            <Link
                href="/"
                className="absolute top-8 left-8 bg-[#5C5228] text-[#DDD] hover:text-white hover:bg-[#6D6230] transition-colors border border-[#7D7036] px-6 py-2 rounded-full font-bold uppercase text-xs md:text-sm tracking-wide"
            >
                ← Back to Game
            </Link>

            <div className="w-full max-w-md text-center space-y-8">
                <h1 className="text-4xl md:text-6xl font-display text-gvc-gold animate-pulse">
                    GVC LOOKUP
                </h1>

                <p className="text-gray-400 font-mundial text-sm md:text-lg">
                    Enter any GVC ID # to view detailed stats and match history.
                </p>

                <form onSubmit={handleSearch} className="flex flex-col gap-4">
                    <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="w-full px-6 py-4 bg-[#111] border-2 border-white/20 rounded-xl text-3xl font-display text-center text-white placeholder-gray-700 focus:outline-none focus:border-gvc-gold transition-colors"
                        autoFocus
                    />

                    <button
                        type="submit"
                        disabled={!searchId}
                        className="w-full bg-gvc-gold text-black font-bold text-xl py-4 rounded-xl uppercase tracking-wider hover:bg-[#FFE058] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Search Stats
                    </button>
                </form>

                <div className="text-xs text-gray-600 font-mono mt-8">
                    * Match history recording started on Dec 26, 2025.
                </div>
            </div>
        </main>
    );
}
