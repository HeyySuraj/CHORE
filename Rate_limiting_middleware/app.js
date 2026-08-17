import express from 'express'
import { rateLimiter } from './rateLimeter.js';

const app = express();

const PORT = 3303;

app.set('trust proxy', true)
app.use(rateLimiter);

app.get("/", (re, res)=>{

    console.log("hello", re.ip);
    
    res.status(200).send("ok")
})

app.listen(PORT,()=>{
    console.log("app is runninv");
})