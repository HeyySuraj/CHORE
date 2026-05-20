const amqp = require('amqp-connection-manager');
const winston = require('winston');
const LokiTransport = require('winston-loki');
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const { model, Schema } = mongoose;


// ================================= CONFIGURATION: Local ========================================
const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'bot_journey_milestone_node_queue';
const BATCH_SIZE = 100; // Number of messages per batch (Also works as PREFETCH)
const BATCH_INTERVAL_IN_MS = 5000; // Interval (in milliseconds) to insert the batch (5 Second)

const MONGODB_URI = 'mongodb://localhost:27017/1spoc-staging';
const COLLECTION_NAME = 'mileStoneBotJourney';

const ENABLE_DEBUG_LOGS = false;
const ENABLE_LOKI_LOGGING = true;
const LOKI_URL = 'http://localhost:3100';
const LOG_GROUP_NAME = '1SPOC';
const LOG_SERVICE_NAME = 'milestone-bot-journey';


// ======================================== MONGO-DB ==========================================

const BotTrackingSchema = new Schema(
    {
        botId: { type: String, required: true },
        executionId: { type: String, required: true, index: true },
        recipientId: { type: Number, required: true, index: true },
        serviceId: { type: String, required: true, index: true },
        stage: { type: String, required: true },
        data: { type: Object, required: true },
        createdAt: { type: Number, required: true, default: () => Date.now() },
    },
    { strict: false, autoIndex: true }
);

class DynamicModel {
    constructor() {
        this.modelCache = {};
    }

    getCollectionName({ collectionName, uniqueIdWithEpochTime }) {
        // if (uniqueIdWithEpochTime == null) {
        //     return collectionName;
        // }

        // let epochTime = null;

        // if (uniqueIdWithEpochTime.includes('T')) {
        //     const splittedArray = uniqueIdWithEpochTime.split('T');
        //     epochTime = Number(splittedArray[0]);
        // }

        // if (epochTime == null || Number.isNaN(epochTime)) {
        //     return collectionName;
        // }

        const istFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });

        const parts = istFormatter.formatToParts(uniqueIdWithEpochTime);
        const year = parts.find(p => p.type === 'year').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;

        const prefixString = `${year}_${month}_${day}`;
        return `${prefixString}_${collectionName}`;
    }

    async getMongooseModel(collectionName, schema) {
        try {
            if (!this.modelCache[collectionName]) {
                // await model(collectionName, schema, collectionName).init();
                this.modelCache[collectionName] = model(collectionName, schema, collectionName);
            }

            return this.modelCache[collectionName];
        } catch (error) {
            console.log(error);
        }
    }
}
// ========================================== LOGGER ===========================================
class Logger {
    /** @type {winston.Logger} */
    #logger = null;
    #debugLogsEnabled = false;

    /**
     * @param {boolean} enableLokiLogging
     * @param {boolean} enableDebugLogs
     */

    constructor(enableLokiLogging, enableDebugLogs) {
        if (enableLokiLogging === true) {
            this.#initializeLokiLogger();
        }

        this.#debugLogsEnabled = enableDebugLogs;
        enableDebugLogs && this.#logger.info(`===== DEBUG LOGS ENABLED ======`);
    }

