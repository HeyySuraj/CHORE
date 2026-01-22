import amqp from 'amqplib';

class RabbitMq {
    connection = null;
    channel = null;

    constructor() {
        if (RabbitMq.instance) {
            RabbitMq.instance;
        }
        RabbitMq.instance = this;
    }

    static getInstance() {
        if (!RabbitMq.instance) {
            RabbitMq.instance = new RabbitMq();
        }
        return RabbitMq.instance;
    }

    // example method 
    async getConnection() {
        // const connection = await amqp.connect("amqp://localhost");
        try {
            if (!this.connection) {
                this.connection = await amqp.connect("amqp://localhost");

                console.log("🐇 RabbitMQ connected");
            }
            return this.connection;
        } catch (err) {
            console.error("❌ Failed to connect RabbitMQ", err.message);
            setTimeout(async () => await this.getConnection(), 5000); // retry delay
        }
    }

    async getChannel() {
        // const channel = await connection.createChannel();
        if (!this.channel) {
            const connection = await this.getConnection();
            this.channel = await connection.createChannel();
        }
        return this.channel;
    };

    // message must be string
    async produceMessage(queue, message) {
        const channel = await this.getChannel();

        if (!channel.assertQueue) {
            await channel.assertQueue(queue);
        }
        await channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { durable: false });
    }

    async consumeMessage(queue, callback) {
        const channel = this.getChannel();
        await channel.assertQueue(queue);
        await channel.consume(queue, (msg) => {
            callback(msg);
            channel.ack(msg);
        })
    };

    async close() {
        if (this.connection) {
            await this.connection.close();
            console.log("🛑 RabbitMQ closed");
        }
    }
}

export default new RabbitMq();


// const connection = await amqp.connect("amqp://localhost");
// const channel = await connection.createChannel();

// await channel.assertQueue(queue);
// await channel.sendToQueue(queue, Buffer.from(JSON.stringify({
//     Name: "Suraj",
//     id: "GALICTICOS"
// })))

