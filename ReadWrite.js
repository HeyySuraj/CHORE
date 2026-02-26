const fs = require('fs');
const path = require('path');


function readFileAsync() {
    console.log("reading Asynchrouns");

    fs.readFile("data.txt", "utf-8", (err, data) => {
        if (err) console.log("Error", err);

        console.log("File Content", data);
    })
}

function readFileSync() {
    console.log("Synchrnous");
    try {
        const data = fs.readFileSync("data.txt", 'utf8');
        console.log("FIle COntent", data);
    } catch (error) {
        console.log("error", error);
    }
}


function writeFile() {
    const contentToWrite = "\nHow are you??\n";
    fs.appendFile("data.txt", contentToWrite, (err) => {
        if (err) console.log("Error while writing", err);
        console.log("Write file Succees ");
    });
}

function makeDirectory() {
    fs.mkdir("logs", { recursive: true}, (err) => {
        if (err) {
            console.log("erro", err);
        }
        console.log("Directory Created");
    });

    fs.appendFile("logs/info.log", "USer craeted succesfully" , (err) => {
        if(err) {
            console.log("Error while creating log file", err);
        } 
        console.log("Log file created");
    });

}

const { exec } = require('child_process');

const varOcg = 'dir /b'; // dir for window ls for linux unix  

exec(varOcg, (err, stdout) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  const result = stdout;
  let str = result.replaceAll("\r\n", ", ")
  console.log(str); 
});