    #getFormattedTimestamp() {
        const d = new Date();
        const date = d.toISOString().split('T')[0];
        const time = d.toTimeString().split(' ')[0];
        return `${date} ${time}`;
    }

    #initializeLokiLogger() {
        this.#logger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss',
                }),
                winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
            ),
            transports: [
                new LokiTransport({
                    host: LOKI_URL,
                    onConnectionError: error => console.error(JSON.stringify({ error, description: 'Loki connection error', tag: 'LOKI' })),
                    useWinstonMetaAsLabels: false,
                    batching: true,
                    interval: 5,
                    labels: { appname: LOG_GROUP_NAME, service_name: LOG_SERVICE_NAME },
                }),
            ],
        });

        this.#logger.add(
            new winston.transports.Console({
                format: winston.format.combine(winston.format.splat(), winston.format.colorize()),
            }),
        );

        this.#logger.info('== INITIALIZED LOKI LOGGER ==');
    }

    info(message) {
        if (this.#logger) {
            return this.#logger.info(message);
        }

        console.log(this.#getFormattedTimestamp(), 'info:', message);
    }

    debug(message) {
        if (this.#debugLogsEnabled == false) {
            return;
        }

        if (this.#logger) {
            return this.#logger.info(message);
        }

        console.log(this.#getFormattedTimestamp(), 'debug:', message);
    }

    error(message) {
        if (this.#logger) {
            return this.#logger.error(message);
        }

        console.log(this.#getFormattedTimestamp(), 'error:', message);
    }
}

class SingleTon {
    /** @type {Logger} */
    static #loggerInstance = null;

    static getLoggerInstance() {
        if (SingleTon.#loggerInstance === null) {
            SingleTon.#loggerInstance = new Logger(ENABLE_LOKI_LOGGING, ENABLE_DEBUG_LOGS);
        }

        return SingleTon.#loggerInstance;
    }
}
// ==============================================================================================

class BatchProcessor {
    #batchSize = BATCH_SIZE;
    #batchInterval = BATCH_INTERVAL_IN_MS;
    #batchTimer = null;
    #batchCompletionCallback = () => { };
    #logger = SingleTon.getLoggerInstance();
    #tag = 'BATCH_PROCESSOR';


    #modelService = new DynamicModel();


    /** @type { Array<string> } */
    #messageBatch = [];
    /** @param {Function} batchCompletionCallback - A callback which is called after the batch in completed and flushed.. */
    constructor(batchCompletionCallback) {
        if (!batchCompletionCallback) {
            return this.#logger.error(JSON.stringify({ description: 'Batch completion callback not received!', tag: this.#tag }));
        }
        this.#batchCompletionCallback = batchCompletionCallback;
    }

    /**
     *
     * @param {TParsedMessage} message
     */
    pushMessageToBatch(message) {
        try {
            const object = {
                botId: message.payload.botId,
                executionId: message.payload.executionId,
                recipientId: message.payload.recipientId,
                serviceId: message.payload.stagesData.serviceId,
                stage: message.payload.stagesData.stage,
                data: message.payload.stagesData.data ?? {},
            };
            this.#messageBatch.push(object);
        } catch (error) {
            console.log(error)
        }
    }

    getCurrentBatchSize() {
        return this.#messageBatch.length;
    }

    async checkAndProcessBatch() {
        if (this.#messageBatch.length >= this.#batchSize) {
            return await this.#processBatch();
        }
        this.#registerBatchProcessingTimer();
    }

    #flushBatch() {
        this.#messageBatch = [];
    }

    #removeBatchProcessingTimer() {
        if (this.#batchTimer) {
            this.#logger.debug(JSON.stringify({ description: 'Cleared Timer', tag: this.#tag }));
            clearTimeout(this.#batchTimer);
            this.#batchTimer = null;
        }
    }

    /** Ensures only one timer is registered; returns existing or newly created timer ID. */
    #registerBatchProcessingTimer() {
        if (this.#batchTimer === null) {
            this.#batchTimer = setTimeout(async () => {
                await this.#processBatch(true);
            }, this.#batchInterval);

            this.#logger.debug(JSON.stringify({ description: 'Started Timer', tag: this.#tag }));
        }
    }

    /** @param {{ invokedFromTimerFunction?: boolean }} param0 */
    async #processBatch(invokedFromTimerFunction = false) {
        const batchExecutionStartTime = Date.now();
        const batchExecutionId = `${randomUUID().replaceAll('-', '')}T${batchExecutionStartTime}`;
        this.#logger.info(
            JSON.stringify({
                description: 'Started batch processing!',
                tag: this.#tag,
                batchExecutionId,
                invokeReason: invokedFromTimerFunction ? 'TIMER_FUNCTION_TRIGGER' : 'BATCH_FULL',
                batchSize: this.#messageBatch.length,
            }),
        );

        this.#removeBatchProcessingTimer();
        await this.#executeBatchProcessing(batchExecutionId);
        this.#flushBatch();
        this.#batchCompletionCallback();

        this.#logger.info(
            JSON.stringify({
                description: 'Completed batch processing!',
                tag: this.#tag,
                batchExecutionId,
                timeTakenInMS: Date.now() - batchExecutionStartTime,
            }),
        );
        return true;
    }

    async #executeBatchProcessing(batchExecutionId) {
        try {
            if (this.#messageBatch.length == 0) {
                return;
            }
            const startTime = Date.now();
            this.#logger.debug(
                JSON.stringify({
                    description: 'MileStone report batch inserting started!',
                    tag: this.#tag,
                    batchExecutionId,
                }),
            );
            try {
                const collectionNameForDate = this.#modelService.getCollectionName({
                    collectionName: COLLECTION_NAME,
                    // uniqueIdWithEpochTime: stage.executionId,
                    uniqueIdWithEpochTime: Date.now(),
                });

                const dynamicModel = await this.#modelService.getMongooseModel(collectionNameForDate, BotTrackingSchema);

                const response = await dynamicModel.insertMany(this.#messageBatch);

                this.#logger.info(
                    JSON.stringify({
                        description: 'Inserted data successfully.',
                        tag: this.#tag,
                        batchExecutionId,
                        messageBatchLength: this.#messageBatch.length,
                        response: response
                    }),
                );
            } catch (error) {
                this.#logger.error(
                    JSON.stringify({
                        description: 'Unable to Update milestone report.',
                        error: error,
                        tag: this.#tag,
                        batchExecutionId,
                    }),
                );
            }
            this.#logger.debug(
                JSON.stringify({
                    description: 'milestone report batch inserting completed!',
                    tag: this.#tag,
                    batchExecutionId,
                    messagesLength: this.#messageBatch.length,
                    timeTakenInMS: Date.now() - startTime,
                }),
            );
        } catch (error) {
            this.#logger.error(
                JSON.stringify({
                    description: 'Error occurred while handling milestone bot messages!',
                    tag: this.#tag,
                    error: error.message,
                    batchExecutionId,
                }),
            );
        }
    }
}

