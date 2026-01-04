'use client';

// Sample activity data for design preview
const SAMPLE_ACTIVITY = [
    { id: '1', winnerId: 3660, loserId: 1234, winnerName: 'GVC #3660', loserName: 'GVC #1234', timestamp: Date.now() - 60000 },
    { id: '2', winnerId: 5678, loserId: 1855, winnerName: 'GVC #5678', loserName: 'GVC #1855', timestamp: Date.now() - 180000 },
    { id: '3', winnerId: 1270, loserId: 9999, winnerName: 'GVC #1270', loserName: 'GVC #9999', timestamp: Date.now() - 300000 },
    { id: '4', winnerId: 2222, loserId: 4096, winnerName: 'GVC #2222', loserName: 'GVC #4096', timestamp: Date.now() - 420000 },
    { id: '5', winnerId: 6471, loserId: 3333, winnerName: 'GVC #6471', loserName: 'GVC #3333', timestamp: Date.now() - 600000 },
];

// User's GVC IDs for highlighting
const USER_GVC_IDS = [3660, 1855, 1270, 4096, 6471];

const isUserGvc = (id: number) => USER_GVC_IDS.includes(id);

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ActivityDesignPage() {
    return (
        <main className="min-h-screen bg-black text-white p-4 md:p-8">
            <h1 className="text-4xl font-cooper text-gvc-gold text-center mb-4">Activity Feed Design Options</h1>
            <p className="text-center text-gray-500 mb-16 text-sm">Your GVCs are highlighted</p>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">

                {/* OPTION A: Current - List Style */}
                <section>
                    <h2 className="text-xl font-bold mb-2 text-center text-gray-400">Option A: List</h2>
                    <p className="text-center text-gray-600 text-xs mb-4">Current style, emoji indicators</p>
                    <div className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                            {SAMPLE_ACTIVITY.map(item => {
                                const isWinner = isUserGvc(item.winnerId);
                                const isLoser = isUserGvc(item.loserId);
                                return (
                                    <div key={item.id} className={`p-4 flex items-center gap-4 ${isWinner || isLoser ? 'bg-white/5' : ''}`}>
                                        <div className="text-2xl">{isWinner ? '🏆' : isLoser ? '💔' : '⚔️'}</div>
                                        <div className="flex-1 text-left">
                                            <div className="text-sm">
                                                <span className={isWinner ? 'text-gvc-gold font-bold' : 'text-white'}>{item.winnerName}</span>
                                                <span className="text-gray-600"> beat </span>
                                                <span className={isLoser ? 'text-red-400' : 'text-gray-400'}>{item.loserName}</span>
                                            </div>
                                            <div className="text-xs text-gray-600 mt-0.5">{formatTime(item.timestamp)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* OPTION B: Compact Ticker */}
                <section>
                    <h2 className="text-xl font-bold mb-2 text-center text-gray-400">Option B: Compact Ticker</h2>
                    <p className="text-center text-gray-600 text-xs mb-4">Single line per result</p>
                    <div className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                            {SAMPLE_ACTIVITY.map(item => {
                                const isWinner = isUserGvc(item.winnerId);
                                const isLoser = isUserGvc(item.loserId);
                                return (
                                    <div key={item.id} className={`px-4 py-2 flex items-center justify-between ${isWinner || isLoser ? 'bg-white/5' : ''}`}>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-lg">{isWinner ? '🏆' : isLoser ? '💔' : '⚔️'}</span>
                                            <span className={isWinner ? 'text-gvc-gold font-bold' : 'text-white'}>{item.winnerName}</span>
                                            <span className="text-gray-600">→</span>
                                            <span className={isLoser ? 'text-red-400' : 'text-gray-500'}>{item.loserName}</span>
                                        </div>
                                        <div className="text-xs text-gray-600">{formatTime(item.timestamp)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* OPTION C: Cards with VS */}
                <section>
                    <h2 className="text-xl font-bold mb-2 text-center text-gray-400">Option C: VS Cards</h2>
                    <p className="text-center text-gray-600 text-xs mb-4">Larger cards with centered VS</p>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {SAMPLE_ACTIVITY.slice(0, 3).map(item => {
                            const isWinner = isUserGvc(item.winnerId);
                            const isLoser = isUserGvc(item.loserId);
                            return (
                                <div key={item.id} className={`bg-zinc-900 rounded-xl border border-white/10 p-4 ${isWinner || isLoser ? 'border-gvc-gold/30' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="text-center flex-1">
                                            <div className={`text-lg font-display ${isWinner ? 'text-gvc-gold' : 'text-white'}`}>{item.winnerName}</div>
                                            <div className="text-green-500 text-xs">WINNER</div>
                                        </div>
                                        <div className="px-4 text-gray-600 font-bold">VS</div>
                                        <div className="text-center flex-1">
                                            <div className={`text-lg font-display ${isLoser ? 'text-red-400' : 'text-gray-400'}`}>{item.loserName}</div>
                                            <div className="text-red-500/50 text-xs">LOST</div>
                                        </div>
                                    </div>
                                    <div className="text-center text-xs text-gray-600 mt-2">{formatTime(item.timestamp)}</div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* OPTION D: Color Coded */}
                <section>
                    <h2 className="text-xl font-bold mb-2 text-center text-gray-400">Option D: Color Coded</h2>
                    <p className="text-center text-gray-600 text-xs mb-4">Green/red bars for Win/Loss</p>
                    <div className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                            {SAMPLE_ACTIVITY.map(item => {
                                const isWinner = isUserGvc(item.winnerId);
                                const isLoser = isUserGvc(item.loserId);
                                const bgColor = isWinner ? 'bg-green-900/20 border-l-4 border-green-500' : isLoser ? 'bg-red-900/20 border-l-4 border-red-500' : '';
                                return (
                                    <div key={item.id} className={`p-3 flex items-center gap-3 ${bgColor}`}>
                                        <div className="flex-1">
                                            <div className="text-sm">
                                                <span className={isWinner ? 'text-green-400 font-bold' : 'text-white'}>{item.winnerName}</span>
                                                <span className="text-gray-600"> beat </span>
                                                <span className={isLoser ? 'text-red-400 font-bold' : 'text-gray-400'}>{item.loserName}</span>
                                            </div>
                                            <div className="text-xs text-gray-600 mt-0.5">{formatTime(item.timestamp)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* OPTION E: Timeline */}
                <section>
                    <h2 className="text-xl font-bold mb-2 text-center text-gray-400">Option E: Timeline</h2>
                    <p className="text-center text-gray-600 text-xs mb-4">Vertical timeline with dots</p>
                    <div className="bg-zinc-900 rounded-2xl border border-white/10 p-4 max-h-[400px] overflow-y-auto">
                        <div className="relative">
                            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-700"></div>
                            {SAMPLE_ACTIVITY.map(item => {
                                const isWinner = isUserGvc(item.winnerId);
                                const isLoser = isUserGvc(item.loserId);
                                const dotColor = isWinner ? 'bg-gvc-gold' : isLoser ? 'bg-red-500' : 'bg-gray-600';
                                return (
                                    <div key={item.id} className="relative pl-8 pb-4">
                                        <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full ${dotColor}`}></div>
                                        <div className="text-sm">
                                            <span className={isWinner ? 'text-gvc-gold font-bold' : 'text-white'}>{item.winnerName}</span>
                                            <span className="text-gray-600"> beat </span>
                                            <span className={isLoser ? 'text-red-400' : 'text-gray-400'}>{item.loserName}</span>
                                        </div>
                                        <div className="text-xs text-gray-600">{formatTime(item.timestamp)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* OPTION F: Minimal Text */}
                <section>
                    <h2 className="text-xl font-bold mb-2 text-center text-gray-400">Option F: Minimal</h2>
                    <p className="text-center text-gray-600 text-xs mb-4">Clean text, no emojis</p>
                    <div className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                            {SAMPLE_ACTIVITY.map(item => {
                                const isWinner = isUserGvc(item.winnerId);
                                const isLoser = isUserGvc(item.loserId);
                                return (
                                    <div key={item.id} className={`px-4 py-3 ${isWinner || isLoser ? 'bg-white/5' : ''}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm">
                                                <span className={isWinner ? 'text-gvc-gold font-bold' : 'text-white'}>{item.winnerName}</span>
                                                <span className="text-gray-500 mx-2">defeated</span>
                                                <span className={isLoser ? 'text-red-400' : 'text-gray-400'}>{item.loserName}</span>
                                            </div>
                                            <div className="text-xs text-gray-600">{formatTime(item.timestamp)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

            </div>
        </main>
    );
}
