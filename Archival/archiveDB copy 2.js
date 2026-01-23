import { MongoClient } from "mongodb";
import { spawn } from "child_process";
import { zipFolder, makeDirectory } from "./zipFolder.js";
import path from "path";
import { fileURLToPath } from "url";
import { uploadFile } from "./s3Client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DUMP_DIR_NAME = "DUMP_COLLECTIONS";
const ZIP_DIR_NAME = "ZIPPED_FILES";


const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
// const archiveclient = new MongoClient(uri);



export async function deleteManyWithObjectIds(
    collection,
    objectIds = []
) {
    // Validate input
    if (!Array.isArray(objectIds) || objectIds.length === 0) {
        return { requested: 0, deleted: 0 };
    }

    // Normalize & validate ObjectIds
    // const objectIds = [];

    // Build filter
    const filter = { _id: { $in: objectIds } };

    // Execute delete
    const result = await collection.deleteMany(filter);

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


function getMonthRange(year, month) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end };
}


const getDateWiseCollectionName = (date, baseCollectionName) => {
    const formattedDate = new Date(date);

    const year = formattedDate.getFullYear();
    const month = String(formattedDate.getMonth() + 1).padStart(2, '0');

    return `${baseCollectionName}_${year}_${month}`;
}

/**
 * Creates a month-wise collection name in the format: YYYY_MM_<baseName>
 */
async function createMonthWiseCollection(db, monthlyData, collectionName, date) {
    try {
        if (!date) {
            throw new Error("Date is required to create month-wise collection");
        }

        const startTime = Date.now()
        const result = await db.collection(collectionName).insertMany(monthlyData);
        const endTime = Date.now()
        return {
            status: "SUCCESS",
            message: `${collectionName} collection created, inserted document count ${result.insertedCount}`,
            data: {
                job: "monthly-archive",
                // date: `${year}_${month}`,
                collectionName,
                status: "SUCCESS",
                result,
                durationMs: endTime - startTime,
            }
        };
    } catch (error) {

        return {
            status: "FAILED",
            error: error.message || "",
            message: `Collection is not created with params collection: ${baseCollectionName}, date : ${date}`,
            data: {
                job: "monthly-archive",
                date: date,
                status: "FAILED",
                // arguments: JSON.stringify(arguments),
                error: error.message ?? JSON.stringify(error)
            }
        }

    }
}

async function collectionExists(db, collectionName) {
    const collections = await db
        .listCollections({ name: collectionName })
        .toArray();

    return collections.length > 0;
}


// (https://chatgpt.com/c/6965e8fc-7924-8322-aa63-894012ed83c5)
/**
 * spawn runs command and streams output chunk-by-chunk
 * we prefer spawn over exec because spawn is safe, scalable, and predictable for long-running / large processes like mongodump.
 * 
 * @param {*} dbUri 
 * @param {*} dbName 
 * @param {*} collection 
 * @param {*} outputDir 
 * @returns 
 */
async function dumpCollection(dbUri, dbName, collection, outputDir = "./mongoDump") {

    const isCollectionExist = await collectionExists(db, collection);
    if (!isCollectionExist) return;

    return new Promise((resolve, reject) => {
        const dump = spawn(`mongodump`, [
            `--uri=${dbUri}/${dbName}`,
            `--collection=${collection}`,
            `--out=${outputDir}`
        ]);

        dump.on('close', (code) => {
            if (code === 0) {
                console.log(`Dump Completed: ${collection}`);
                resolve();
            } else {
                reject(new Error(`Dump failed for ${collection}, code ${code}`))
            }
        });

        dump.on("error", reject)
    })
}