const consumerInitialize = async channel => {
    const logger = SingleTon.getLoggerInstance();

    const acknowledgeAllMessages = () => {
        try {
            channel.ackAll();
            logger.debug(JSON.stringify({ description: 'All messages acknowledged' }));
        } catch (error) {
            logger.error(JSON.stringify({ description: 'Error occurred while acknowledging messages!', error: error.message }));
        }
    };
    const batchProcessor = new BatchProcessor(acknowledgeAllMessages);

    channel.consume(QUEUE_NAME, async message => {
        if (!message) {
            return channel.ack(message);
        }

        try {
            /** @type {TParsedMessage} */
            const parsedMessage = JSON.parse(message.content.toString());

            batchProcessor.pushMessageToBatch(parsedMessage);
            logger.info(
                JSON.stringify({
                    description: 'Message received and pushed to batch',
                    currentBatchSize: batchProcessor.getCurrentBatchSize(),
                    // message: parsedMessage,
                }),
            );
            await batchProcessor.checkAndProcessBatch();
        } catch (error) {
            logger.error(JSON.stringify({ description: 'Error occurred while processing message!', error: error.message }));

            // Optionally, requeue the message if processing fails
            channel.nack(message, false, true);
        }
    });
    logger.info('==== INITIALIZED CONSUMER ===');
};

async function main() {
    const logger = SingleTon.getLoggerInstance();

    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
        logger.info('====== Connected to DB ======');
    });

    // Connect to RabbitMQ
    const connection = amqp.connect(RABBITMQ_URL);

    connection.on('connect', () => {
        logger.info('====== RabbitMQ connection established ======');
    });

    connection.on('disconnect', err => {
        logger.error('====== RabbitMQ connection disconnected ======', err);
    });

    // create channel
    // assert queue
    const channel = connection.createChannel({
        setup: async function (channel) {
            logger.info(`==== PREFETCH_COUNT: ${BATCH_SIZE ? Number(BATCH_SIZE) : 1} ====`);
            await channel.prefetch(BATCH_SIZE ? Number(BATCH_SIZE) : 1);
            await channel.assertQueue(QUEUE_NAME, { arguments: { 'x-queue-type': 'quorum' }, durable: true });
            logger.info(`= Asserted queue : ${QUEUE_NAME} =`);
        },
    });

    // Attach channel listeners HERE
    channel.on('connect', () => {
        logger.info('====== Channel connected & ready ======');
    });

    channel.on('error', err => {
        logger.error('====== Channel error ======', err);
    });

    channel.on('disconnect', err => {
        logger.error('====== Channel disconnected ======', err);
    });

    await consumerInitialize(channel);
}

main().catch(console.error);
 