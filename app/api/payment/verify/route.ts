/**
 * POST /api/payment/verify
 * Verifies an ETH payment transaction and grants bonus votes.
 *
 * Body: { txHash, walletAddress, packageType: '1v1' | 'duo' }
 *
 * Verification:
 *   1. Tx exists and is confirmed on Ethereum
 *   2. Recipient matches treasury address
 *   3. Value matches 0.001 ETH
 *   4. Tx not already processed (replay protection)
 *
 * On success: Increments bonus vote key in Redis for the current day.
 */

import { NextResponse } from 'next/server';
import { createPublicClient, http, fallback, parseEther, formatEther, decodeEventLog, parseAbi } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { kv } from '@/lib/kv';

const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '').toLowerCase();
const VIBESTR_ADDRESS = '0xd0cC2b0eFb168bFe1f94a948D8df70FA10257196'.toLowerCase();
const REQUIRED_AMOUNT = parseEther('250');
const erc20TransferAbi = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']);

// Use sepolia for testing, mainnet for production
const chain = process.env.ETH_CHAIN === 'sepolia' ? sepolia : mainnet;

const client = createPublicClient({
    chain,
    transport: fallback([
        http('https://rpc.flashbots.net'), // Primary (fastest)
        http('https://eth.llamarpc.com'),  // Backup 1
        http('https://1rpc.io/eth'),       // Backup 2
    ], {
        rank: true, // Automatically choose the best/fastest one
    }),
});

const BONUS_AMOUNTS: Record<string, number> = {
    '1v1': 69,
    'duo': 30,
};

function getDateKey(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { txHash, walletAddress, packageType } = body;

        // --- Validate inputs ---
        if (!txHash || typeof txHash !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid txHash' }, { status: 400 });
        }
        if (!walletAddress || typeof walletAddress !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid walletAddress' }, { status: 400 });
        }
        if (!packageType || !BONUS_AMOUNTS[packageType]) {
            return NextResponse.json({ error: 'Invalid packageType. Must be "1v1" or "duo".' }, { status: 400 });
        }

        if (!TREASURY_ADDRESS) {
            console.error('NEXT_PUBLIC_TREASURY_ADDRESS is not set');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const normalizedWallet = walletAddress.toLowerCase();
        const normalizedTxHash = txHash.toLowerCase();

        // --- Replay protection & Lock ---
        const txKey = `tx:${normalizedTxHash}:processed`;
        const lockKey = `tx:${normalizedTxHash}:lock`;

        // Acquire lock (60s expiry)
        const acquired = await kv.set(lockKey, 'locked', { nx: true, ex: 60 });
        if (!acquired) {
            return NextResponse.json({ error: 'Transaction is currently being processed' }, { status: 409 });
        }

        const alreadyProcessed = await kv.get(txKey);
        if (alreadyProcessed) {
            await kv.del(lockKey);
            return NextResponse.json({ error: 'Transaction already processed' }, { status: 409 });
        }
        // --- Fetch and verify transaction ---
        let receipt;
        try {
            receipt = await client.getTransactionReceipt({ hash: normalizedTxHash as `0x${string}` });
        } catch (e: any) {
            console.error(`[Verify] getTransactionReceipt failed for ${normalizedTxHash}:`, e?.message || e);
            await kv.del(lockKey);
            return NextResponse.json({ error: 'Transaction not found or not yet confirmed. Please wait and retry.' }, { status: 404 });
        }

        if (receipt.status !== 'success') {
            await kv.del(lockKey);
            return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
        }

        // Fetch the actual tx to verify sender (since anyone could emit an event with the user's address)
        const tx = await client.getTransaction({ hash: normalizedTxHash as `0x${string}` });

        // Verify sender matches claimed wallet
        if (tx.from.toLowerCase() !== normalizedWallet) {
            await kv.del(lockKey);
            return NextResponse.json({
                error: 'Transaction sender does not match provided wallet',
            }, { status: 400 });
        }

        // --- Security Audit Fix: Parse Event Logs ---
        // We must verify the actual 'Transfer' event emitted by the VIBESTR contract.
        // Reading `tx.input` is insecure because failed token transfers might not revert the parent transaction.

        let validTransferFound = false;
        let actualAmountProcessed = BigInt(0);

        for (const log of receipt.logs) {
            // Only process logs from the VIBESTR token contract
            if (log.address.toLowerCase() !== VIBESTR_ADDRESS) continue;

            try {
                const decoded = decodeEventLog({
                    abi: erc20TransferAbi,
                    data: log.data,
                    topics: log.topics,
                });

                if (decoded.eventName === 'Transfer') {
                    const fromAddr = (decoded.args.from as string).toLowerCase();
                    const toAddr = (decoded.args.to as string).toLowerCase();
                    const amount = decoded.args.value as bigint;

                    // Verify the transfer matches our criteria
                    if (fromAddr === normalizedWallet && toAddr === TREASURY_ADDRESS) {
                        validTransferFound = true;
                        actualAmountProcessed = amount;
                        break; // Found the valid payment log
                    }
                }
            } catch (err) {
                // Ignore logs that don't match the Transfer ABI (e.g. other events)
                continue;
            }
        }

        if (!validTransferFound) {
            await kv.del(lockKey);
            return NextResponse.json({
                error: 'No valid VIBESTR transfer event found in transaction',
            }, { status: 400 });
        }

        // Verify amount
        if (actualAmountProcessed < REQUIRED_AMOUNT) {
            await kv.del(lockKey);
            return NextResponse.json({
                error: `Insufficient payment. Expected 250 VIBESTR, got ${formatEther(actualAmountProcessed)} VIBESTR`,
            }, { status: 400 });
        }

        // --- All checks passed — grant bonus votes ---
        const dateKey = getDateKey();
        const bonusKey = `user:${normalizedWallet}:bonus:${packageType}:${dateKey}`;
        const bonusAmount = BONUS_AMOUNTS[packageType];

        // Increment bonus votes
        const newBonus = await kv.incrby(bonusKey, bonusAmount);
        // Set TTL to 48h so it auto-cleans (covers timezone edge cases)
        await kv.expire(bonusKey, 60 * 60 * 48);

        await kv.set(txKey, JSON.stringify({
            wallet: normalizedWallet,
            packageType,
            amount: formatEther(actualAmountProcessed),
            timestamp: Date.now(),
        }));
        await kv.expire(txKey, 60 * 60 * 24 * 7);
        await kv.del(lockKey); // Release lock

        return NextResponse.json({
            success: true,
            packageType,
            bonusVotesGranted: bonusAmount,
            totalBonusToday: newBonus,
        });

    } catch (error: any) {
        console.error('Payment verification error:', error);

        // If it's a timeout or network error, return 503 so client retries
        if (error.message?.includes('timeout') || error.message?.includes('network') || error.cause?.code === 'ETIMEDOUT') {
            return NextResponse.json({ error: 'RPC timeout. Please retry.' }, { status: 503 });
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
