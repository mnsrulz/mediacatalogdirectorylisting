const request = require("request");
import path from "path";
import unzipper from "unzipper";

export class ZipService {
    async getZipStream(zipFileUrl: string) {
        return await unzipper.Open.url(request, zipFileUrl);
    }

    async listFiles(zipFileUrl: string) {
        console.log('list files', zipFileUrl);
        try {
            const directory = await this.getZipStream(zipFileUrl);
            console.log('directory awaited finishes');
            const allFiles = directory.files
                .filter((x) => x.type == "File")
                .map(({ path, lastModifiedDate, lastModifiedTime, compressedSize, compressionMethod, uncompressedSize, crc32 }) => ({
                    path, lastModifiedDate, lastModifiedTime, compressedSize, compressionMethod, uncompressedSize, crc32
                }));
            return allFiles;
        } catch (error) {
            console.log(error.message);
            return [];
        }
    }

    async getSingleFileStream(zipFileUrl: string, fileName: string) {
        const directory = await this.getZipStream(zipFileUrl);
        const requestedFileStream = directory.files
            .filter((x) => x.type == "File" && path.basename(x.path) === fileName)
            .pop();
        return requestedFileStream?.stream();
    }
}