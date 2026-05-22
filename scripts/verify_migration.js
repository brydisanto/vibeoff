/**
 * Verify that the migration from old → new Upstash Redis succeeded.
 *
 * Checks:
 *   1. Total key count matches
 *   2. Random sample of 30 keys: type + size matches
 *   3. Leaderboard top 20 (zset rank + score) matches exactly
 *   4. Global vote counter matches
 *
 * Usage: node scripts/verify_migration.js
 */

const { createClient } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });

const SAMPLE_SIZE = 30;
const SCAN_COUNT = 500;

const src = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const dst = createClient({
    url: process.env.NEW_KV_REST_API_URL,
    token: process.env.NEW_KV_REST_API_TOKEN,
});

async function scanAll(client) {
    const keys = [];
    let cursor = '0';
    do {
        const [next, batch] = await client.scan(cursor, { count: SCAN_COUNT });
        cursor = next;
        keys.push(...batch);
    } while (cursor !== '0');
    return keys;
}

async function getKeySize(client, key, type) {
    switch (type) {
        case 'string': return (await client.get(key)) !== null ? 1 : 0;
        case 'list': return await client.llen(key);
        case 'hash': return await client.hlen(key);
        case 'set': return await client.scard(key);
        case 'zset': return await client.zcard(key);
        default: return -1;
    }
}

async function main() {
    console.log('Verifying migration...\n');

    console.log('1. Counting keys on both sides...');
    const [srcKeys, dstKeys] = await Promise.all([scanAll(src), scanAll(dst)]);
    const srcSet = new Set(srcKeys);
    const dstSet = new Set(dstKeys);
    const missing = [...srcSet].filter(k => !dstSet.has(k));
    const extra = [...dstSet].filter(k => !srcSet.has(k));

    console.log(`   src: ${srcKeys.length} keys`);
    console.log(`   dst: ${dstKeys.length} keys`);
    console.log(`   missing in dst: ${missing.length}`);
    console.log(`   extra in dst:   ${extra.length}`);
    if (missing.length) console.log(`   first missing: ${missing.slice(0, 5).join(', ')}`);
    if (extra.length) console.log(`   first extra:   ${extra.slice(0, 5).join(', ')}`);
    console.log('');

    console.log(`2. Spot-checking ${SAMPLE_SIZE} random keys (type + size)...`);
    const shuffled = [...srcSet].sort(() => Math.random() - 0.5).slice(0, SAMPLE_SIZE);
    let mismatches = 0;
    for (const key of shuffled) {
        const [srcType, dstType] = await Promise.all([src.type(key), dst.type(key)]);
        if (srcType !== dstType) {
            console.log(`   MISMATCH ${key}: src=${srcType} dst=${dstType}`);
            mismatches++;
            continue;
        }
        const [srcSize, dstSize] = await Promise.all([
            getKeySize(src, key, srcType),
            getKeySize(dst, key, dstType),
        ]);
        if (srcSize !== dstSize) {
            console.log(`   SIZE DIFF ${key} (${srcType}): src=${srcSize} dst=${dstSize}`);
            mismatches++;
        }
    }
    console.log(`   ${SAMPLE_SIZE - mismatches}/${SAMPLE_SIZE} matched\n`);

    console.log('3. Comparing leaderboard:alltime top 20...');
    const [srcTop, dstTop] = await Promise.all([
        src.zrange('leaderboard:alltime', 0, 19, { rev: true, withScores: true }),
        dst.zrange('leaderboard:alltime', 0, 19, { rev: true, withScores: true }),
    ]);
    let lbMismatches = 0;
    for (let i = 0; i < Math.max(srcTop.length, dstTop.length); i++) {
        if (srcTop[i] !== dstTop[i]) {
            console.log(`   pos ${i}: src=${srcTop[i]} dst=${dstTop[i]}`);
            lbMismatches++;
        }
    }
    console.log(`   ${lbMismatches === 0 ? 'identical' : `${lbMismatches} differences`}\n`);

    console.log('4. Comparing global:votes counter...');
    const [srcGlobal, dstGlobal] = await Promise.all([
        src.get('global:votes'),
        dst.get('global:votes'),
    ]);
    console.log(`   src: ${srcGlobal}, dst: ${dstGlobal} ${srcGlobal === dstGlobal ? '(match)' : '(MISMATCH)'}\n`);

    const ok = missing.length === 0 && mismatches === 0 && lbMismatches === 0 && srcGlobal === dstGlobal;
    console.log(ok ? 'All checks passed.' : 'Some checks failed — review output above before cutting over.');
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
