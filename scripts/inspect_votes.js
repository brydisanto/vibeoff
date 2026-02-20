const { kv } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  const response = await fetch(`${url}/`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['LRANGE', 'votes:wallet:0xf7daddb9553d6c0ad80c66c7cfff281b1d5f35ad', '0', '-1']),
    method: 'POST'
  });
  
  const data = await response.json();
  const rawVotes = data.result || [];
  
  console.log(`Total items: ${rawVotes.length}`);
  
  let validCount = 0;
  let invalidCount = 0;
  const traits = {};
  
  for (const v of rawVotes) {
    try {
      const parsed = typeof v === 'string' ? JSON.parse(v) : v;
      if (parsed && parsed.winnerId && parsed.loserId) {
         validCount++;
      } else {
         invalidCount++;
      }
    } catch {
      invalidCount++;
    }
  }
  
  console.log(`Valid: ${validCount}, Invalid: ${invalidCount}`);
  console.log('First 5 valid items:', rawVotes.map(v => { try { return JSON.parse(v); } catch { return null; }}).filter(Boolean).slice(0,5));
}
main().catch(console.error);
