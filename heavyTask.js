
const express = require('express')
const port = 3300;
const app = express();

app.get("/heavy", (req, res) => {
    console.time("REQUEST", "start")
    let total = 0;
    for (let i = 0; i < 509_000_000; i++) {
        total++;
    }
    console.timeEnd("REQUEST", "end")

    res.send(`The result of the CPU intensive task is ${total}\n`);
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
    console.log(`worker pid = ${process.pid}`);

});
