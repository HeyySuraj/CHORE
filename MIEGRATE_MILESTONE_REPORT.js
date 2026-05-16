const { MongoClient } = require("mongodb");

const MONGODB_URI = "your_mongodb_connection_string";
const DB_NAME = "your_database_name";
const COLLECTION_NAME = "your_collection_name";

async function migrateData() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Fetch all documents that have the old structure (with `data` array)
        const oldDocuments = await collection
            .find({ data: { $exists: true, $type: "array" } })
            .toArray();

        if (oldDocuments.length === 0) {
            console.log("No old-format documents found. Exiting.");
            return;
        }

        console.log(`Found ${oldDocuments.length} old-format document(s) to migrate.`);

        for (const doc of oldDocuments) {
            const { data, reportDate, createdAt, updatedAt } = doc;

            if (!Array.isArray(data) || data.length === 0) {
                console.log(`Skipping document ${doc._id} — empty or invalid data array.`);
                continue;
            }

            const newDocs = data.map((botEntry) => ({
                botId: botEntry.botId,
                statistics: botEntry.statistics,
                reportDate: reportDate,
                createdAt: createdAt,
                updatedAt: updatedAt,
                __v: 0,
                migratedByScript: true, // flag to indicate script-inserted documents
            }));

            // Insert new per-bot documents // TODO: insert in new collection
            const insertResult = await collection.insertMany(newDocs);
            console.log(
                `Inserted ${insertResult.insertedCount} new document(s) from old doc ${doc._id}`
            );

            // Delete the old document
            await collection.deleteOne({ _id: doc._id });
            console.log(`Deleted old document ${doc._id}`);
        }

        console.log("Migration complete!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.close();
    }
}

migrateData();