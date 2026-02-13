import { createClient } from '@vercel/kv';

// Custom KV client configuration
const url = process.env.MY_KV_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || 'https://placeholder.upstash.io';
const token = process.env.MY_KV_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || 'placeholder-token';

console.log('[kv] Using URL:', url);

export const kv = createClient({
    url: url!,
    token: token!
});
