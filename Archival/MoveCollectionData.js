import { MongoClient, ObjectId } from "mongodb";
import { spawn } from "child_process";
import { zipFolder, makeDirectory } from "./zipFolder.js";
import path from "path";
import { fileURLToPath } from "url";
import { uploadFile } from "./s3Client.js";
import { LoggerSingleTon } from "./Logger.js";
import { randomUUID } from 'crypto';
import { arch } from "process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = LoggerSingleTon.getLoggerInstance()

// #region Utility functions

// #endregion
function getPreviousVersions(currentVersion) {
    const [major] = currentVersion.split('.').map(Number);

    if (major <= 2) return [];

    return Array.from(
        { length: major - 2 },
        (_, i) => `${i + 1}.0.0`
    );
}

export class MoveDataService {
    static COLLECTIONS = Object.freeze({
        BOTS: 'bots',
        WORKFLOWS: 'Workflows',
        WORKFLOWS_ARCHIVE: 'Workflows_Archive',
    });

    constructor(mongoUri, dbName) {
        this.client = new MongoClient(mongoUri);
        this.mongoUri = mongoUri;
        this.dbName = dbName;

    }

    async connect() {
        await this.client.connect();
        logger.info(`====== Connected to DB ======`);
        this.db = this.client.db(this.dbName);
    }

    async disconnect() {
        logger.info('====== Disonnected to DB ======');
        await this.client.close();
    }

    waitFor = async (timeInMS) => {
        logger.info("Waiting for " + timeInMS + " Miliseconds...")
        return new Promise((resolve) => { setTimeout(() => { resolve(true) }, timeInMS) });
    };

    async runner() {
        try {

            await this.connect();

            const botsCollection = this.db.collection(MoveDataService.COLLECTIONS.BOTS);

            const filter = { deployedVersion: { $exists: true }, status: { $in: ['deployed', 'deleted'] } };
            const projection = { deployedVersion: 1, name: 1, status: 1 };

            const botsDocuments = await botsCollection.find(filter, { projection }).toArray();
            let workflowsfilter = null;

            for (const bot of botsDocuments) {

                if (bot.status === 'deleted') { // If deleted find workflow by bot id and moved directly
                    workflowsfilter = { botId: bot._id.toString(), isDeleted: { exists: false } };
                } else { // else process with version array
                    const versionList = getPreviousVersions(bot.deployedVersion);
                    workflowsfilter = { botId: bot._id.toString(), botVersion: { $in: versionList }, isDeleted: { $exists: false } };
                }

                const batchProcessResult = await this.batchProcessDocument(workflowsfilter);
                logger.info(JSON.stringify({ ...batchProcessResult, bot, tag: 'RUNNER_METHOD' }))
            }
        } catch (error) {
            logger.error(JSON.stringify({
                message: error.message,
                tag: 'RUNNER_METHOD',
            }))
        } finally {
            logger.info(`Processing Finish. Closing mongo connection...`);
            await this.disconnect();
        }
    }

    async batchProcessDocument(filter) {
        const LOG_PREFIX = `BATCH_PROCESS`;
        try {

            const workflowsCollection = this.db.collection(MoveDataService.COLLECTIONS.WORKFLOWS);
            MoveDataService.COLLECTIONS.WORKFLOWS_ARCHIVE

            let totalProcessedDocuments = 0;
            let workflowsDocument = await workflowsCollection.find(filter).limit(10).toArray();

            while (workflowsDocument && workflowsDocument.length > 0) {
                // 1. move batch in target db 
                // 2. get those id and mark them isDeleted = true

                //step1
                const insertResult = await this.insertManyInDb(workflowsDocument, MoveDataService.COLLECTIONS.WORKFLOWS_ARCHIVE);

                if (insertResult.status === 'FAILED') {
                    // TODO :  handle if failed | Partially insert | find if error occured in middle gives ids of inseted documents or not 
                } else {

                    const insertedIds = Object.values(insertResult.data.result.insertedIds);

                    //step2
                    const updateResult = await workflowsCollection.updateMany(
                        { _id: { $in: insertedIds } },
                        {
                            $set: {
                                isDeleted: true,
                                deletedAt: new Date()
                            }
                        }
                    );

                    totalProcessedDocuments += updateResult.modifiedCount;

                }
                logger.info(JSON.stringify({
                    totalProcessedDocuments,
                    botId: filter.botId,
                    versionDescription: `Processing versions 1 to ${filter.botVersion[`$in`].length}`,
                    LOG_PREFIX,
                }))
                await this.waitFor(200);
                workflowsDocument = await workflowsCollection.find(filter).limit(10).toArray();
            }


            return {
                status: "SUCCESS",
                message: `Process all documents successfully!`,
                totalProcessedDocuments,
                botId: filter.botId,
                LOG_PREFIX,
            }

        } catch (error) {
            logger.error(JSON.stringify({
                description: `Error : ${error.message}`,
                filter,
                tag: LOG_PREFIX,
            }));

            return {
                status: "FAILED",
                message: `ERROR : ${error.message}`,
                LOG_PREFIX,
            }
        }
    }

    /**
     * 
     * Partially Insert Method
     * 
     * @param {array} dataToInsert 
     * @param {string} collectionName 
     * @returns 
     */
    async insertManyInDb(dataToInsert, collectionName) {
        const JOB_NAME = 'INSERT_MANY';
        try {
            if (!collectionName) {
                throw new Error("collectionName is required to create collection");
            }

            // If ordered is set to false and an insert fails, the server continues inserting records.
            const result = await this.db.collection(collectionName).insertMany(dataToInsert, { ordered: false });
            return {
                status: "SUCCESS",
                message: `${collectionName} collection created, inserted document count ${result.insertedCount}`,
                data: {
                    job: JOB_NAME,
                    collectionName,
                    status: "SUCCESS",
                    result,
                }
            };
        } catch (error) {

            logger.error(JSON.stringify({
                description: error.message,
                job: JOB_NAME,
                status: "FAILED",
                collectionName,
            }))

            return {
                status: "FAILED",
                message: `ERROR : ${error.message}`,
                job: JOB_NAME,
                collectionName,
            }
        }
    }


    async collectionExists(db, collectionName) {
        const collections = await db
            .listCollections({ name: collectionName })
            .toArray();

        return collections.length > 0;
    }
}