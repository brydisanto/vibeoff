const { kv } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });

async function check(wallet) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const res = await fetch(`${url}/`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['LLEN', `votes:wallet:${wallet}`]),
    method: 'POST'
  });
  const data = await res.json();
  console.log(`${wallet}: ${data.result}`);
}

async function main() {
  await check('undefined');
  await check('null');
  await check('');
}
main().catch(console.error);
