
'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, RefreshCw, Search, ShieldAlert, Lock } from 'lucide-react';

interface Duo {
    id: string;
    gvc1Id: number;
    gvc2Id: number;
    gvc1Name: string;
    gvc2Name: string;
    owner: string;
    wins: number;
    losses: number;
    matches: number;
    createdAt: number;
}

export default function AdminDuosPage() {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState(false);

    // Data State
    const [duos, setDuos] = useState<Duo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Create Form State
    const [createWallet, setCreateWallet] = useState('');
    const [gvc1, setGvc1] = useState('');
    const [gvc2, setGvc2] = useState('');
    const [creating, setCreating] = useState(false);
    const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Check session on mount
    useEffect(() => {
        const stored = sessionStorage.getItem('admin_password');
        if (stored) {
            setPasswordInput(stored);
            setIsAuthenticated(true);
            fetchDuos(stored);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_password', passwordInput);
        fetchDuos(passwordInput);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setPasswordInput('');
        sessionStorage.removeItem('admin_password');
        setDuos([]);
    };

    const fetchDuos = async (pwd: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/duos', {
                headers: { 'x-admin-password': pwd }
            });

            if (res.status === 401) {
                handleLogout();
                setAuthError(true);
                return;
            }

            const data = await res.json();
            if (data.duos) {
                setDuos(data.duos);
            } else {
                setError('Failed to load data');
            }
        } catch (err) {
            setError('Failed to fetch Duos');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (duoId: string) => {
        if (!confirm(`Are you sure you want to delete Duo ${duoId}? This cannot be undone.`)) return;

        try {
            const res = await fetch('/api/admin/duos/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': passwordInput
                },
                body: JSON.stringify({ duoId })
            });

            if (res.status === 401) {
                handleLogout();
                return;
            }

            const data = await res.json();
            if (data.success) {
                setDuos(prev => prev.filter(d => d.id !== duoId));
            } else {
                alert('Failed to delete: ' + data.error);
            }
        } catch (err) {
            alert('Error deleting Duo');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateMsg(null);

        try {
            const res = await fetch('/api/admin/duos/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': passwordInput
                },
                body: JSON.stringify({
                    walletAddress: createWallet,
                    gvc1Id: parseInt(gvc1),
                    gvc2Id: parseInt(gvc2)
                })
            });

            if (res.status === 401) {
                handleLogout();
                return;
            }

            const data = await res.json();

            if (data.success) {
                setCreateMsg({ type: 'success', text: 'Duo created successfully!' });
                setGvc1('');
                setGvc2('');
                fetchDuos(passwordInput);
            } else {
                setCreateMsg({ type: 'error', text: data.error || 'Failed to create' });
            }
        } catch (err) {
            setCreateMsg({ type: 'error', text: 'Network error' });
        } finally {
            setCreating(false);
        }
    };

    // LOGIN SCREEN
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-4">
                <div className="bg-[#1a1a1a] p-8 rounded-xl border border-white/20 w-full max-w-md text-center">
                    <Lock size={48} className="mx-auto mb-6 text-gvc-gold" />
                    <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
                    <p className="text-gray-500 mb-6 text-sm">Please enter the password to continue.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={e => {
                                setPasswordInput(e.target.value);
                                setAuthError(false);
                            }}
                            placeholder="Password"
                            className="w-full bg-black/50 border border-white/20 rounded p-3 text-center focus:border-gvc-gold outline-none"
                            autoFocus
                        />
                        {authError && <div className="text-red-500 text-xs">Incorrect password</div>}
                        <button
                            type="submit"
                            className="w-full bg-gvc-gold text-black font-bold py-3 rounded hover:bg-[#FFE058] transition-colors"
                        >
                            Unlock Panel
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // MAIN DASHBOARD
    const filteredDuos = duos.filter(d =>
        d.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.includes(searchTerm) ||
        d.gvc1Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.gvc2Name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-black text-white font-mono p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12 border-b border-white/20 pb-4">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="text-red-500" size={32} />
                        <h1 className="text-3xl font-bold font-cooper tracking-wide">DUOS ADMIN</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-gray-500">
                            {duos.length} Total Pairs
                        </div>
                        <button onClick={handleLogout} className="text-xs text-red-500 hover:text-red-400">
                            Logout
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COL: CREATE FORM */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 sticky top-8">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-gvc-gold" />
                                Force Create Duo
                            </h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Wallet Address</label>
                                    <input
                                        type="text"
                                        value={createWallet}
                                        onChange={e => setCreateWallet(e.target.value)}
                                        placeholder="0x..."
                                        className="w-full bg-black/50 border border-white/20 rounded p-3 text-sm focus:border-gvc-gold outline-none font-mono"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-1">GVC ID 1</label>
                                        <input
                                            type="number"
                                            value={gvc1}
                                            onChange={e => setGvc1(e.target.value)}
                                            placeholder="1234"
                                            className="w-full bg-black/50 border border-white/20 rounded p-3 text-sm focus:border-gvc-gold outline-none font-mono"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-1">GVC ID 2</label>
                                        <input
                                            type="number"
                                            value={gvc2}
                                            onChange={e => setGvc2(e.target.value)}
                                            placeholder="5678"
                                            className="w-full bg-black/50 border border-white/20 rounded p-3 text-sm focus:border-gvc-gold outline-none font-mono"
                                            required
                                        />
                                    </div>
                                </div>

                                {createMsg && (
                                    <div className={`p-3 rounded text-xs ${createMsg.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {createMsg.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full bg-gvc-gold text-black font-bold py-3 rounded hover:bg-[#FFE058] transition-colors disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Duo'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT COL: LIST */}
                    <div className="lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Manage Duos</h2>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search owner or ID..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-[#1a1a1a] border border-white/20 rounded text-sm focus:border-white/50 outline-none w-64"
                                    />
                                </div>
                                <button onClick={() => fetchDuos(passwordInput)} className="p-2 bg-[#1a1a1a] border border-white/20 rounded hover:bg-white/10 transition-colors">
                                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-20 text-gray-500">Loading Duos...</div>
                        ) : error ? (
                            <div className="text-center py-20 text-red-500">{error}</div>
                        ) : filteredDuos.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">No Duos found.</div>
                        ) : (
                            <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase text-xs">
                                        <tr>
                                            <th className="p-4">Duo</th>
                                            <th className="p-4">Owner</th>
                                            <th className="p-4 text-center">Stats</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredDuos.map(duo => (
                                            <tr key={duo.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-xs text-gray-500">#{duo.id}</span>
                                                        <div>
                                                            <div className="font-bold">{duo.gvc1Name} & {duo.gvc2Name}</div>
                                                            <div className="text-xs text-gray-500">IDs: {duo.gvc1Id} / {duo.gvc2Id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono text-xs text-gray-400">
                                                    {duo.owner ? (
                                                        <span title={duo.owner}>
                                                            {duo.owner.slice(0, 6)}...{duo.owner.slice(-4)}
                                                        </span>
                                                    ) : 'Unknown'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-gvc-gold">{duo.wins}W</span>
                                                        <span className="text-xs text-gray-500">{duo.matches} matches</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(duo.id)}
                                                        className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                        title="Delete Duo"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
