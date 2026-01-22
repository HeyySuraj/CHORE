import winston from "winston";
import LokiTransport from "winston-loki";

const ENABLE_DEBUG_LOGS = false;
const ENABLE_LOKI_LOGGING = true;
const LOKI_URL = 'http://localhost:3100';
const LOG_GROUP_NAME = 'APP_NAME';
const LOG_SERVICE_NAME = 'USER_SERVICE';


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

export class LoggerSingleTon {
    /** @type {Logger} */
    static #loggerInstance = null;

    static getLoggerInstance() {
        if (LoggerSingleTon.#loggerInstance === null) {
            LoggerSingleTon.#loggerInstance = new Logger(ENABLE_LOKI_LOGGING, ENABLE_DEBUG_LOGS);
        }

        return LoggerSingleTon.#loggerInstance;
    }
}
// ==============================================================================================
