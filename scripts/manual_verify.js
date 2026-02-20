require('dotenv').config({ path: '.env.local' });
const { createPublicClient, http, parseEther, formatEther } = require('viem');
const { mainnet } = require('viem/chains');
const { createClient } = require('@vercel/kv');

const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '').toLowerCase();
const REQUIRED_AMOUNT = parseEther('0.001');

const client = createPublicClient({
    chain: mainnet,
    transport: http('https://rpc.flashbots.net', {
        timeout: 30_000,
    }),
});

const kv = createClient({
    url: process.env.MY_KV_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.MY_KV_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const BONUS_AMOUNTS = {
    '1v1': 69,
    'duo': 30,
};

function getDateKey() {
    return new Date().toISOString().split('T')[0];
}

async function verify() {
    const txHash = '0xe22818c835097b9e50b5d90f3ebe7ccfaf3f3198415d89375d040387b7710d3e';
    const walletAddress = '0x54e44b2185a7e2217d2a110a3ee8025bfa56349c';
    const packageType = 'duo';

    console.log(`Verifying ${txHash}...`);

    const normalizedWallet = walletAddress.toLowerCase();
    const normalizedTxHash = txHash.toLowerCase();
    const txKey = `tx:${normalizedTxHash}:processed`;

    const alreadyProcessed = await kv.get(txKey);
    if (alreadyProcessed) {
        console.log('Already processed!');
        return;
    }

    try {
        const receipt = await client.getTransactionReceipt({ hash: normalizedTxHash });
        if (receipt.status !== 'success') {
            console.error('Tx failed on-chain');
            return;
        }

        const tx = await client.getTransaction({ hash: normalizedTxHash });

        if (tx.to?.toLowerCase() !== TREASURY_ADDRESS) {
            console.error('Wrong recipient:', tx.to);
            return;
        }

        if (tx.value < REQUIRED_AMOUNT) {
            console.error('Insufficient amount:', formatEther(tx.value));
            return;
        }

        if (tx.from.toLowerCase() !== normalizedWallet) {
            console.error('Wrong sender:', tx.from);
            return;
        }

        console.log('Verification passed!');

        const dateKey = getDateKey();
        const bonusKey = `user:${normalizedWallet}:bonus:${packageType}:${dateKey}`;
        const bonusAmount = BONUS_AMOUNTS[packageType];

        const newBonus = await kv.incrby(bonusKey, bonusAmount);
        await kv.expire(bonusKey, 60 * 60 * 48);

        await kv.set(txKey, JSON.stringify({
            wallet: normalizedWallet,
            packageType,
            amount: formatEther(tx.value),
            timestamp: Date.now(),
        }));
        await kv.expire(txKey, 60 * 60 * 24 * 7);

        console.log(`Success! Granted ${bonusAmount} votes. Total bonus today: ${newBonus}`);

    } catch (e) {
        console.error('Error:', e);
    }
}

verify();
