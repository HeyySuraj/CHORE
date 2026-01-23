const express = require('express');
const fs = require('fs')

const app = express();

const PORT = 3333;

app.use(express.json());



app.all('/console', async (req, res) => {

    try {

        console.log('-------------------', new Date().toLocaleString(), '------------------------------');
        console.log('METHOD:', req.method);
        console.log('Query:', req.query);

        if (req.body.extraDetails) {

            console.log('extra:', JSON.parse(req.body?.extraDetails));
        }
        console.log('Body:', req.body);
        await new Promise((res) => setTimeout(res, 1500));


        // const newData = req.body;
        writeInFile(req.body, "INcome.json");
        res.json({ message: 'Data received successfully!', receivedData: req.body });
    } catch (error) {
        console.log({ error });

    }



});
app.listen(PORT, () => {
    console.log(`Server is running and listening on port ${PORT}`);
});


{ appname = "AP-1SPOC", detected_level = "error", level = "error", service_name = "AP-WhatsApp-Consumer" }


const writeInFile = (dataToWrite, fileName = 'requestPayload.json') => {
    fs.readFile(fileName, (err, data) => {
        let jsonArray = [];

        if (!err) {
            try {
                jsonArray = JSON.parse(data); // Read existing JSON file
                if (!Array.isArray(jsonArray)) jsonArray = [];
            } catch (parseErr) {
                jsonArray = [];
            }
        }

        jsonArray.push(dataToWrite);

        fs.writeFile(fileName, JSON.stringify(jsonArray, null, 2), (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return res.status(500).json({ message: 'Error saving data!' });
            }
        });

    });
}