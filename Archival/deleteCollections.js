import { MongoClient } from "mongodb";


const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);




import { ObjectId } from "mongodb";

/**
 * Deletes multiple documents by ObjectId array
 *
 * @param {Collection} collection - MongoDB collection instance
 * @param {Array<string|ObjectId>} ids - Array of ObjectId or ObjectId strings
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, does not delete (default false)
 * @param {import("mongodb").ClientSession} [options.session] - Optional transaction session
 *
 * @returns {Promise<{ requested: number, deleted: number }>}
 */
export async function deleteManyWithObjectIds(
    collection,
    ids,
    { dryRun = false, session } = {}
) {
    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
        return { requested: 0, deleted: 0 };
    }

    // 2Normalize & validate ObjectIds
    const objectIds = [];
    for (const id of ids) {
        try {
            objectIds.push(id instanceof ObjectId ? id : new ObjectId(id));
        } catch {
            // skip invalid ObjectId
            console.warn("Invalid ObjectId skipped:", id);
        }
    }

    if (objectIds.length === 0) {
        return { requested: ids.length, deleted: 0 };
    }

    // Build filter
    const filter = { _id: { $in: objectIds } };

    // Dry-run support (production safety)
    if (dryRun) {
        const count = await collection.countDocuments(filter, { session });
        return { requested: objectIds.length, deleted: count };
    }

    // Execute delete
    const result = await collection.deleteMany(filter, { session });

    // Structured logging
    console.info("deleteManyWithObjectIds", {
        requested: objectIds.length,
        deleted: result.deletedCount,
        collection: collection.collectionName,
    });

    return {
        requested: objectIds.length,
        deleted: result.deletedCount,
    };
}



/**
 * Deletes a MongoDB collection safely
 * @param {Db} db - MongoDB database instance
 * @param {string} collectionName - Collection to delete
 */
async function deleteCollection(db, collectionName) {
    if (!collectionName) {
        throw new Error("Collection name is required");
    }

    const collections = await db.listCollections(
        { name: collectionName }
    ).toArray();

    if (!collections.length) {
        console.log(`Collection "${collectionName}" does not exist`);
        return;
    }

    await db.collection(collectionName).drop();
    console.log(`Collection "${collectionName}" deleted successfully`);
}


async function deleteCollectionsByName(db, collectionsName = []) {
    try {
        for (const key of collectionsName) {
            await deleteCollection(db, key.replace( "users",'[object Object]'))
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        // await client.close();  // always close connection
    }
}


(async () => {

    await client.connect();
    const sourceDb = client.db('1spoc-staging');

    let collections = [
        '2025_10_users', '2025_09_users',
        '2025_08_users', '2025_07_users',
        '2025_06_users', '2025_05_users',
        '2025_04_users', '2025_03_users',
        '2025_02_users', '2025_01_users',
        '2024_12_users', '2024_11_users',
        '2024_10_users', '2024_09_users',
        '2024_08_users', '2024_07_users',
        '2024_06_users', '2024_05_users',
        '2024_04_users', '2024_03_users',
        '2024_02_users', '2024_01_users',
        '2023_12_users', '2023_11_users',
        '2023_10_users', '2023_09_users',
        '2023_08_users', '2023_07_users',
        '2023_06_users', '2023_05_users'
    ]

    collections = [
        'users_2025_10', 'users_2025_09',
        'users_2025_08', 'users_2025_07',
        'users_2025_06', 'users_2025_05',
        'users_2025_04', 'users_2025_03',
        'users_2025_02', 'users_2025_01',
        'users_2024_12', 'users_2024_11',
        'users_2024_10', 'users_2024_09',
        'users_2024_08', 'users_2024_07',
        'users_2024_06', 'users_2024_05',
        'users_2024_04', 'users_2024_03',
        'users_2024_02', 'users_2024_01',
        'users_2023_12', 'users_2023_11',
        'users_2023_10', 'users_2023_09',
        'users_2023_08', 'users_2023_07',
        'users_2023_06', 'users_2023_05',
        'New_Workflows_2025_06', 'New_Workflows_2025_07',
        'New_Workflows_2025_09', "New_Workflows_2025_08",
    ];


    await deleteCollectionsByName(sourceDb, collections);


})();