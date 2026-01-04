// lib/redis.ts
// Redis client for the new vibeoff-2 database

import Redis from 'ioredis';

// Use the new vibeoff-2 Redis database if available, otherwise fall back to old
const redisUrl = process.env.vibeoff2_REDIS_URL || process.env.REDIS_URL || process.env.KV_URL;

if (!redisUrl) {
    console.error('No Redis URL found in environment variables');
}

// Create a singleton Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redis && redisUrl) {
        redis = new Redis(redisUrl);
    }
    if (!redis) {
        throw new Error('Redis client not initialized - missing REDIS_URL');
    }
    return redis;
}

// Wrapper object with similar API to @vercel/kv for easy migration
export const kv = {
    async zadd(key: string, ...args: any[]) {
        const client = getRedisClient();
        // Handle both { score, member } objects and raw score, member pairs
        if (args.length === 1 && typeof args[0] === 'object' && 'score' in args[0]) {
            const { score, member } = args[0];
            return client.zadd(key, score, member);
        }
        return client.zadd(key, ...args);
    },

    async zrange(key: string, start: number, stop: number, options?: { rev?: boolean, withScores?: boolean }) {
        const client = getRedisClient();
        if (options?.rev) {
            if (options?.withScores) {
                return client.zrevrange(key, start, stop, 'WITHSCORES');
            }
            return client.zrevrange(key, start, stop);
        }
        if (options?.withScores) {
            return client.zrange(key, start, stop, 'WITHSCORES');
        }
        return client.zrange(key, start, stop);
    },

    async hset(key: string, data: Record<string, any>) {
        const client = getRedisClient();
        return client.hset(key, data);
    },

    async hgetall(key: string) {
        const client = getRedisClient();
        return client.hgetall(key);
    },

    async hincrby(key: string, field: string, increment: number) {
        const client = getRedisClient();
        return client.hincrby(key, field, increment);
    },

    async get(key: string) {
        const client = getRedisClient();
        return client.get(key);
    },

    async set(key: string, value: string, options?: { ex?: number }) {
        const client = getRedisClient();
        if (options?.ex) {
            return client.setex(key, options.ex, value);
        }
        return client.set(key, value);
    },

    async incr(key: string) {
        const client = getRedisClient();
        return client.incr(key);
    },

    async del(...keys: string[]) {
        const client = getRedisClient();
        return client.del(...keys);
    },

    async flushall() {
        const client = getRedisClient();
        return client.flushall();
    },

    // Pipeline support for batch operations
    pipeline() {
        const client = getRedisClient();
        const pipe = client.pipeline();
        return {
            hgetall(key: string) {
                pipe.hgetall(key);
                return this;
            },
            async exec() {
                const results = await pipe.exec();
                // ioredis returns [error, result] pairs, extract just results
                return results?.map(([err, result]) => result) || [];
            }
        };
    }
};
