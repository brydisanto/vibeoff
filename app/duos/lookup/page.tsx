'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DuosLookupPage() {
    const [searchId, setSearchId] = useState('');
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchId.trim();
        if (trimmed) {
            router.push(`/duos/${trimmed}`);
        } else {
            alert('Please enter a DUO ID');
        }
    };

    return (
        <main className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
            <Link
                href="/duos"
                className="absolute top-8 left-8 px-4 md:px-6 py-3 md:py-4 bg-[#111] text-gray-400 hover:text-white hover:bg-[#222] rounded-lg font-bold uppercase text-[11px] md:text-sm tracking-wide transition-all border border-transparent hover:border-white/20 flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                BACK
            </Link>

            <div className="w-full max-w-md text-center space-y-8">
                <h1 className="text-4xl md:text-6xl font-display text-gvc-gold animate-pulse">
                    DUOS LOOKUP
                </h1>

                <p className="text-gray-400 font-mundial text-sm md:text-lg">
                    Enter a DUO ID to view detailed stats, rank, and battle history.
                </p>

                <form onSubmit={handleSearch} className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="e.g. 1500_2000"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="w-full px-6 py-4 bg-[#111] border-2 border-white/20 rounded-xl text-2xl font-mono text-center text-white placeholder-gray-700 focus:outline-none focus:border-gvc-gold transition-colors"
                        autoFocus
                    />

                    <button
                        type="submit"
                        disabled={!searchId}
                        className="w-full bg-gvc-gold text-black font-bold text-xl py-4 rounded-xl uppercase tracking-wider hover:bg-[#FFE058] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Search DUO
                    </button>
                </form>

                <div className="text-xs text-gray-600 font-mono mt-8">
                    * DUO IDs are formatted as GVC1_GVC2 (e.g. 1500_2000)
                </div>
            </div>
        </main>
    );
}
