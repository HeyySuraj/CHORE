import { workerData, parentPort } from 'worker_threads';


let counter = 0;

for (let index = 0; index < 20_000_000_000 / workerData.threadsCount; index++) {
    counter++;
}

parentPort.postMessage(counter);