import amqp from 'amqplib/callback_api.js';

const queue = 'UNIQUE_MESSAGE_IDS';

amqp.connect("amqp://localhost", (err, connection) => {
    if (err) return console.error("Connection Error:", err);

    connection.createChannel(async (err1, channel) => {
        if (err1) return console.error("Channel Error:", err1);

        channel.assertQueue(queue, { durable: false });

        console.log(` [*] Waiting for messages in ${queue}. To exit press CTRL+C`);

        let count = 0;
        for (let i = 0; i < 1000; i++) {
            await new Promise(resolve => setTimeout(resolve, 4000));


            for (let index = 0; index < 500; index++) {

                channel.prefetch(50);

                channel.consume(queue, (msg) => {

                    fetch('http://localhost:3333/console', { method: 'post', body: {name: "suraj"} }).then(() => {
                        console.log('api call sucess');
                    }).catch((err) => {
                        console.log('api error', err);
                    })

                    console.log("Received: ", count++, msg.content.toString());
                }, {
                    noAck: true,
                });

            }
            await new Promise(resolve => setTimeout(resolve, 4000));
        }
    });
});
