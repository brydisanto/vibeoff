import { kv } from './kv';

const WINDOW_DURATION = 60; // seconds
const MAX_REQUESTS = 30; // votes per window

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Basic Fixed Window Rate Limiter
 * @param ip IP address to limit
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
    const key = `ratelimit:vote:${ip}`;

    try {
        const requests = await kv.incr(key);

        if (requests === 1) {
            await kv.expire(key, WINDOW_DURATION);
        }

        const ttl = await kv.ttl(key);

        return {
            success: requests <= MAX_REQUESTS,
            limit: MAX_REQUESTS,
            remaining: Math.max(0, MAX_REQUESTS - requests),
            reset: Date.now() + (ttl * 1000)
        };
    } catch (error) {
        console.error('Rate limit error:', error);
        // Fail open if Redis is down
        return {
            success: true,
            limit: MAX_REQUESTS,
            remaining: 1,
            reset: Date.now()
        };
    }
}
