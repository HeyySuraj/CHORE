import fs from "fs";                 // streams
import fsPromises from "fs/promises"; // async/await fs
import path from "path";
import archiver from "archiver";
import unzipper from "unzipper";



/**
 * Ensures a directory exists (idempotent).
 * Safe to call multiple times.
 */
export async function makeDirectory(dirPath) {
    if (!dirPath) {
        throw new Error("dirPath is required");
    }

    const resolvedPath = path.resolve(dirPath);

    try {
        await fsPromises.mkdir(resolvedPath, { recursive: true });
        return resolvedPath;
    } catch (err) {
        console.log(`Error while creating new dir `, err.message);
        
        throw new Error(`Failed to create directory ${resolvedPath}: ${err.message}`);
    }
}

export async function zipFolder(sourceDir, outZipPath) {
    // create ONLY the parent directory
    // const zipDir = path.dirname(outZipPath);
    // await fsPromises.mkdir(zipDir, { recursive: true });

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outZipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
            console.log(`ZIP created: ${archive.pointer()} bytes, FILE PATH: `, outZipPath);
            resolve(outZipPath);
        });

        output.on("error", reject);
        archive.on("error", reject);

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}


export function unzipFile(zipPath, outputDir) {
    return new Promise((resolve, reject) => {
        // ensure output directory exists
        fs.mkdirSync(outputDir, { recursive: true });

        fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: outputDir }))
            .on("close", () => {
                console.log("Unzip completed");
                resolve();
            })
            .on("error", reject);
    });
}


async function unzipAllZips(zipDir, extractBaseDir) {
    const files = await fsPromises.readdir(zipDir);

    const zipFiles = files.filter(file => file.endsWith(".zip"));

    for (const zipFile of zipFiles) {
        const zipPath = path.join(zipDir, zipFile);

        // create a folder per zip (recommended)
        const extractTo = path.join(
            extractBaseDir,
            path.parse(zipFile).name
        );

        await fsPromises.mkdir(extractTo, { recursive: true });

        console.log(`Unzipping: ${zipFile}`);
        await unzipFile(zipPath, extractTo);
    }

    console.log("All ZIP files extracted successfully");
}

// (async () => {
    

//     console.log("Script started");

//     const dirName = "ZIPPED_FILES";

//     await unzipAllZips(path.resolve(dirName), "UNZIPPED_FILES")


// })();




