import { MongoClient } from "mongodb";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = "mongodb://localhost:27017/1spoc-staging?retryWrites=false"; // source DB
const dbName = "1spoc";
const orgId = "65195e9519dc60003XXXXX"; // filter value

// TODO: CHECK FOR OF _ID IS CREATED AND ADD ORGNISATIONS COLLECTIONS


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

async function exportData() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to source DB");

        const db = client.db(dbName);

        const seedDir = path.join(__dirname, "seed");

        // create seed folder if not exists
        await fs.ensureDir(seedDir);

        for (const colName of collections) {
            const collection = db.collection(colName);

            // fetch data based on org_id
            const data = await collection.find({ org_id: orgId }).toArray();

            console.log(`Fetched ${data.length} records from ${colName}`);

            const filePath = path.join(seedDir, `${colName}.json`);

            // ✅ Serialize using EJSON to preserve ObjectId as { $oid: "..." }
            const serialized = EJSON.serialize(data, { relaxed: false });
            await fs.writeFile(filePath, JSON.stringify(serialized, null, 2));

            console.log(`Saved -> ${filePath}`);
        }

        console.log("Export completed ✅");
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

exportData();