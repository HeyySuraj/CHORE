import nodeCron from "node-cron";
import { MongoArchiveService } from "./archiveDB.js";

let isJobRunning = false;

const mongoUri = "mongodb://localhost:27017";
const dbName = "1spoc-staging"
const mongoArchiveService = new MongoArchiveService(mongoUri, dbName)

nodeCron.schedule("*/1 * * * *", async () => {
    if (isJobRunning) {
        console.log("Previous job still running, skipping this minute");
        return;
    }

    isJobRunning = true;

    console.log(`---- SCHEDULER START: ${new Date().toLocaleString()} ----`);

    try {
        await mongoArchiveService.archiveOldData();
    } catch (err) {
        console.error("Archive failed", err);
    } finally {
        isJobRunning = false;
        console.log(`---- SCHEDULER END: ${new Date().toLocaleString()} ----`);
    }
});
