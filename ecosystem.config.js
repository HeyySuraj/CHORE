// ecosystem.config.js
module.exports = {
    apps: [  // pm2 start ecosystem.config.js --env production
        {
            name: "RCS_CHANNEL",
            script: "./dist/server.js",
            instances: 1,
            exec_mode: "cluster",
            env: {
                NODE_ENV: "development",
                CHANNEL_ID: "rcs",
                PORT: 80,
            },
            env_production: {
                NODE_ENV: "production",
                CHANNEL_ID: "rcs",
                PORT: 80,
            },
        },
        {
            name: "WEBCHAT_CHANNEL",
            script: "./dist/server.js",
            instances: 1,
            exec_mode: "cluster",
            env: {
                NODE_ENV: "development",
                CHANNEL_ID: "webchat",
                PORT: 81, // give different ports
            },
            env_production: {
                NODE_ENV: "production",
                CHANNEL_ID: "webchat",
                PORT: 81,
            },
        },
        {
            name: "BOT_ATTRIBUTE_REPORT_SCRIPT",
            script: "./scripts/BOT_ATTRIBUTE_REPORT_SCRIPT.js",
            instances: 1,
            exec_mode: "cluster",
        },
        {
            name: "MILESTONE_SCRIPT",
            script: "./scripts/MILESTONE_SCRIPT.js",
            instances: 1,
            exec_mode: "cluster",
        },
        {
            name: "SAVE_WHATSAPP_FLOW_RESPONSES",
            script: "./scripts/SAVE_WHATSAPP_FLOW_RESPONSES.js",
            instances: 1,
            exec_mode: "cluster",
        },
        {
            name: "USER_DATA_UPDATE_SCRIPT",
            script: "./scripts/USER_DATA_UPDATE_SCRIPT.js",
            instances: 1,
            exec_mode: "cluster",
        },
        {
            name: "WHATSAPP_CONV_LOG",
            script: "./scripts/WHATSAPP_CONV_LOG.js",
            instances: 1,
            exec_mode: "cluster",
        },
        {
            name: "WHATSAPP_CONV_MESSAGE_SENT_BY_BOT",
            script: "./scripts/WHATSAPP_CONV_MESSAGE_SENT_BY_BOT.js",
            instances: 1,
            exec_mode: "cluster",
        },
        {
            name: "WHATSAPP_CONV_MESSAGE_SENT_BY_USER",
            script: "./scripts/WHATSAPP_CONV_MESSAGE_SENT_BY_USER.js",
            instances: 1,
            exec_mode: "cluster",
        },
        {
            name: "WHATSAPP_MESSAGE_MEASURES",
            script: "./scripts/WHATSAPP_MESSAGE_MEASURES.js",
            instances: 1,
            exec_mode: "cluster",
        },
    ],
};


// BOT_ATTRIBUTE_REPORT_SCRIPT.js
// MILESTONE_SCRIPT.js
// SAVE_WHATSAPP_FLOW_RESPONSES.js
// USER_DATA_UPDATE_SCRIPT.js
// WHATSAPP_CONV_LOG.js
// WHATSAPP_CONV_MESSAGE_SENT_BY_BOT.js
// WHATSAPP_CONV_MESSAGE_SENT_BY_USER.js
// WHATSAPP_MESSAGE_MEASURES.js