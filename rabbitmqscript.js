const amqp = require('amqplib');
const { ObjectId } = require('mongodb');
const { connect, model, Model, Schema, connection, disconnect, default: mongoose } = require('mongoose');

const botSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        org_id: String,
        icon: String,
        type: String,
        status: String,
        location: String,
        timezone: String,
        language: String,
        platform: String,
        channels: Array,
        description: String,
        template_id: String,
        live: Boolean,
        go_live_date: Number,
        created_by_id: String,
        deployedVersion: String,
        // versions: {
        //     type: [versionSchema],
        //     required: false,
        // },
        // locales: {
        //     type: [localesSchema],
        //     required: false,
        // },
    },
    { timestamps: true },
);



async function rabbitConnection() {
    try {

        // create connection with rabbit mq with connection string 
        const connection = await amqp.connect('amqp://localhost');
        console.log('Connecting with RabbitMq...');

        // create channel 
        const channel = await connection.createChannel();
        const queueName = 'Intra_Message_Queue';

        const people = Array.from({ length: 100 }, (_, i) => ({
            name: `Person ${i + 1}`,
            email: `person${i + 1}@example.com`,
        }));

        // create queue through channel 
        await channel.assertQueue(queueName, { durable: false });

        // send message in queue in buffer from

        people.map((element, index) => {
            channel.sendToQueue(queueName, Buffer.from(JSON.stringify(element)));
            console.log(` [${index}] Sent %s`, element);
        })

        // consume messages from queue 
        channel.consume(queueName, message => {
            console.log('consume', JSON.parse(message.content));
            channel.ack(message);
        })

        setTimeout(() => {
            connection.close();
            console.log('Connection CLosed');
        }, 500);

    } catch (error) {
        console.log(error);

    }
}



async function runner() {
    try {

        // create connection with rabbit mq with connection string 
        // const mqConnection = await amqp.connect('amqp://localhost');
        // console.log('Connecting with RabbitMq...');

        // // create channel 
        // const channel = await mqConnection.createChannel();
        // const queueName = 'Intra_Message_Queue';

        // mongo connection 


        const db1 = mongoose.createConnection('mongodb://localhost:27017/1spoc-staging');

        const requiredCollections = ['bots', 'botversions', 'botExecutorPayload', 'botchannels', 'Processes', 'ProcessVersions', 'ProcessAccessControl', 'ProcessAuthTokens', 'processExecutorPayload'];

        for (let index = 0; index < requiredCollections.length; index++) {
            const collectionName = requiredCollections[index];

            const collection = db1.collection(collectionName);
            const result = await collection.find({
                org_id: "64be727fe75a840033e3e0a3",
            });

            console.log(`documents found for collection ${collectionName}`, result);
            console.dir(result, { depth: null });
        }


        // const httpTriggerCollection = db.collection('HttpTriggers');
        // const allDocuments = await httpTriggerCollection.find().toArray();

        // console.log({ allDocuments });

        // create queue through channel 
        // await channel.assertQueue(queueName, { durable: false });

        // send message in queue in buffer from
        // allDocuments.map((element, index) => {
        //     channel.sendToQueue(queueName, Buffer.from(JSON.stringify(element)));
        //     console.log(` [${index}] Sent %s`, element);
        // })

        // consume messages from queue 
        // channel.consume(queueName, message => {
        //     console.log('consume', JSON.parse(message.content));
        //     channel.ack(message);
        // })

        // setTimeout(() => {
        //     mqConnection.close();
        //     console.log('mq Connection CLosed');
        //     disconnect();
        //     console.log('mdb disconnected');

        // }, 500);

    } catch (error) {
        console.log(error);

    }
}

runner();
