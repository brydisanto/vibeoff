import { createClient } from '@vercel/kv';

// Custom KV client configuration
const url = process.env.MY_KV_URL || process.env.KV_REST_API_URL;
const token = process.env.MY_KV_TOKEN || process.env.KV_REST_API_TOKEN;

export const kv = createClient({
    url: url!,
    token: token!
});