// TODO: create montly collection
async function createMonthlyCollection(sourceDb, collectionInstance, baseCollectionName) {
    const LOG_PREFIX = "[MONTHLY_ARCHIVE]";
    const BATCH_SIZE = 200;
    try {

        // Hard guardrails
        if (!sourceDb || !collectionInstance || !baseCollectionName) {
            throw new Error("Invalid arguments passed to createMonthlyCollection");
        }

        console.log(`----------------------------------- Creating Monthly Collection START: ${new Date().toLocaleString()} -----------------------------------`);

        let monthsOffset = 3; // skip latest three months

        // TODO : Add This data in seperate collection
        const archiveCollectionsData = []
        const archiveCollectionsName = []

        const dateUpperLimit = new Date();
        dateUpperLimit.setMonth(dateUpperLimit.getMonth() - monthsOffset - 1);
        let _processDocumentsCount = 0;
        let _iterationCount = 0;
        let _dateWiseCollectionName = null;

        while (true) {

            const currentOldestDocument = await collectionInstance.findOne({}, {}, { sort: { createdAt: 1 } });
            if (!currentOldestDocument) {
                console.log(`${LOG_PREFIX} : No document found for CollectionName: ${baseCollectionName}, iterationCount : ${_iterationCount}`);

                // await dumpCollection()

                break;
            }

            let targetMonth = currentOldestDocument.createdAt;
            const year = targetMonth.getFullYear()
            const month = targetMonth.getMonth() + 1; // get month gives currnetMonth - 1

            const { start, end } = getMonthRange(year, month);
            console.log(` ${start} < Processing range < ${end}`);

            // Important : Collection must have indexing on "createdAt" field  (NON NEGOTIABLE) 
            const filter = { createdAt: { "$gte": start, "$lt": end } };

            _dateWiseCollectionName = getDateWiseCollectionName(targetMonth, baseCollectionName);
            // archiveCollectionsName.push();

            const _documents = await collectionInstance.find(filter).sort({ createdAt: 1 }).limit(BATCH_SIZE).toArray();
            const currentDocumentsLength = _documents.length;

            if (currentDocumentsLength === 0) {
                console.log(`${LOG_PREFIX} : No document found for collectionName : ${_dateWiseCollectionName},  iterationCount : ${_iterationCount}`);
                break;
            }

            _processDocumentsCount += currentDocumentsLength;
            const createCollectionRes = await createMonthWiseCollection(sourceDb, _documents, _dateWiseCollectionName, targetMonth);

            // TODO : Add This data in seperate collection (if cron executed)
            archiveCollectionsData.push(createCollectionRes.data);

            if (createCollectionRes.status === "FAILED") {
                // TODO  : HANDLE IF CASE OF INSERTION FAILS
                console.log("INSERTION FAILS");
            }

            // STEP 2 : DELETE THE INSERTED DOCUMENTS with objectiIds
            if (createCollectionRes.data.result && currentDocumentsLength === createCollectionRes.data.result.insertedCount) {
                await deleteManyWithObjectIds(collectionInstance, Object.values(createCollectionRes.data.result.insertedIds))
            }
            console.log("processedDocumentsCount", _processDocumentsCount);


            if (createCollectionRes.error) console.log(createCollectionRes.error);

            _iterationCount++;
        }

        console.log(`----------------------------------- Creating Monthly Collection END: ${new Date().toLocaleString()} -----------------------------------`);

        return {
            data: archiveCollectionsName,
            status: "SUCCESS"
        };

    } catch (err) {
        console.error("Error:", err);
        return {
            data: [],
            status: "FAILED"
        };
    } finally {
    }
}



export async function archiveOldData() {

    try {

        await client.connect();
        const dbName = '1spoc-staging';
        const collectionArray = ["users"];
        const sourceDb = client.db(dbName);


        for (let index = 0; index < collectionArray.length; index++) {

            const collectionName = collectionArray[index];
            const sourceCollection = sourceDb.collection(collectionName);

            // STEP: 1 CREATING MONTHLY COLLECTION
            const createCollectionResult = await createMonthlyCollection(sourceDb, sourceCollection, collectionName);

            if (createCollectionResult.status === "FAILED") {
                // TODO : WHAT IF FOR ONE MONTH SUCCESS AND SECOND MONTH FAILED
                throw new Error("Error occured while creating monthly collection");
            }

            const monthlyCollection = createCollectionResult.data;

        }



        // STEP: 3 MAKE ZIP FILES OF DUMP COLLECTION
        // const zippedDirName = 'ZIPPED_FILES';
        // await makeDirectory(zippedDirName); // Directory must create or exist before creating zip file
        // for (const key of monthlyCollection) {
        //     await zipFolder(
        //         path.join(__dirname, `${dumpDirName}/${key}`),
        //         path.join(`${__dirname}/${zippedDirName}`, `${key}.zip`),
        //     )
        // }

    } catch (error) {
        console.log(error);
    } finally {
        await client.close();  // always close connection

    }
}


export class MongoArchiveService {
    constructor(mongoUri, dbName) {
        this.client = new MongoClient(mongoUri);
        this.mongoUri = mongoUri;
        this.dbName = dbName;
    }

    async connect() {
        await this.client.connect();
        this.db = this.client.db(this.dbName);
    }

    async disconnect() {
        await this.client.close();
    }

