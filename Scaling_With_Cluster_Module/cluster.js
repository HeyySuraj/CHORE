import cluster from "cluster";
import os from "os";
import { dirname } from "path";
import { fileURLToPath } from "url";


// YOUTUBE LINK (https://www.youtube.com/watch?v=6lHvks6R6cI)

const __dirname = dirname(fileURLToPath(import.meta.url));

const cpuCount = os.cpus().length;

console.log(`The total number of CPUs is ===> `, cpuCount);
console.log(`Primary pid=${process.pid}`);
cluster.setupPrimary({
    exec: __dirname + "/index.js",
});


// This for loop will spawn the instance of server as per the numbers of cpus
for (let i = 0; i < cpuCount; i++) {
    cluster.fork(); // to initialise or start the new server instance (spawning diff instances )
}


// And if one the instance id down/crashed it will auto start the another instance
cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} has been killed`);
    console.log("Starting another worker");
    cluster.fork();
});