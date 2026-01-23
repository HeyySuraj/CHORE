const express = require("express");
const { Worker } = require("worker_threads");

const app = express();
const port = 3300;

const THREADS_COUNT = 4;
// yt link (https://www.youtube.com/watch?v=MuwJJrfIfsU )

function createWorkers() {

    return new Promise((resolve, reject) => {

        const worker = new Worker('./worker.js', {
            workerData: {
                threadsCount: THREADS_COUNT
            }
        })

        worker.on("message", (data) => {
            resolve(data);
        });
        worker.on("error", (err) => {
            reject(`An errro occured ${err}`);
        });

    })

}

app.get("/non-blocking/", (req, res) => {
    res.status(200).send("This page is non-blocking");
})

app.get("/blocking", async (req, res) => {


    const start = Date.now();

    const promises = [];
    for (let index = 0; index < THREADS_COUNT; index++) {
        promises.push(createWorkers())
    }

    const threadsResult = await Promise.all(promises);

    let total = threadsResult.reduce((sum, ele) => sum + ele, 0);

    const end = Date.now();


    res.status(200).send(`Result is ${total}, time : ${(end - start) / 1000} seconds`)
})

app.listen(port, () => {
    console.log("MULTITHREDING APP RUNNING ON ==>", port);
})