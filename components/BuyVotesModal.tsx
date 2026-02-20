'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`;
const VOTE_PRICE = '0.001'; // ETH
const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 3000;

interface BuyVotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    packageType: '1v1' | 'duo';
    onSuccess: (bonusVotes: number) => void;
}

function useCountdown() {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const utcMidnight = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() + 1,
                0, 0, 0
            ));
            const diff = utcMidnight.getTime() - now.getTime();

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    return timeLeft;
}

export default function BuyVotesModal({ isOpen, onClose, packageType, onSuccess }: BuyVotesModalProps) {
    const { address, isConnected } = useAccount();
    const countdown = useCountdown();
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [statusText, setStatusText] = useState('');
    const pollingRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    // Store latest values in refs so polling always has current data
    const addressRef = useRef(address);
    const packageTypeRef = useRef(packageType);
    const onSuccessRef = useRef(onSuccess);

    useEffect(() => { addressRef.current = address; }, [address]);
    useEffect(() => { packageTypeRef.current = packageType; }, [packageType]);
    useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

    const { sendTransaction, isPending: isSending, reset: resetTx } = useSendTransaction();

    const label = packageType === '1v1'
        ? 'Fresh Set Of 1v1 Votes (69 Pack)'
        : 'Fresh Set Of Duo Votes (30 Pack)';

    const startPolling = (hash: string) => {
        console.log(`[BuyVotes] Starting polling for tx: ${hash}`);
        setVerifying(true);
        pollingRef.current = true;

        const poll = async (attempt: number) => {
            if (!pollingRef.current) return;

            if (attempt >= MAX_POLL_ATTEMPTS) {
                setVerifying(false);
                pollingRef.current = false;
                setError('Transaction is taking longer than expected. Please close and try again.');
                return;
            }

            setStatusText(attempt === 0 ? 'Confirming on-chain...' : `Waiting for confirmation... (${attempt}/${MAX_POLL_ATTEMPTS})`);

            try {
                console.log(`[BuyVotes] Poll attempt ${attempt} for ${hash}, wallet: ${addressRef.current}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

                const res = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        txHash: hash,
                        walletAddress: addressRef.current,
                        packageType: packageTypeRef.current,
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                const data = await res.json();
                console.log(`[BuyVotes] Verify response (attempt ${attempt}):`, data);

                if (data.success) {
                    pollingRef.current = false;
                    setVerifying(false);
                    setSuccess(true);
                    onSuccessRef.current(data.bonusVotesGranted);
                    return;
                }

                // If tx not found/confirmed yet (404) OR server error (5xx), retry
                if (res.status === 404 || res.status >= 500) {
                    console.log(`[BuyVotes] Retrying due to status ${res.status}`);
                    timerRef.current = setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
                    return;
                }

                // Any other error is final
                pollingRef.current = false;
                setVerifying(false);
                setError(data.error || 'Verification failed');
            } catch (e) {
                console.error(`[BuyVotes] Poll error (attempt ${attempt}):`, e);
                timerRef.current = setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
            }
        };

        poll(0);
    };

    const handleBuy = () => {
        if (!isConnected || !address) return;
        setError(null);

        sendTransaction(
            {
                to: TREASURY_ADDRESS,
                value: parseEther(VOTE_PRICE),
            },
            {
                onSuccess: (hash) => {
                    console.log(`[BuyVotes] Transaction sent! Hash: ${hash}`);
                    startPolling(hash);
                },
                onError: (err) => {
                    console.error(`[BuyVotes] Transaction error:`, err);
                    setError(err.message?.includes('rejected')
                        ? 'Transaction was rejected.'
                        : 'Failed to send transaction. Please try again.');
                },
            }
        );
    };

    const handleClose = () => {
        pollingRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        setError(null);
        setSuccess(false);
        setVerifying(false);
        setStatusText('');
        resetTx();
        onClose();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            pollingRef.current = false;
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const isProcessing = isSending || verifying;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={handleClose}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative bg-[#111] border border-white/20 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl"
                    >
                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                            </svg>
                        </button>

                        {success ? (
                            /* Success State */
                            <div className="text-center py-4">
                                <motion.div
                                    className="w-16 h-16 mx-auto mb-4"
                                    animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                                >
                                    <img src="/gvc_shaka.png" alt="Shaka" className="w-full h-full object-contain" />
                                </motion.div>
                                <h2 className="text-2xl font-cooper text-gvc-gold mb-4">SUCCESS!</h2>
                                <p className="text-white font-mundial text-lg mb-6">
                                    {packageType === '1v1' ? '69' : '30'} bonus votes have been added.
                                </p>
                                <button
                                    onClick={handleClose}
                                    className="px-6 py-3 bg-gvc-gold text-black font-bold font-mundial uppercase tracking-wider rounded-lg hover:bg-[#FFE058] transition-all"
                                >
                                    Let&apos;s Vibe!
                                </button>
                            </div>
                        ) : (
                            /* Purchase State */
                            <>
                                <h2 className="text-2xl font-cooper text-gvc-gold mb-1">Need More Votes?</h2>
                                <p className="text-gray-500 text-xs font-mono mb-6">
                                    Vibe Off! runs on Ethereum
                                </p>

                                {/* Package */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-white font-bold font-mundial">{label}</p>
                                            <p className="text-gray-400 text-sm font-mono">{VOTE_PRICE} ETH</p>
                                        </div>
                                        <motion.div
                                            className="w-10 h-10"
                                            animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                                        >
                                            <img src="/gvc_shaka.png" alt="Shaka" className="w-full h-full object-contain" />
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Proceeds info */}
                                <p className="text-gray-500 text-xs font-mundial text-center mb-4">
                                    Proceeds are used to support $VIBESTR, as well as for ongoing site development (i.e. mostly to buy coffee for Bry).
                                </p>

                                {/* Error */}
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm text-center">
                                        {error}
                                    </div>
                                )}

                                {/* Action Button */}
                                {!isConnected ? (
                                    <div className="flex flex-col items-center gap-3 py-2">
                                        <p className="text-gray-400 text-sm font-mundial">
                                            Connect your wallet to purchase votes.
                                        </p>
                                        <ConnectButton />
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleBuy}
                                        disabled={isProcessing}
                                        className={`w-full py-3 rounded-lg font-bold font-mundial uppercase tracking-wider transition-all ${isProcessing
                                            ? 'bg-gray-700 text-gray-400 cursor-wait'
                                            : 'bg-gvc-gold text-black hover:bg-[#FFE058]'
                                            }`}
                                    >
                                        {isSending ? 'Confirm in wallet...' :
                                            verifying ? statusText :
                                                `Buy for ${VOTE_PRICE} ETH`}
                                    </button>
                                )}

                                {/* Countdown */}
                                <div className="text-center mt-5 pt-4 border-t border-white/10">
                                    <p className="text-gray-500 text-sm font-mundial">
                                        Or wait <span className="text-white font-mono font-bold">{countdown}</span> until your daily votes reset
                                    </p>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
