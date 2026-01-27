const { MongoClient } = require('mongodb');
const { config } = require('dotenv');
const { default: mongoose, Schema, model } = require('mongoose');
config({ path: `.env` });

const { TARGET_CONN_STRING, SOURCE_CONN_STRING, ORG_ID } = process.env;

console.log({ TARGET_CONN_STRING, SOURCE_CONN_STRING });


// const sourceUri = TARGET_CONN_STRING;
// const targetUri = SOURCE_CONN_STRING;

const sourceDbName = '-staging';
const targetDbName = 'clone-staging';

const collectionsToMigrate = []

async function makeNewConnection(uri) {
    const mongoClient = new MongoClient(uri, {
        // Options for auto-reconnection
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
    });

    const db = await mongoClient.connect({ monitorCommands: true }).catch((err) => {
        console.log(`DB ERROR ---- ${uri}`);
        console.log(err);
        setTimeout(async () => await makeNewConnection(uri), 1000);
    }).then((client) => {
        console.log(uri);
        console.log('DB CONNECTED : ', uri);
        console.log('------------------------------------------------=========================================-------------------------------------');
        return client;
    });

    db.on('error', function (error) {
        console.log(`MongoDB :: connection ${this.name} ${JSON.stringify(error)}`);
        db.close().catch(() => console.log(`MongoDB :: failed to close connection ${this.name}`));
        setTimeout(async () => await makeNewConnection(uri), 1000);
    });

    db.on('connected', function () {
        console.log(`MongoDB :: connected ${this.name}`);
    });

    db.on('disconnected', function () {
        console.log(`MongoDB :: disconnected ${this.name}`);
    });

    return db;
}

// async function migrateCollections() {

//     let sourceClient = await makeNewConnection(SOURCE_CONN_STRING);
//     let targetClient = await makeNewConnection(TARGET_CONN_STRING);

//     try {

//         const sourceDb = sourceClient.db(sourceDbName);
//         const targetDb = targetClient.db(targetDbName);

//         for (const collectionName of collectionsToMigrate) {

//             console.log(`------------------------------------------ Processing started for collection : ${collectionName}   ---------------------------------------` );


//             const sourceCollection = sourceDb.collection(collectionName);
//             const targetCollection = targetDb.collection(collectionName);

//             const filter = { org_id: `${ORG_ID}` }
//             const documents = await sourceCollection.find(filter).toArray();

//             if (documents.length > 0) {
//                 // console.log({ documents });

//                 for (const document of documents) {
//                     const isExist = await targetCollection.findOne({ _id: document._id });
//                     if (isExist) {
//                         try {

//                             await targetCollection.findOneAndUpdate({ _id: document._id }, { '$set': document });
//                             console.log(`Updated document with Id ${document._id}`);
//                         } catch (error) {
//                             console.log('Update query failed');
//                             console.log(error);
//                         }

//                     } else {
//                         await targetCollection.insertOne({ _id: document._id }, document);
//                         console.log(`New document created. Old Object Id : ${document._id}`);
//                     }
//                 }

//             } else {
//                 console.log(`No documents found in '${collectionName}'`);
//             }
//         }

//     } catch (error) {
//         console.error('Migration failed:', error);
//     } finally {
//         // await targetClient.close();
//         // await sourceClient.close();

//         if (sourceClient.topology?.isConnected()) {
//             console.log("Source is still connected.");
//         } else {
//             console.log("Source is disconnected. Reconnecting in 1 second...");
//             setTimeout(async () => await makeNewConnection(SOURCE_CONN_STRING), 1000);
//         }

//         if (targetClient.topology?.isConnected()) {
//             console.log("Target is still connected.");
//         } else {
//             console.log("Target is disconnected. Reconnecting in 1 second...");
//             setTimeout(async () => await makeNewConnection(TARGET_CONN_STRING), 1000);
//         }
//     }
// }

const createNewCollection = ()=>{
    
}


mongoose.connect(TARGET_CONN_STRING)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.error(err));


// Mongoose schema for DepartmentEntity
const DepartmentSchema = new Schema(
    {
        id: { type: String, required: false },
        title: { type: String, required: false },
        departmentId: { type: String, required: false },
        categoryId: { type: String, required: false },
        description: { type: String, required: false },
        index: { type: Number, required: false },
    },
    {
        timestamps: false, // Automatically add createdAt and updatedAt fields
        strict: false, // Only fields defined in the schema will be saved
        collection: 'SURAJ_DepartmentSchema', // Collection name
    },
);


const collection = model("SURAJ_DepartmentSchema", DepartmentSchema);

const uniqueId = () => {return Math.random().toString(36)}


const delay = ()=> new Promise((res, rej)=> setTimeout(res, 1000));
const runner = async () => {

    const data = await collection.find({}).lean()
    for (let index = 0; index < data.length; index++) {
        const doc = data[index];
        
        await delay();

        const res = await collection.findOneAndUpdate({_id: doc._id}, {
            Name: `Suraj_${uniqueId()}`,
            School: `HIGHSCHOOL_${uniqueId()}`,
            City: `BRAMHAPURI_${uniqueId()}`,
            HOBBY: `CRICKET_${uniqueId()}`,
        },{ new: true}).lean()

        console.log("updarte successfully", index + 1, res);
    }
}

runner();
