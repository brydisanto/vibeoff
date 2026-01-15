import { createClient } from '@vercel/kv';

// Custom KV client configuration
const url = process.env.MY_KV_URL || process.env.KV_REST_API_URL;
const token = process.env.MY_KV_TOKEN || process.env.KV_REST_API_TOKEN;

console.log('[kv] Using URL:', url);

export const kv = createClient({
    url: url!,
    token: token!
});
