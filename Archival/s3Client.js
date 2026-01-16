import { CreateBucketCommand, GetObjectCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
const s3Client = new S3Client({
    region: "ap-northeast-1",
    credentials: {
        accessKeyId: "ACCESS_KEY",
        secretAccessKey: "SECRET_KEY",
    }
});


const checkBucketExists = async bucket => {
    const options = {
        Bucket: bucket,
    };
    try {
        await s3Client.send(new HeadBucketCommand(options));
        return true;
    } catch (error) {
        console.log("ERROR IN checkBucketExists");

        if (error && error.statusCode === 404) {
            return false;
        }
        // throw error;
    }
};

export async function uploadFile(collectionName, filePath) {

    try {

        const fileStream = fs.createReadStream(filePath);

        const uploadParams = {
            Bucket: "1spoc-monthly-archive-db-collection",
            Key: `${collectionName}/File_Name`,
            Body: fileStream,
            ContentType: "application/zip"
        }

        const bucketExists = checkBucketExists(uploadParams.Bucket);

        if (!bucketExists) {
            await s3Client.send(new CreateBucketCommand({ Bucket: uploadParams.Bucket }));
        }

        const uplaod = new Upload({
            client: s3Client,
            params: uploadParams,
        })

        uplaod.done();

        // Create the presigned URL.
        const signedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket: uploadParams.Bucket,
                Key: uploadParams.Key,
            }),
            { expiresIn: Number(604800) },
        );
        // console.log("signedUrl", signedUrl);
        return signedUrl;

    } catch (error) {
        console.log("Error In Uplaod File", error);
    }

}


// await uploadFile("users", "./ZIPPED_FILES/2023_08_users.zip");