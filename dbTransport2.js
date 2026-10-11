const { MongoClient } = require('mongodb');
const { config } = require('dotenv');
const { default: mongoose } = require('mongoose');
config({ path: `.env` });

const { TARGET_CONN_STRING, SOURCE_CONN_STRING } = process.env;

console.log({ TARGET_CONN_STRING, SOURCE_CONN_STRING });


const sourceUri = SOURCE_CONN_STRING;
const targetUri = TARGET_CONN_STRING;

const sourceDbName = '1-staging';
const targetDbName = 'clone-staging';

const collectionsToMigrate = [
    
];

function makeNewConnection(uri) {
    const db = mongoose.createConnection(uri);

    db.on('error', function (error) {
        console.log(`MongoDB :: connection ${this.name} ${JSON.stringify(error)}`);
        db.close().catch(() => console.log(`MongoDB :: failed to close connection ${this.name}`));
    });

    db.on('connected', function () {
        mongoose.set('debug', function (col, method, query, doc) {
            console.log(`MongoDB :: ${this.conn.name} ${col}.${method}(${JSON.stringify(query)},${JSON.stringify(doc)})`);
        });
        console.log(`MongoDB :: connected ${this.name}`);
    });

    db.on('disconnected', function () {
        console.log(`MongoDB :: disconnected ${this.name}`);
    });

    return db;
}

async function migrateCollections() {
    try {

        const sourceClient = makeNewConnection(SOURCE_CONN_STRING);

        const coll = await sourceClient.collection("Workflows");

        coll.find({ botId: "64c8d91f8d93df0033a66b2b" }, { limit: 5}).then((res)=>{
            console.log("res", res);
            
        })

        


        // const sourceDb = sourceClient.db("yourDbName");

        // const workflows = await sourceClient
        //     .collection("Workflows")

        //     .find({ botId: "64c8d91f8d93df0033a66b2b" })
        //     .toArray();

        // console.log("Found workflows:", workflows.length);





    } catch (error) {
        console.error('Migration failed:', error);
    } finally {

    }
}

migrateCollections();




// const userConnection = makeNewConnection('mongodb://127.0.0.1:27017/clone-staging');