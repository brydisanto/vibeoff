
import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!
});

const TARGET_WALLET = '0xa6acd6ddb556b794124ad95b7040bdd7aa174bd5'.toLowerCase();

async function resetDuos() {
    console.log(`Resetting Duos for wallet: ${TARGET_WALLET}`);

    // 1. Get all Duo IDs
    const duoIds = await kv.smembers(`duos:wallet:${TARGET_WALLET}`) as string[];
    console.log(`Found ${duoIds.length} Duos to delete.`);

    if (duoIds.length === 0) {
        console.log('No Duos found. Exiting.');
        return;
    }

    // 2. Iterate and delete
    for (const duoId of duoIds) {
        console.log(`Deleting Duo ${duoId}...`);

        // Get data to find GVC IDs for cleanup
        const duoData = await kv.hgetall(`duos:${duoId}`) as any;

        const pipeline = kv.pipeline();

        // Delete main records
        pipeline.del(`duos:${duoId}`);
        pipeline.del(`duos:history:${duoId}`);
        pipeline.zrem('duos:all', duoId);
        pipeline.srem(`duos:wallet:${TARGET_WALLET}`, duoId);

        if (duoData) {
            pipeline.del(`duos:gvc:${duoData.gvc1Id}`);
            pipeline.del(`duos:gvc:${duoData.gvc2Id}`);
        }

        await pipeline.exec();
    }

    console.log('✅ Successfully reset all Duos for user.');
}

resetDuos().catch(console.error);
