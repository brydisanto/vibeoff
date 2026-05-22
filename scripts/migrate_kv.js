/**
 * Migrate all data from one Upstash Redis (Vercel KV) instance to another.
 *
 * Reads from:  KV_REST_API_URL / KV_REST_API_TOKEN
 * Writes to:   NEW_KV_REST_API_URL / NEW_KV_REST_API_TOKEN
 *
 * Preserves: strings (with TTL), lists, hashes, sets, sorted sets.
 *
 * Safe to re-run — destination keys are overwritten (DEL before write).
 *
 * Usage:
 *   node scripts/migrate_kv.js          # dry run, prints what would be copied
 *   node scripts/migrate_kv.js --go     # actually writes to destination
 */

const { createClient } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = !process.argv.includes('--go');
const SCAN_COUNT = 500;
const BATCH_SIZE = 50;

// === Trim policy ===
// Applied at migration time; source DB is never modified.
// Today's date (system local) used as the cutoff anchor.
const TODAY = new Date();
function daysAgoStr(n) {
    const d = new Date(TODAY);
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
const CUTOFF_DAILY = daysAgoStr(7);   // keep last 7 days of daily counters
const CUTOFF_SESSION = daysAgoStr(2); // keep last 2 days of session locks
const VOTE_HISTORY_KEEP = 500;        // trim votes:wallet:* lists to last 500 entries (newest, lpush)

// Returns null to skip migrating this key entirely, or an options object.
function trimPolicy(key) {
    // Skip stale daily vote counters: votes:wallet:{wallet}:daily:{YYYY-MM-DD}
    let m = key.match(/^votes:wallet:[^:]+:daily:(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1] < CUTOFF_DAILY) return null;

    // Skip stale bonus counters: user:{wallet}:bonus:{type}:{YYYY-MM-DD}
    m = key.match(/^user:[^:]+:bonus:[^:]+:(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1] < CUTOFF_DAILY) return null;

    // Skip stale duos daily vote counters: duos:votes:{YYYY-MM-DD}:{deviceId}
    m = key.match(/^duos:votes:(\d{4}-\d{2}-\d{2}):/);
    if (m && m[1] < CUTOFF_DAILY) return null;

    // Skip stale duos session state: duos:state:{YYYY-MM-DD}:{sessionId}
    m = key.match(/^duos:state:(\d{4}-\d{2}-\d{2}):/);
    if (m && m[1] < CUTOFF_SESSION) return null;

    // Skip ephemeral tx locks (60s TTL) and short-lived volume buckets (24h TTL)
    if (/^tx:[^:]+:lock$/.test(key)) return null;
    if (/^stats:vol:/.test(key)) return null;

    // Skip THE DAILY feature (removed): daily:current, daily:history, daily:votes:*,
    // daily:uservote:*, daily:stats:*, daily:scheduled:*, daily:lock, daily:vote:discord:*
    if (/^daily:/.test(key)) return null;

    // Truncate vote history lists to the most recent N entries (lpush so newest = index 0)
    if (/^votes:wallet:[^:]+$/.test(key)) {
        return { listKeep: VOTE_HISTORY_KEEP };
    }

    return {};
}

function assertEnv(name) {
    if (!process.env[name]) {
        console.error(`Missing required env var: ${name}`);
        process.exit(1);
    }
}

assertEnv('KV_REST_API_URL');
assertEnv('KV_REST_API_TOKEN');
assertEnv('NEW_KV_REST_API_URL');
assertEnv('NEW_KV_REST_API_TOKEN');

const src = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const dst = createClient({
    url: process.env.NEW_KV_REST_API_URL,
    token: process.env.NEW_KV_REST_API_TOKEN,
});

async function scanAllKeys() {
    const keys = [];
    let cursor = '0';
    do {
        const [next, batch] = await src.scan(cursor, { count: SCAN_COUNT });
        cursor = next;
        keys.push(...batch);
        process.stdout.write(`\r  scanned ${keys.length} keys...`);
    } while (cursor !== '0');
    process.stdout.write('\n');
    return keys;
}

async function copyKey(key) {
    const policy = trimPolicy(key);
    if (policy === null) {
        return { type: 'skipped', size: 0 };
    }

    const type = await src.type(key);
    const ttl = await src.ttl(key);

    if (!DRY_RUN) {
        await dst.del(key);
    }

    switch (type) {
        case 'string': {
            const value = await src.get(key);
            if (!DRY_RUN && value !== null) {
                if (ttl > 0) {
                    await dst.set(key, value, { ex: ttl });
                } else {
                    await dst.set(key, value);
                }
            }
            return { type, size: 1 };
        }
        case 'list': {
            const stop = policy.listKeep ? policy.listKeep - 1 : -1;
            const values = await src.lrange(key, 0, stop);
            // lpush in reverse so original index 0 (newest) ends up at index 0 again
            if (!DRY_RUN && values.length) {
                await dst.lpush(key, ...values.slice().reverse());
                if (ttl > 0) await dst.expire(key, ttl);
            }
            return { type, size: values.length };
        }
        case 'hash': {
            const obj = await src.hgetall(key);
            const entries = obj ? Object.keys(obj).length : 0;
            if (!DRY_RUN && entries) {
                await dst.hset(key, obj);
                if (ttl > 0) await dst.expire(key, ttl);
            }
            return { type, size: entries };
        }
        case 'set': {
            const members = await src.smembers(key);
            if (!DRY_RUN && members.length) {
                await dst.sadd(key, ...members);
                if (ttl > 0) await dst.expire(key, ttl);
            }
            return { type, size: members.length };
        }
        case 'zset': {
            const flat = await src.zrange(key, 0, -1, { withScores: true });
            const members = [];
            for (let i = 0; i < flat.length; i += 2) {
                members.push({ member: String(flat[i]), score: Number(flat[i + 1]) });
            }
            if (!DRY_RUN && members.length) {
                const pipe = dst.pipeline();
                for (const m of members) {
                    pipe.zadd(key, m);
                }
                if (ttl > 0) pipe.expire(key, ttl);
                await pipe.exec();
            }
            return { type, size: members.length };
        }
        default:
            return { type: `unknown(${type})`, size: 0 };
    }
}

async function main() {
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (writing to destination)'}`);
    console.log(`Source:      ${process.env.KV_REST_API_URL}`);
    console.log(`Destination: ${process.env.NEW_KV_REST_API_URL}`);
    console.log('');

    console.log('Scanning source for all keys...');
    const keys = await scanAllKeys();
    console.log(`Total keys: ${keys.length}\n`);

    const typeStats = {};
    let copied = 0;
    const errors = [];

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(copyKey));

        results.forEach((r, idx) => {
            if (r.status === 'fulfilled') {
                const { type, size } = r.value;
                typeStats[type] = typeStats[type] || { count: 0, totalSize: 0 };
                typeStats[type].count++;
                typeStats[type].totalSize += size;
                copied++;
            } else {
                errors.push({ key: batch[idx], error: r.reason?.message || String(r.reason) });
            }
        });

        process.stdout.write(`\r  processed ${Math.min(i + BATCH_SIZE, keys.length)}/${keys.length}...`);
    }
    process.stdout.write('\n\n');

    console.log('=== Summary ===');
    console.log(`  Cutoff: daily counters < ${CUTOFF_DAILY}, session locks < ${CUTOFF_SESSION}, vote lists trimmed to ${VOTE_HISTORY_KEEP}`);
    for (const [type, stats] of Object.entries(typeStats)) {
        console.log(`  ${type.padEnd(10)} ${stats.count} keys, ${stats.totalSize} total items`);
    }
    const skipped = typeStats['skipped']?.count || 0;
    const migrated = copied - skipped;
    console.log(`\nMigrated: ${migrated}, Skipped: ${skipped}, Total: ${keys.length}`);

    if (errors.length) {
        console.log(`\nErrors (${errors.length}):`);
        errors.slice(0, 20).forEach(e => console.log(`  ${e.key}: ${e.error}`));
        if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
    }

    if (DRY_RUN) {
        console.log('\nDry run complete. Re-run with --go to actually migrate.');
    } else {
        console.log('\nMigration complete. Run scripts/verify_migration.js to spot-check.');
    }
}

main().catch(err => {
    console.error('\nMigration failed:', err);
    process.exit(1);
});
