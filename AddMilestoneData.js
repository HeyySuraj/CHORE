/**
 * MongoDB Seed Script — mileStoneBotJourney
 * Generates data for May 1–15, 2026 across daily collections
 * Collection naming: 2026_05_DD_mileStoneBotJourney
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/yourDB" seed_milestone_journey.js
 *   OR with URI:
 *   mongosh "mongodb+srv://user:pass@cluster/yourDB" seed_milestone_journey.js
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────

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

// How many unique (executionId + recipientId) journeys per day
const JOURNEYS_PER_DAY = 20000; // 200k journeys × up to 6 stages = up to 1.2M docs/day

// Batch size for insertMany (tune based on your RAM)
const BATCH_SIZE = 5000;

// May 1–15, 2026
const START_DATE = new Date("2026-05-01T00:00:00.000Z");
const END_DATE = new Date("2026-05-15T23:59:59.999Z");

// ─── HELPERS ───────────────────────────────────────────────────────────────

/**
 * Generate a unique executionId similar to: 1773383562646T946837ae452146a48b40b7913f4819fc
 */
function generateExecutionId(ts) {
    const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
    return `${ts}T${hex()}${hex()}${hex()}`;
}

/**
 * Generate a random Indian mobile number (91XXXXXXXXXX)
 */
function generateMobile() {
    // Indian mobile: 10 digits starting with 6–9
    const prefix = Math.floor(Math.random() * 4) + 6; // 6,7,8,9
    const rest = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, "0");
    return parseInt(`91${prefix}${rest}`, 10);
}

/**
 * Random integer between min and max (inclusive)
 */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Return a random timestamp (ms) within the given day (UTC)
 */
function randTimestampForDay(year, month, day) {
    const dayStart = Date.UTC(year, month - 1, day, 0, 0, 0);
    const dayEnd = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
    return randInt(dayStart, dayEnd);
}

/**
 * Build collection name from date parts, e.g. 2026_05_01_mileStoneBotJourney
 */
function collectionName(year, month, day) {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}_${mm}_${dd}_mileStoneBotJourney`;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

print("=== Milestone Bot Journey Seed Script ===");
print(`Target: May 1–15, 2026 | ${JOURNEYS_PER_DAY.toLocaleString()} journeys/day`);
print(`Max docs/day: ${(JOURNEYS_PER_DAY * STAGE_ARRAY.length).toLocaleString()}`);
print(`Total max docs: ${(JOURNEYS_PER_DAY * STAGE_ARRAY.length * 15).toLocaleString()}`);
print("==========================================\n");

let grandTotal = 0;

for (let day = 1; day <= 15; day++) {
    const colName = collectionName(2026, 5, day);
    const col = db.getCollection(colName);

    // Create index upfront for query performance
    col.createIndex({ executionId: 1, recipientId: 1, serviceId: 1 });
    col.createIndex({ recipientId: 1 });
    col.createIndex({ stage: 1 });
    col.createIndex({ createdAt: 1 });

    print(`\n[Day ${day}/15] Collection: ${colName}`);

    let dayTotal = 0;
    let batch = [];

    for (let j = 0; j < JOURNEYS_PER_DAY; j++) {

        // Each journey has a random number of completed stages (1–6), in order
        const maxStage = randInt(1, STAGE_ARRAY.length);
        const baseTs = randTimestampForDay(2026, 5, day);
        const executionId = generateExecutionId(baseTs);
        const recipientId = generateMobile();

        for (let s = 0; s < maxStage; s++) {
            const stage = STAGE_ARRAY[s];
            // Each stage gets a slightly later timestamp within the same day
            const stageTs = baseTs + s * randInt(500, 5000);

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
                col.insertMany(batch, { ordered: false });
                dayTotal += batch.length;
                batch = [];
            }
        }
    }

    // Flush remaining
    if (batch.length > 0) {
        col.insertMany(batch, { ordered: false });
        dayTotal += batch.length;
    }

    grandTotal += dayTotal;
    print(`  ✓ Inserted ${dayTotal.toLocaleString()} documents`);
}

print(`\n✅ Done! Grand total inserted: ${grandTotal.toLocaleString()} documents`);