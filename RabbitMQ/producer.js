import SingleTon from "./SingleTon.js";

let count = 1;

console.time('SINGLETON')
for (let i = 0; i < 70; i++) {

    for (let index = 0; index < 500; index++) {
        const data = {
            name: `${Math.random().toString(36)}`,
            time: `${Math.random().toString(36)}`,
            index: count++,
        }

        await SingleTon.produceMessage('UNIQUE_MESSAGE_IDS', data)
        console.log('message produced', count);
    }

    // console.log("NOW WAITING FOR 5 SECONDS");
    // await new Promise((res, rej) => setTimeout(res, 5000));
}
console.timeEnd('SINGLETON')
await SingleTon.close();


