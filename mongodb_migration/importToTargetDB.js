import { MongoClient } from "mongodb";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = "NEW_MONGO_URL"; // destination DB
const dbName = "1spoc";

const collections = ["activitylogs",
    "additionalIntegrations",
    "agenda-events-scheduler",
    "agendaEvents",
    "agendaEvents_LOCAL",
    "agendaEvents20",
    "agendaEvents30",
    "agendaJobs",
    "alfa_beta_gama",
    "apipermissions",
    "apipermissionsmasters",
    "ARCHIVE_WORKFLOWS",
    "bot_journey_reports",
    "bot_tracking",
    "BotAttributeTemplate",
    "botchannels",
    "BotConsumerUnitInvoice",
    "botExecutorPayload",
    "botexecutorpayloadextras",
    "botExternalAPICallLogs",
    "BotRequestLogs",
    "bots",
    "botServices",
    "bottemplates",
    "botversions",
    "businessunits",
    "buttonclickreports",
    "buttonlinks",
    "campaign-backup",
    "Campaign-Workflows",
    "CampaignRecipient",
    "campaignrecipients",
    "campaigns",
    "campaignsystemcriticalexceptionlogs",
    "categories",
    "channelDisplayNameMapping",
    "charges",
    "clickreports",
    "connectorintegration",
    "ConsumerUnitBillingTransactions",
    "consumerUnits",
    "consumerUnitWalletencryptionkeys",
    "featuresMaster",
    "HttpTriggers",
    "integrations",
    "links",
    "org_dashboards",
    "orgAdditionalIntegrations",
    "organisations",
    "OrganizationChannelConfig",
    "organizationFeatures",
    "organizationMedia",
    "organizationSecrets",
    "orgconnectorintegrations",
    "orgconnectorkeys",
    "orgintegrations",
    "ProcessAccessControl",
    "ProcessAuthTokens",
    "processBroadcastProxyClients",
    "ProcessConsumerUnitInvoice",
    "processContainers",
    "Processes",
    "processExecutorPayload",
    "ProcessSubWorkflows",
    "processsystemcriticalexceptionlogs",
    "ProcessVersions",
    "ProcessWorkflows",
    "Products",
    "reportingEventSchemdulear",
    "RunningBotsUserInstance",
    "signups",
    "subscriptions",
    "tags",
    "teamgroups",
    "teammember",
    "teammembers",
    "uipermissions",
    "uipermissionsmasters",
    "userchannels",
    "users",
    "usersreportclone",
    "verifyintegrations",
    "voiceExecutorPayload",
    "wabaIdToIntegrationsMapping",
    "webhookRetryAgendaEvents",
    "WHATSAPP_MESSAGE_ID",
    "WHATSAPP_MESSAGING_SERVICE_MESSAGE_LOGS",
    "WhatsAppFlow",
    "WhatsAppFlowCategoryTemplates",
    "WhatsAppFlowPreview",
    "whatsAppFlowsEncryptionKeys",
    "WhatsAppFlowTemplate",
    "Workflows"];


async function importData() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to destination DB");

        const db = client.db(dbName);

        const seedDir = path.join(__dirname, "seed");

        for (const colName of collections) {
            const filePath = path.join(seedDir, `${colName}.json`);

            if (!(await fs.pathExists(filePath))) {
                console.log(`Skipping ${colName}, file not found`);
                continue;
            }

            const data = await fs.readJson(filePath);

            if (!data.length) {
                console.log(`No data in ${colName}`);
                continue;
            }

            const collection = db.collection(colName);

            // optional: clear collection before insert
            await collection.deleteMany({});

            await collection.insertMany(data);

            console.log(`Inserted ${data.length} records into ${colName}`);
        }

        console.log("Import completed ✅");
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

importData();