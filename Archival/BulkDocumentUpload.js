const rislBulkUpload = async (request: Request, response: Response, next: NextFunction) => {
    const TAG = "RISL_BULK_UPLOAD";
    try {
        const body: IBulkUploadPayload = request.body;


        const sanitizedBody = { ...body };
        delete sanitizedBody.bearerToken;
        logger.info(
            JSON.stringify({
                description: "Risl Bulk upload started",
                requestPayload: sanitizedBody,
                RISL_BULK_UPLOAD_PLIMIT,
                TAG,
            })
        );

        //  concurrency limit (change based on load)
        const bulkUploadplimit = RISL_BULK_UPLOAD_PLIMIT ? Number(RISL_BULK_UPLOAD_PLIMIT) : 3;
        const limit = pLimit(bulkUploadplimit);

        const results = await Promise.all(
            body.documentsArray.map((doc) =>
                limit(async () => {
                    try {

                        // download file as stream
                        const fileRes = await axios.get(doc.fileUrl, {
                            responseType: "stream",
                            timeout: 30000,
                        });

                        //  create multipart form
                        const form = new FormData();
                        form.append("file", fileRes.data, {
                            filename: `file_${doc.index}.pdf`,
                            contentType: fileRes.headers["content-type"],
                        });

                        // upload file
                        const uploadTimeStart = process.hrtime.bigint();
                        const uploadRes = await axios.post(body.uploadUrl, form, {
                            headers: {
                                Authorization: `Bearer ${body.bearerToken}`,
                                ...form.getHeaders(),
                            },
                            maxBodyLength: Infinity,
                            timeout: 60000,
                        });
                        const uploadTimeEnd = process.hrtime.bigint();
                        const durationMs = Number(uploadTimeEnd - uploadTimeStart) / 1e6;
                        logger.info(JSON.stringify({
                            description: `Time taken to upload a document ${durationMs} MS`,
                            timeTaken: `${durationMs.toFixed(2)} MS`,
                            TAG,
                        }));

                        return {
                            index: doc.index,
                            success: true,
                            data: uploadRes.data,
                        };
                    } catch (err: any) {
                        logger.info(
                            JSON.stringify({
                                description: "Individual upload failed",
                                itemPayload: doc,
                                error: err.message,
                                TAG,
                            })
                        );

                        return {
                            index: doc.index,
                            success: false,
                            error: err.message,
                            // errorResponseData: err.response.data,
                        };
                    }
                })
            )
        );

        logger.info(
            JSON.stringify({
                description: "Risl Bulk upload completed",
                successCount: results.filter((r) => r.success).length,
                TAG,
            })
        );

        return response.status(200).json({
            success: true,
            total: body.documentsArray.length,
            results,
        });
    } catch (error: any) {
        logger.error(
            JSON.stringify({
                description: "Risl Bulk upload failed",
                errorMessage: error.message,
                TAG,
            })
        );
        next(error);
    }
};