const amqp = require('amqplib');
const { ObjectId } = require('mongodb');
const { connect, model, Model, Schema, connection, disconnect } = require('mongoose');



async function mongoConnect() {

    const mongoUri = 'mongodb://localhost:27017/1spoc-staging';
    const mongoConnection = await connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
        console.log('connected to mongo db');
    }).catch((error) => {
        console.log(error);
    });

    return mongoConnection;

    
}

const mongoInstance = mongoConnect();
console.log(mongoInstance);


