import { MongoClient, ObjectId } from "mongodb";
import { spawn } from "child_process";
import { zipFolder, makeDirectory } from "./zipFolder.js";
import path from "path";
import { fileURLToPath } from "url";
import { uploadFile } from "./s3Client.js";
import { LoggerSingleTon } from "./Logger.js";
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DUMP_DIR_NAME = "DUMP_COLLECTIONS";
const ZIP_DIR_NAME = "ZIPPED_FILES";


function randomDateToday() {
    const start = new Date();
    start.setHours(0, 0, 0, 0); // today 00:00:00

    const end = new Date();
    end.setHours(23, 59, 59, 999); // today 23:59:59

    const randomTime =
        start.getTime() + Math.random() * (end.getTime() - start.getTime());

    return new Date(randomTime);
}

const objectIdByTime = (date) => ObjectId.createFromTime(date);

function convertObjectIdToDate(objectId) {
    return new Date(objectId.getTimestamp());
}

function objectIdMonthsAgo(months) {
    const date = randomDateToday();
    date.setMonth(date.getMonth() - months);

    const seconds = Math.floor(date.getTime() / 1000);
    return ObjectId.createFromTime(seconds);
}

function printArraySizeMB(array) {
    try {
        const sizeMB =
            Buffer.byteLength(JSON.stringify(array)) / (1024 * 1024);

        return `${sizeMB.toFixed(2)} MB`
    } catch (err) {
        console.error("Failed to calculate array size (circular reference)");
    }
}


const getObjectIdFromDate = (dateString) => {
    const date = new Date(dateString); // parse string
    const seconds = Math.floor(date.getTime() / 1000); // ms → sec
    return ObjectId.createFromTime(seconds);
};

const logger = LoggerSingleTon.getLoggerInstance()

