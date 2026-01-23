const { config } = require('dotenv');
const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();

        const db = client.db('1spoc-staging');
        const collection = db.collection('orgintegrations');

        const filter = { integration_id: "6367b5ce705688434cbda563" };
        const workflows = await collection
            .find(filter).toArray();

        for (let index = 0; index < workflows.length; index++) {
            const element = workflows[index];

            if (Math.floor(Math.random() * 10) % 12 < 5) {

                delete element.config.voiceBotConfiguration;
            }

            const res = await collection
                .findOneAndUpdate({ _id: new ObjectId(element._id) }, {
                    $set: {
                        config: {
                            ...element.config,
                        }
                    }
                });



            console.log("done", index + 1);

        }


    } catch (err) {
        console.error("Error:", err);
    } finally {
        console.log("dsda");

        // await client.close();  // always close connection
    }
}

run();
