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


const uploadDocumentsData = [
    {
        name: 'PASSPHOTO',
        "max-file-size-kb": 20,
        "allowed-mime-types": [
            "image/jpeg"
        ]
    },
    {
        name: 'SIGNATURE',
        "max-file-size-kb": 20,
        "allowed-mime-types": [
            "image/jpeg"
        ]
    },
    {
        name: 'Address_Proof',
        "max-file-size-kb": 20,
        "allowed-mime-types": [
            "image/jpeg"
        ]
    },
    {
        name: 'Identity_Proof',
        "max-file-size-kb": 20,
        "allowed-mime-types": [
            "image/jpeg"
        ]
    },

]

const uploadDocumentsNameList = uploadDocumentsData.map((ele) => ele.name);

const documentMapping = {}

for (let index = 0; index < uploadDocumentsNameList.length - 1; index++) {
    documentMapping[uploadDocumentsNameList[index]] = uploadDocumentsNameList[index + 1];
}

console.log("documentMapping", documentMapping);


// TODO:  Create Variable
// 1. Output Variable  
// 2. Document Picker Label
// 3. Document Picker Discription
// 4. Document Picker Visible
// 5. Embedded Link Label 
// 6. "onClickAction" name
// 7. All output variables of Upload screen
// 8. Footer Button Name 
// 9. Footer Button Enable


const generateOutputVariableFormat = (documentNameArray) => {
    const outputVariablesObject = {}
    for (const element of documentNameArray) {
        const keyFormat = `O${element.name}`;
        outputVariablesObject[keyFormat] = "${form." + keyFormat + "}";
    }

    return outputVariablesObject;
}

const generateCases = (uploadDocumentsArray) => {

    const outputVariablesObject = generateOutputVariableFormat(uploadDocumentsArray);

    const casesToPush = {};

    for (const element of uploadDocumentsArray) {
        casesToPush[element.name] = [
            {
                "type": "DocumentPicker",
                "name": `O${element.name}`,
                "label": "${data.LabelDP_" + element.name + "}",
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

const craeteDataVariables = (uploadDocumentsArray) => {

    const variableDataObject = {};

    for (const element of uploadDocumentsArray) {

        const key = `LabelDP_${element.name}`

        variableDataObject[key] = {
            "type": "string",
            "__example__": `Upload ${element.name}`
        }
    }

    return variableDataObject;

}


const screenPayload = {
    "data": {
        "LabelDocumentTextHeading": {
            "type": "string",
            "__example__": "Upload Photograph"
        },
        "InstructionMarkdown": {
            "type": "array",
            "items": {
                "type": "string"
            },
            "__example__": [
                "**Instructions for issued Photo:**",
                "+ The size of photograph should fall between 5KB to 20KB",
                "+ Photograph format should be JPEG",
                "+ The width of the photograph should be 160 pixels",
                "+ The height of photograph should fall between 200 to 212 pixels"
            ]
        },
        "VisibleInstructionMarkdown": {
            "type": "boolean",
            "__example__": false
        },
        "SWITCH_TO": {
            "type": "string",
            "__example__": "PASSPHOTO"
        },
        "LabelFooter": {
            "type": "string",
            "__example__": "Submit"
        },
        "EnableUpdateDocumentFooter": {
            "type": "boolean",
            "__example__": false
        },
        "DescriptionDocumentPicker": {
            "type": "string",
            "__example__": "Please read all the instruction before uploading the document"
        },
        "LabelEmbeddedLink": {
            "type": "string",
            "__example__": "Please read all the instruction before uploading the document"
        },
        ...craeteDataVariables(uploadDocumentsData)

    },
    "id": "UPLOAD_DOCUMENTS",
    "title": "Upload Documents",
    "layout": {
        "type": "SingleColumnLayout",
        "children": [
            {
                "type": "Form",
                "name": "form",
                "children": [
                    {
                        "text": "${data.LabelDocumentTextHeading}",
                        "type": "TextHeading"
                    },
                    {
                        "type": "TextBody",
                        "markdown": true,
                        "visible": "${data.VisibleInstructionMarkdown}",
                        "text": "${data.InstructionMarkdown}"
                    },
                    {
                        "type": "Switch",
                        "value": "${data.SWITCH_TO}",
                        "cases": generateCases(uploadDocumentsData)
                    },
                    {
                        "on-click-action": {
                            "name": "complete",
                            "payload": generateOutputVariableFormat(uploadDocumentsData)
                        },
                        "label": "${data.LabelFooter}",
                        "enabled": "${data.EnableUpdateDocumentFooter}",
                        "type": "Footer"
                    }
                ]
            }
        ]
    },
    "terminal": true
}

writeInFile(screenPayload, "Upload_Screen.json")
