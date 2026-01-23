
const express = require('express')
const port = 3300;
const app = express();

app.get("/non-blocking/", (req, res) => {
    res.status(200).send("This page is non-blocking");
})

app.get("/heavy", (req, res) => {

    const start =  Date.now();

    let total = 0;
    for (let i = 0; i < 20_000_000_000; i++) {
        total++;
    }
    const end =  Date.now();

    res.send(`The result of the CPU intensive task is ${total}\n, time : ${(end - start)/1000} seconds`);
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
    console.log(`worker pid = ${process.pid}`);

});
