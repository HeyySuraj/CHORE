import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import fetch from "node-fetch";
import os from "os";



//#region ------------------------- High-level flow -------------------------------------------
/*
START
  │
  ▼
Main Thread starts
  │
  ▼
runAll() called
  │
  ▼
Create initial workers (up to maxThreads)
  │
  ▼
Each worker processes a URL
  │
  ▼
Worker sends result back
  │
  ▼
Main thread schedules next job
  │
  ▼
Repeat until all URLs done
  │
  ▼
Print total time + results
  │
  ▼
END
*/
//#end-------------------------------






const imageUrls = [
  "https://picsum.photos/200/300",
  "https://picsum.photos/300/300",
//   "https://picsum.photos/400/300",
//   "https://picsum.photos/500/300",
//   "https://picsum.photos/600/300",
//   "https://picsum.photos/700/300",
//   "https://picsum.photos/800/300",
//   "https://picsum.photos/900/300",
//   "https://picsum.photos/1000/300",
//   "https://picsum.photos/1100/300",
];

// Worker code (executed when not in main thread)
if (!isMainThread) {
  const { url } = workerData;
  const run = async () => {
    try {
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      const base64 = buf.toString("base64");
      parentPort.postMessage({ ok: true, url, base64 });
    } catch (err) {
      parentPort.postMessage({ ok: false, url, error: err.message });
    }
  };
  run();
//   return;
}

// 🧠 Main thread

const maxThreads = Math.min(4, os.cpus().length); // limit threads
let index = 0;
let active = 0;
const results = [];


function runWorker(url) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { url } });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

async function scheduleNext() {
  if (index >= imageUrls.length) return;
  const url = imageUrls[index++];
  active++;
  
  const start = Date.now();
  console.log('ACTIVE THREAD : ', {active, startTime: new Date().toLocaleTimeString()});
  try {
    const res = await runWorker(url);
    const ms = Date.now() - start;
    if (res.ok)
      console.log(`✅ [${url}] converted in ${ms}ms, base64 length=${res.base64.length}`);
    else
      console.error(`❌ [${url}] failed: ${res.error}`);
    results.push(res);
  } finally {
    active--;
    scheduleNext(); // schedule next task
  }
}

async function runAll() {
  console.time("Total");
  // Start up to maxThreads concurrently
  for (let i = 0; i < maxThreads; i++) {
      console.log('THREAD COUNT : ', i);
      scheduleNext();
    }

  // Wait until all are done
  while (results.length < imageUrls.length) {
    await new Promise(r => setTimeout(r, 100));
  }

  console.timeEnd("Total");
  console.log(`\nDone: ${results.filter(r => r.ok).length}/${imageUrls.length} successful`);
}

runAll();
