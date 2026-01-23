import zlib from 'zlib';

export default class CompressDecompress {
    async compressPayload(stringData: string): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                // Compress the JSON string
                zlib.gzip(stringData, async (err: any, compressedData: Buffer) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(compressedData);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async deCompressPayload(decompressedBuffer: Buffer): Promise<String> {
        return new Promise(async (resolve, reject) => {
            try {
                if (!Buffer.isBuffer(decompressedBuffer)) {
                    decompressedBuffer = Buffer.from(decompressedBuffer);
                }

                zlib.gunzip(decompressedBuffer, async (err, decompressedBuffer) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(decompressedBuffer.toString());
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}
