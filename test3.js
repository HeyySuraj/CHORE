// qr_ticket_generator_v4.js
// Requires: npm install qrcode

const QRCode = require('qrcode');

function generateQR(base64String, outputFile = 'ticket3_qr.png') {
    try {
        // Step 1: Decode Base64 -> raw bytes (Buffer)
        const buffer = Buffer.from(base64String, 'base64');

        // Step 2: Validate length (must be 32 bytes)
        if (buffer.length !== 32) {
            throw new Error(`Invalid length: ${ buffer.length } bytes(expected 32)`);
        }

        // Step 3: Generate QR Code (Version 4, ECC Q) with raw bytes
        QRCode.toFile(
            outputFile,
            [{ data: buffer, mode: 'byte' }], // <-- feed raw bytes directly
            {
                version: 3,
                errorCorrectionLevel: 'Q',
            },
            function (err) {
                if (err) throw err;
                console.log(`✅ QR generated successfully and saved as ${ outputFile }`);
                console.log(`Decoded data length: ${ buffer.length } bytes`);
                console.log(`Hex dump of payload: ${ buffer.toString('hex') }`);
            }
        );
    } catch (err) {
        console.error(`❌ Error: ${ err.message }`);
    }
}

// Example usage from CLI
// if (process.argv.length < 3) {
//     console.log("Usage: node qr_ticket_generator_v4.js <Base64_String>");
// } else {
// }
// const base64Input = "0HfOHj058iHELvHpZ5/u2izA/NYYSMXbsmSfAhdYQDs=";
const base64Input = "ARGs8IPrcFZY98VG6RWL+i8eObn7BTIaG/Qt7HZ6IpY=";
generateQR(base64Input);