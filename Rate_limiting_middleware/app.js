import express from 'express'
import { rateLimiter } from './rateLimeter.js';

const app = express();

const PORT = 3303;

app.set('trust proxy', true)
app.use(rateLimiter);

// Curl Request to send ip address in headrs only if  app.set('trust proxy', true)
// curl -H "X-Forwarded-For: 192.168.1.100" http://localhost:3303/

app.get("/", (re, res) => {

    console.log("hello", re.ip);

    res.status(200).send("ok")
})

app.listen(PORT, () => {
    console.log("app is runninv");
})