const fs = require("fs"); 
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

const uploadDocumentsName = [
    {
        name: 'PASSPHOTO',
        "max-file-size-kb": 100,
        "allowed-mime-types": [
            "application/pdf"
        ]
    },
    {
        name: 'SIGNATURE',
        "max-file-size-kb": 100,
        "allowed-mime-types": [
            "application/pdf"
        ]
    },
    {
        name: 'SEM_FIRST',
        "max-file-size-kb": 100,
        "allowed-mime-types": [
            "application/pdf"
        ]
    },
    {
        name: 'SEM_SECOND',
        "max-file-size-kb": 100,
        "allowed-mime-types": [
            "application/pdf"
        ]
    }
]

const generateOutputVariableFormat = (documentNameArray) =>{
    const outputVariablesObject = {}
    for (const element of documentNameArray) {
        const keyFormat = `O${element.name}`;
        outputVariablesObject[keyFormat] = "${data." + keyFormat + "}";
    }

    return outputVariablesObject;
}

const generateCases = (uploadDocumentsArray) => {

    const outputVariablesObject = generateOutputVariableFormat(uploadDocumentsName);

    const casesToPush = {};

    for (const element of uploadDocumentsArray) {
        casesToPush[element.name] = [
            {
                "type": "DocumentPicker",
                "name": `O${element.name}`,
                "label": "${data.LabelDP" + element.name + "}",
                "min-uploaded-documents": 1,
                "max-uploaded-documents": 1,
                "description": "${data.DescriptionDocumentPicker}",
                "max-file-size-kb": element['max-file-size-kb'],
                "allowed-mime-types": element['allowed-mime-types'],
            },
            {
                "type": "EmbeddedLink",
                "text": "${data.LabelEmbeddedLink}",
                "on-click-action": {
                    "name": "data_exchange",
                    "payload": {
                        ...outputVariablesObject,
                        "onClickUpload": element.name,
                    }
                }
            }
        ]
    }

    casesToPush["default"] = [
        {
            "type": "TextHeading",
            "text": "All Document Uploaded Successfully!"
        }
    ]
    return casesToPush;

}

writeInFile(generateCases(uploadDocumentsName), 'CASES_PAYLOAD.json');

