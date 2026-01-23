import amqp from 'amqplib/callback_api.js';

amqp.connect('amqp://localhost', function (error0, connection) {
    if (error0) {
        console.error("Connection Error:", error0);
        return;
    }
    connection.createChannel(async function (error1, channel) {
        if (error1) {
            console.error("Channel Error:", error1);
            return;
        }

        const queue = 'callback_api';
        channel.assertQueue(queue, { durable: false });

        console.time('STANDALON')

        let count = 1;
        for (let i = 0; i < 70; i++) {

            for (let index = 0; index < 500; index++) {
                const data = {
                    name: `${Math.random().toString(36)}`,
                    time: `${Math.random().toString(36)}`,
                    index: count++,
                }

                channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
                console.log(`Message pushed to queue `, count)
            }

            // await new Promise((res, rej) => setTimeout(res, 5000));
        }

        console.timeEnd('STANDALON', count)


        setTimeout(() => {
            connection.close();
            process.exit(0);
        }, 500);
    });
});


