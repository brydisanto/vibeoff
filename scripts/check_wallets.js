const { kv } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  const response = await fetch(`${url}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['KEYS', 'votes:wallet:*']),
    method: 'POST',
  });
  
  const data = await response.json();
  const keys = data.result || [];
  
  const counts = [];
  for (const key of keys) {
    if (key.includes(':daily:')) continue;
    const lenResponse = await fetch(`${url}/`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['LLEN', key]),
        method: 'POST'
    });
    const lenData = await lenResponse.json();
    if (lenData.result > 0) {
      counts.push({ key, len: lenData.result });
    }
  }
  counts.sort((a, b) => b.len - a.len);
  console.log(JSON.stringify(counts.slice(0, 10), null, 2));
}
main().catch(console.error);