    async archiveOldData() {
        try {
            await this.connect();
            // const dbName = '1spoc-staging';
            const collectionArray = ["Workflows", "users", "New_Workflows"];

            for (let index = 0; index < collectionArray.length; index++) {

                const collectionName = collectionArray[index];
                const collectionInstance = this.db.collection(collectionName);

                const createCollectionResult = await this.createMonthlyCollection(collectionInstance, collectionName);

                if (createCollectionResult.status === "FAILED") {
                    // TODO : WHAT IF FOR ONE MONTH SUCCESS AND SECOND MONTH FAILED
                    // throw new Error("Error occured while creating monthly collection");
                    console.log(`Error occured while archival of collection ; ${collectionName}`);
                } else {
                    console.log(`ARCHIVAL DONE FOR COLLECTION : ${collectionName}`);
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            await client.close();  // always close connection
        }
    }

    /**
     * This method migrate the data by creating a month wise collections and delete the migrated data 
     *  STEP 1 : Find the upper limit & migrate the data from upper_limit to oldest document of collection
     *  STEP 2 : Start from the oldest document : Find month of this document : migrate data within that month 
     *  STEP 3 : Remove the migrated(proccessed) data from db 
     *  STEP 4 : After processing for one month dump collection -> make zip file -> upload to s3    
     *  STEP 5 : Recursively do for every month (while loop)    
     * 
     * @param {*} collectionInstance 
     * @param {string} baseCollectionName 
     * @returns 
     */
    async createMonthlyCollection(collectionInstance, baseCollectionName) {

        const LOG_PREFIX = `MONTHLY_ARCHIVE|${baseCollectionName}`;
        const BATCH_SIZE = 200;
        const SKIP_LATEST_MONTHS = 3;
        const DELETE_ARCHIVE_DOCS = true;

        try {

            // Hard guardrails
            if (!this.db || !collectionInstance || !baseCollectionName) {
                throw new Error("Invalid arguments passed to createMonthlyCollection");
            }

            console.log(`${LOG_PREFIX} Creating Monthly Collection for ${baseCollectionName} START: ${new Date().toLocaleString()} `);

            // STEP 1 : Find the upper limit
            const dateUpperLimit = new Date();
            dateUpperLimit.setMonth(dateUpperLimit.getMonth() - SKIP_LATEST_MONTHS - 1);
            dateUpperLimit.setDate(1); // set to start of that month
            dateUpperLimit.setHours(0, 0, 0, 0);

            let _processDocumentsCount = 0;
            let _iterationCount = 0;
            let _dateWiseCollectionName = null;
            let _prevCollectionName = null;

            // STEP 2 : Find the oldest document
            let currentOldestDocument = await collectionInstance.findOne({ createdAt: { $exists: true } }, {}, { sort: { createdAt: 1 } });
            let targetDate = currentOldestDocument && currentOldestDocument.createdAt;

            while (currentOldestDocument && targetDate < dateUpperLimit) {

                // STEP 2A : Find month of this document
                const year = targetDate.getFullYear()
                const month = targetDate.getMonth() + 1; // getMonth() gives --> currnetMonth - 1

                const { start, end } = getMonthRange(year, month);
                console.log(`${LOG_PREFIX} : ${start} < Processing_Range < ${end}`);

                // Important : Collection must have indexing on "createdAt" field (NON NEGOTIABLE) 
                const filter = { createdAt: { "$gte": start, "$lt": end } };

                _dateWiseCollectionName = getDateWiseCollectionName(targetDate, baseCollectionName);

                // STEP 4 : After processing for one month dump collection -> make zip file -> upload to s3
                if (_prevCollectionName !== _dateWiseCollectionName) {
                    if (_prevCollectionName) { // we got new collection hence dump the previous one 

                        console.log(`${LOG_PREFIX} | BATCH PROCCESSING END FOR ${_prevCollectionName} | DUMP-ZIP-UploadToS3 START`);
                        await this.dumpZipNUploadToS3(_prevCollectionName);
                        console.log(`${LOG_PREFIX} | DUMP-ZIP-UploadToS3 END`);
                    }
                    _prevCollectionName = _dateWiseCollectionName;
                }

                // STEP 2B : migrate data within that month 
                const _documents = await collectionInstance.find(filter).sort({ createdAt: 1 }).limit(BATCH_SIZE).toArray();
                const currentDocumentsLength = _documents.length;
                _processDocumentsCount += currentDocumentsLength;

                // THIS CONDITION NEVER OCCURE | How will let we know that for one month batch processing is end ??
                // This condition occure when within one month all documents get processed [BATCH PROCCESSING END]

                if (currentDocumentsLength === 0) {
                    console.log(`${LOG_PREFIX} : No document found for _dateWiseCollectionName : ${_dateWiseCollectionName},  iterationCount : ${_iterationCount}`);
                    break;
                }
                const createCollectionRes = await this.createCollection(_documents, _dateWiseCollectionName);

                if (createCollectionRes.status === "FAILED") {
                    // TODO  : HANDLE IF CASE OF INSERTION FAILS
                    console.log("INSERTION FAILS", createCollectionRes.error);
                    break; // if not break leads to infinite loop due to same document process again n again
                }

                // STEP 3 : Remove the migrated(proccessed) data from db
                if (DELETE_ARCHIVE_DOCS && createCollectionRes.data.result && currentDocumentsLength === createCollectionRes.data.result.insertedCount) {
                    await this.deleteManyWithObjectIds(collectionInstance, Object.values(createCollectionRes.data.result.insertedIds))
                }

                console.log(`${LOG_PREFIX} Processed Documents Count : `, _processDocumentsCount);

                _iterationCount++;
                currentOldestDocument = await collectionInstance.findOne({ createdAt: { $exists: true } }, {}, { sort: { createdAt: 1 } });
                targetDate = currentOldestDocument && currentOldestDocument.createdAt;
            }

            if (_dateWiseCollectionName) {
                await this.dumpZipNUploadToS3(_dateWiseCollectionName);
            }

            return {
                data: [],
                status: "SUCCESS"
            };

        } catch (err) {
            console.error("Error:", err);
            return {
                data: [],
                status: "FAILED"
            };
        }
    }

    async createCollection(monthlyData, collectionName) {
        try {
            if (!collectionName) {
                throw new Error("collectionName is required to create collection");
            }

            const result = await this.db.collection(collectionName).insertMany(monthlyData);
            return {
                status: "SUCCESS",
                message: `${collectionName} collection created, inserted document count ${result.insertedCount}`,
                data: {
                    job: "monthly-archive",
                    collectionName,
                    status: "SUCCESS",
                    result,
                    // durationMs: endTime - startTime,
                }
            };
        } catch (error) {

            return {
                status: "FAILED",
                error: error.message || "",
                message: `Collection is not created with params collection: ${collectionName}`,
                data: {
                    job: "monthly-archive",
                    status: "FAILED",
                    collectionName,
                    error: error.message, // TODO : pass valid error message
                }
            }

        }
    }

    async deleteManyWithObjectIds(
        collection,
        objectIds = []
    ) {
        // Validate input
        if (!Array.isArray(objectIds) || objectIds.length === 0) {
            return { requested: 0, deleted: 0 };
        }

        // Normalize & validate ObjectIds
        // const objectIds = [];

        // Build filter
        const filter = { _id: { $in: objectIds } };

        // Execute delete
        const result = await collection.deleteMany(filter);

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

    // (https://chatgpt.com/c/6965e8fc-7924-8322-aa63-894012ed83c5)
    /**
     * spawn runs command and streams output chunk-by-chunk
     * we prefer spawn over exec because spawn is safe, scalable, and predictable for long-running / large processes like mongodump.
     * 
     * @param {*} dbUri 
     * @param {*} dbName 
     * @param {*} collection 
     * @param {*} outputDir 
     * @returns 
     */
    async dumpCollection(collection, outputDir = "./mongoDump") {

        const isCollectionExist = await collectionExists(this.db, collection);
        if (!isCollectionExist) return;

        return new Promise((resolve, reject) => {
            const dump = spawn(`mongodump`, [
                `--uri=${this.mongoUri}/${this.dbName}`,
                `--collection=${collection}`,
                `--out=${outputDir}`
            ]);

            dump.on('close', (code) => {
                if (code === 0) {
                    console.log(`Dump Completed: ${collection}`);
                    resolve();
                } else {
                    reject(new Error(`Dump failed for ${collection}, code ${code}`))
                }
            });

            dump.on("error", reject)
        })
    }

    async dumpZipNUploadToS3(collectionName) {
        const LOG_PREFIX = 'DUMP_ZIP_S3';
        try {

            await this.dumpCollection(collectionName, `${__dirname}/${DUMP_DIR_NAME}/${collectionName}`);
            console.log(`${LOG_PREFIX} MONGO DUMP DONE FOR `, collectionName);

            await makeDirectory(`${__dirname}/${ZIP_DIR_NAME}`); // Directory must create or exist before creating zip file
            const outZipPath = await zipFolder(
                path.join(__dirname, `${DUMP_DIR_NAME}/${collectionName}`),
                path.join(`${__dirname}/${ZIP_DIR_NAME}`, `${collectionName}.zip`),
            )
            console.log(`${LOG_PREFIX} ZIPPED DONE FOR DUMP FILES FOR `, collectionName);

            await uploadFile(collectionName, outZipPath);
            console.log(`${LOG_PREFIX} UPLOADED ZIP FILE TO S3 `, collectionName);
        }
        catch (error) {
            console.log(`${LOG_PREFIX} Error in dumpZipNUploadToS3 `, error.message);
        }
    }

}