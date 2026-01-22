import amqp from 'amqplib/callback_api.js';

const queue = 'callback_api';

amqp.connect("amqp://localhost", (err, connection) => {
    if (err) return console.error("Connection Error:", err);

    connection.createChannel(async (err1, channel) => {
        if (err1) return console.error("Channel Error:", err1);

        channel.assertQueue(queue, { durable: false });

        console.log(` [*] Waiting for messages in ${queue}. To exit press CTRL+C`);

        console.time('FAST_CONSUMED');
        
        let count = 0;
        for (let i = 0; i < 1; i++) {

            for (let index = 0; index < 500; index++) {

                channel.prefetch(50);

                channel.consume(queue, (msg) => {
                    console.log("Received: ", count++, msg.content.toString());
                }, {
                    noAck: true,
                });

            }

            // await new Promise((res, rej) => {
            //     setTimeout(res, 4000)
            // })
        }

        console.timeLog('FAST_CONSUMED');


    });
});