// #region Utility functions
const getMonthRange = (year, month) => {
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

// #endregion

export class MongoArchiveService {
    constructor(mongoUri, dbName) {
        this.client = new MongoClient(mongoUri);
        this.mongoUri = mongoUri;
        this.dbName = dbName;
        this.base64 = Buffer.alloc(1024 * 1024).toString('base64');
    }

    async connect() {
        await this.client.connect();
        logger.info('====== Connected to DB ======');
        this.db = this.client.db(this.dbName);
    }

    async disconnect() {
        logger.info('====== Disonnected to DB ======');
        await this.client.close();
    }

    async archiveOldData() {
        try {
            await this.connect();
            // const dbName = '1spoc-staging';
            const collectionArray = ["users"];

            for (let index = 0; index < collectionArray.length; index++) {

                const collectionName = collectionArray[index];
                const collectionInstance = this.db.collection(collectionName);

                const createCollectionResult = await this.createMonthlyCollection(collectionInstance, collectionName);

                if (createCollectionResult.status === "FAILED") {
                    // TODO : WHAT IF FOR ONE MONTH SUCCESS AND SECOND MONTH FAILED
                    // throw new Error("Error occured while creating monthly collection");
                    logger.info(`Error occured while archival of collection ; ${collectionName}`);
                } else {
                    logger.info(`ARCHIVAL DONE FOR COLLECTION : ${collectionName}`);
                }
            }
        } catch (error) {
            logger.info(error);
        } finally {
            await this.client.close();  // always close connection
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

        const collectionUId = `${randomUUID().replaceAll("-", "")}|${baseCollectionName}`;
        const LOG_PREFIX = `MONTHLY_ARCHIVE`;
        const BATCH_SIZE = 100;
        const SKIP_LATEST_MONTHS = 3;
        const DELETE_ARCHIVE_DOCS = true;
        const functionName = `createMonthlyCollection`;

        try {

            // Hard guardrails
            if (!this.db || !collectionInstance || !baseCollectionName) {
                throw new Error("Invalid arguments passed to createMonthlyCollection");
            }
            logger.info(JSON.stringify({
                description: `Creating Monthly Collection for ${baseCollectionName} started`,
                tag: LOG_PREFIX,
                collectionUId,
                functionName,
            }));

            // STEP 1 : Find the upper limit
            const dateUpperLimit = new Date();
            dateUpperLimit.setMonth(dateUpperLimit.getMonth() - SKIP_LATEST_MONTHS - 1);
            dateUpperLimit.setDate(1); // set to start of that month
            dateUpperLimit.setHours(0, 0, 0, 0);

            let _totalProcessDocumentsCount = 0;
            let _processDocumentsForCollection = 0;
            let _iterationCount = 0;
            let _dateWiseCollectionName = null;
            let _prevCollectionName = null;
            const archivalStatistics = [];

            // STEP 2 : Find the oldest document
            let currentOldestDocument = await collectionInstance.findOne({}, {}, { sort: { _id: 1 } });
            // let currentOldestDocument = await collectionInstance.findOne({}, {}, { sort: { _id: 1 } });
            // console.log("currentOldestDocument", currentOldestDocument);

            let targetDate = convertObjectIdToDate(currentOldestDocument._id); // only for workflows
            if (targetDate) {
                logger.info(JSON.stringify({
                    description: `First Target Date ${new Date(targetDate).toLocaleString()}, Upper Limit: ${new Date(dateUpperLimit).toLocaleString()}`,
                    collectionUId,
                    tag: LOG_PREFIX,
                    functionName,
                }));
            } else {
                logger.info(JSON.stringify({
                    description: `No data to process for collection : ${baseCollectionName}`,
                    collectionUId,
                    tag: LOG_PREFIX,
                    functionName,
                }));
            }


            while (currentOldestDocument && targetDate) {

                // STEP 2A : Find month of this document
                const year = targetDate.getFullYear()
                const month = targetDate.getMonth() + 1; // getMonth() gives --> currnetMonth - 1

                const { start, end } = getMonthRange(year, month);
                logger.info(JSON.stringify({
                    description: `Iteration : ${_iterationCount} : ${new Date(start).toLocaleDateString()} < Processing_Range < ${new Date(end).toLocaleDateString()}`,
                    collectionUId,
                    tag: LOG_PREFIX,
                    functionName,
                }));

                // Important : Collection must have indexing on "createdAt" field (NON NEGOTIABLE) 
                const filter = {
                    _id: {
                        "$gte": getObjectIdFromDate(start),
                        "$lt": getObjectIdFromDate(end)
                    }
                };

                console.log(filter);


                _dateWiseCollectionName = getDateWiseCollectionName(targetDate, baseCollectionName);

                // STEP 4 : After processing for one month dump collection -> make zip file -> upload to s3
                if (_prevCollectionName !== _dateWiseCollectionName) {
                    if (_prevCollectionName) { // we got new collection hence dump the previous one 

                        archivalStatistics.push({
                            collectionName: _prevCollectionName,
                            processedDocuments: _processDocumentsForCollection
                        })

                        // await this.dumpZipNUploadToS3(_prevCollectionName);
                        logger.info(JSON.stringify({
                            description: `${_dateWiseCollectionName} collections zip file uploaded on s3`,
                            collectionUId,
                            archivalStatistics,
                            functionName,
                            montlyCollectionName: _dateWiseCollectionName,
                            filter,
                            tag: LOG_PREFIX,
                        }));
                    }
                    _prevCollectionName = _dateWiseCollectionName;
                    _processDocumentsForCollection = 0;
                }

                // STEP 2B : migrate data within that month 
                logger.info(`Fetching START for Documents : ${BATCH_SIZE} ,filter: ${JSON.stringify(filter)}`);
                const _documents = await collectionInstance.find(filter).sort({ _id: 1 }).limit(BATCH_SIZE).toArray();
                logger.info(`Fetching END! Document Size: ${printArraySizeMB(_documents)}`);

                const currentDocumentsLength = _documents.length;
                _totalProcessDocumentsCount += currentDocumentsLength;
                _processDocumentsForCollection += currentDocumentsLength;

                // THIS CONDITION NEVER OCCURE | How will let we know that for one month batch processing is end ??
                // This condition occure when within one month all documents get processed [BATCH PROCCESSING END]
                if (currentDocumentsLength === 0) {
                    logger.info(JSON.stringify({
                        description: `No document found for dateWiseCollectionName : ${_dateWiseCollectionName},  iterationCount : ${_iterationCount}`,
                        collectionUId,
                        functionName,
                        monthlyCollectionName: _dateWiseCollectionName,
                        tag: LOG_PREFIX,
                    }));
                    break;


                }
                logger.info(`INSERT MANY START, DOCUMENT SIZE: ${currentDocumentsLength}`);
                const createCollectionRes = await this.createCollection(_documents, _dateWiseCollectionName);
                logger.info(`INSERT MANY END`);

                if (createCollectionRes.status === "FAILED") {
                    // TODO  : HANDLE IF CASE OF INSERTION FAILS
                    logger.error(JSON.stringify({
                        description: `INSERTION FAILED, ${createCollectionRes.error}`,
                        collectionUId,
                        monthlyCollectionName: _dateWiseCollectionName,
                        functionName,
                        tag: LOG_PREFIX,
                    }));
                    break; // if not break leads to infinite loop due to same document process again n again
                }

                // STEP 3 : Remove the migrated(proccessed) data from db
                if (DELETE_ARCHIVE_DOCS && createCollectionRes.data.result && currentDocumentsLength === createCollectionRes.data.result.insertedCount) {

                    logger.info(`DELETE OPERATTOIN START`);
                    const deleteResult = await this.deleteManyWithObjectIds(collectionInstance, Object.values(createCollectionRes.data.result.insertedIds));
                    logger.info(JSON.stringify({
                        description: `DELETED DOCUMENTS END`,
                        deleteResult,
                        collectionUId,
                        monthlyCollectionName: _dateWiseCollectionName,
                        functionName,
                        tag: LOG_PREFIX,
                    }));
                } else {
                    // if cant able to insert document then also it must be removed / delete from collection, because same document might come again
                }

                logger.info(JSON.stringify({
                    description: `Total processed Documents Count : ${_totalProcessDocumentsCount}`,
                    // archivalStatistics,
                    collectionUId,
                    monthlyCollectionName: _dateWiseCollectionName,
                    functionName,
                    tag: LOG_PREFIX,
                }));

                _iterationCount++;
                currentOldestDocument = await collectionInstance.findOne({}, {}, { sort: { _id: 1 } });
                targetDate = convertObjectIdToDate(currentOldestDocument._id);
            }

            // TODO: Check how many collections are made 
            // 2. IN Sequence, data accurate, should be in range 
            if (_dateWiseCollectionName) {   // TODO : WHEN WILL THIS CONDITION OCCURE ??
                // await this.dumpZipNUploadToS3(_dateWiseCollectionName);
                logger.info(JSON.stringify({
                    description: `${_dateWiseCollectionName} collections zip file uploaded on s3`,
                    collectionUId,
                    functionName,
                    tag: LOG_PREFIX,
                }));
            }

            return {
                data: [],
                status: "SUCCESS"
            };

        } catch (err) {
            logger.info(JSON.stringify({
                description: `Error: ${err.message}`,
                collectionUId,
                functionName,
                tag: LOG_PREFIX,
            }));

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

            const result = await this.db.collection(collectionName).insertMany(monthlyData, { ordered: false }, { new: true });
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

    async addData(collectionName) {
        try {

            await this.connect()
            const collectionInstance = this.db.collection(collectionName);
            let documentInserted = 0;

            let data = await collectionInstance.find({ base64String: { "$exists": false } }).sort({ _id: 1 }).limit(50).toArray();

            for (let index = 2000; index > 0; index--) {

                for (let index = 0; index < 1000; index++) {

                    // const element = array[index];
                    const base64String = this.base64;
                    data = data.map((ele) => {
                        delete ele._id;
                        // ele.base64String = base64String;
                        return ele;
                    });

                    const res = await this.createCollection(data, collectionName);
                    if (res.status === "SUCCESS") {

                        documentInserted += res.data.result.insertedCount;
                        logger.info(`Document Inserted: ${documentInserted}, Iteration Done: ${index}`);
                    } else {
                        logger.info(`Failed Reason: ${res.error}`);
                    }

                    // await new Promise((res, rej) => setTimeout(res, 100))

                }
            }

        } catch (error) {
            logger.info(`Erorr in addData, ${error.message}`);
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

        const isCollectionExist = await this.collectionExists(this.db, collection);
        if (!isCollectionExist) return;

        return new Promise((resolve, reject) => {
            const dump = spawn(`mongodump`, [
                `--uri=${this.mongoUri}/${this.dbName}`,
                `--collection=${collection}`,
                `--out=${outputDir}`
            ]);

            dump.on('close', (code) => {
                if (code === 0) {
                    logger.info(`Dump Completed: ${collection}`);
                    resolve();
                } else {
                    reject(new Error(`Dump failed for ${collection}, code ${code}`))
                }
            });

            dump.on("error", reject)
        })
    }

    /**
     * dumpZipNUploadToS3 is a series of i/o operation, can't be done in parallel 
     * 
     * @param {string} collectionName 
     */
    async dumpZipNUploadToS3(collectionName) {
        const LOG_PREFIX = 'DUMP_ZIP_S3';
        const functionName = `dumpZipNUploadToS3`;
        try {
            const startTime = process.hrtime.bigint();

            await this.dumpCollection(collectionName, `${__dirname}/${DUMP_DIR_NAME}/${collectionName}`);

            const dumpEndTime = process.hrtime.bigint();
            const durationOfDumpMs = Number(dumpEndTime - startTime) / 1e6;
            logger.info(JSON.stringify({
                description: `DUMP COMPLETED in ${durationOfDumpMs.toFixed(2)} MS `,
                collectionName,
                functionName,
                timeTaken: `${durationOfDumpMs.toFixed(2)} MS`,
                tag: LOG_PREFIX,
            }));

            await makeDirectory(`${__dirname}/${ZIP_DIR_NAME}`); // Directory must create or exist before creating zip file
            const outZipPath = await zipFolder(
                path.join(__dirname, `${DUMP_DIR_NAME}/${collectionName}`),
                path.join(`${__dirname}/${ZIP_DIR_NAME}`, `${collectionName}.zip`),
            )

            const zipEndTime = process.hrtime.bigint();
            const durationOfZipMs = Number(zipEndTime - dumpEndTime) / 1e6;
            logger.info(JSON.stringify({
                description: `ZIP COMPLETED in ${durationOfZipMs.toFixed(2)} MS `,
                collectionName,
                functionName,
                timeTaken: `${durationOfZipMs.toFixed(2)} MS`,
                tag: LOG_PREFIX,
            }));


            await uploadFile(collectionName, outZipPath);

            const uploadEndTime = process.hrtime.bigint();
            const durationMs = Number(uploadEndTime - zipEndTime) / 1e6;
            logger.info(JSON.stringify({
                description: `Uploaded on s3 in ${durationMs.toFixed(2)} MS`,
                collectionName,
                functionName,
                timeTaken: `${durationMs.toFixed(2)} MS`,
                tag: LOG_PREFIX,
            }));
        }
        catch (error) { // Not throwing error, bcz dont need
            logger.error(JSON.stringify({
                description: `Error : ${error.message}`,
                collectionName,
                functionName,
                tag: LOG_PREFIX,
            }));
        }
    }

    async collectionExists(db, collectionName) {
        const collections = await db
            .listCollections({ name: collectionName })
            .toArray();

        return collections.length > 0;
    }
}