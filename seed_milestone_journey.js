/**
 * MongoDB Seed Script — mileStoneBotJourney
 * Node.js version using official mongodb driver
 *
 * Setup:
 *   npm install mongodb
 *
 * Run:
 *   node seed_milestone_journey.js
 */

import { MongoClient } from "mongodb";

// ─── CONFIG ────────────────────────────────────────────────────────────────

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "1spoc-staging-reporting";

const BOT_ID = "66a790f392be9b0034ffdf4d";
const SERVICE_ID = "69a7e8c086d90bfa1322abed";

const STAGE_ARRAY = [
    { id: "7YUiVVPNp8Eaq4miAAuAYn", order: 1 },
    { id: "t1kZXzCeHWXwNAtDvZrwRP", order: 2 },
    { id: "r1dtyUQqnBFDoa5pugazMc", order: 3 },
    { id: "rR7Mj9z8E7r9iyyw52UHqq", order: 4 },
    { id: "8axbCUSrD3LCwg15dj2epL", order: 5 },
    { id: "fhM5tTyNUesSsgWp5aukpK", order: 6 },
];

// Journeys per day — each journey = 1 to 6 stage documents
const JOURNEYS_PER_DAY = 200000; // ~200k journeys × avg 3 stages ≈ 600k docs/day → ~9M total

// insertMany batch size (tune based on RAM — 5000 is safe)
const BATCH_SIZE = 5000;

// ─── HELPERS ───────────────────────────────────────────────────────────────

function generateExecutionId(ts) {
    const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
    return `${ts}T${hex()}${hex()}${hex()}`;
}

function generateMobile() {
    const prefix = Math.floor(Math.random() * 4) + 6; // 6,7,8,9
    const rest = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, "0");
    return parseInt(`91${prefix}${rest}`, 10);
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randTimestampForDay(year, month, day) {
    const dayStart = Date.UTC(year, month - 1, day, 0, 0, 0);
    const dayEnd = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
    return randInt(dayStart, dayEnd);
}

function collectionName(year, month, day) {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}_${mm}_${dd}_mileStoneBotJourney`;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log(`✅ Connected to MongoDB: ${MONGO_URI}`);

        const db = client.db(DB_NAME);

        console.log("\n=== Milestone Bot Journey Seed Script ===");
        console.log(`Database      : ${DB_NAME}`);
        console.log(`Journeys/day  : ${JOURNEYS_PER_DAY.toLocaleString()}`);
        console.log(`Max docs/day  : ${(JOURNEYS_PER_DAY * STAGE_ARRAY.length).toLocaleString()}`);
        console.log(`Days          : May 1 – 15, 2026`);
        console.log("==========================================\n");

        let grandTotal = 0;
        const scriptStart = Date.now();

        for (let day = 1; day <= 15; day++) {
            const colName = collectionName(2026, 5, day);
            const col = db.collection(colName);
            const dayStart = Date.now();

            // Indexes for query performance
            await col.createIndex({ executionId: 1, recipientId: 1, serviceId: 1 });
            await col.createIndex({ recipientId: 1 });
            await col.createIndex({ stage: 1 });
            await col.createIndex({ createdAt: 1 });

            console.log(`[Day ${String(day).padStart(2, "0")}/15] Collection: ${colName}`);

            let dayTotal = 0;
            let batch = [];

            for (let j = 0; j < JOURNEYS_PER_DAY; j++) {
                // Random number of stages 1–6, always sequential from order 1
                const maxStage = randInt(1, STAGE_ARRAY.length);
                const baseTs = randTimestampForDay(2026, 5, day);
                const executionId = generateExecutionId(baseTs);
                const recipientId = generateMobile();

                for (let s = 0; s < maxStage; s++) {
                    const stage = STAGE_ARRAY[s];
                    const stageTs = baseTs + s * randInt(500, 5000); // stages spaced slightly apart

                    batch.push({
                        botId: BOT_ID,
                        executionId: executionId,
                        recipientId: recipientId,
                        serviceId: SERVICE_ID,
                        stage: stage.id,
                        createdAt: stageTs,
                        __v: 0,
                    });

                    if (batch.length >= BATCH_SIZE) {
                        await col.insertMany(batch, { ordered: false });
                        dayTotal += batch.length;
                        batch = [];

                        // Progress log every 100k docs
                        if (dayTotal % 100_000 === 0) {
                            process.stdout.write(`  ... ${dayTotal.toLocaleString()} docs inserted\r`);
                        }
                    }
                }
            }

            // Flush remaining batch
            if (batch.length > 0) {
                await col.insertMany(batch, { ordered: false });
                dayTotal += batch.length;
            }

            const elapsed = ((Date.now() - dayStart) / 1000).toFixed(1);
            grandTotal += dayTotal;
            console.log(`  ✓ ${dayTotal.toLocaleString()} documents inserted in ${elapsed}s`);
        }

        const totalElapsed = ((Date.now() - scriptStart) / 1000).toFixed(1);
        console.log(`\n✅ Done! Grand total: ${grandTotal.toLocaleString()} documents in ${totalElapsed}s`);

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    } finally {
        await client.close();
    }
}

main();