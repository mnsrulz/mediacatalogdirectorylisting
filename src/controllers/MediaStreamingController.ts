import * as mongoose from 'mongoose';
import { LinksCacheSchema } from '../models/mediaModel';
import { Request, Response } from 'express';
import { ContentStreamerService } from '../services/ContentStreamerService';
import logger from "./../services/Logger";
import stream from 'stream';
import { promisify } from 'util';
const pipeline = promisify(stream.pipeline);

const LinksCacheList = mongoose.model('LinksCache', LinksCacheSchema);
const contentStreamerService = new ContentStreamerService();

export class MediaStreamingController {
    public async getMediaContent(req: Request, res: Response) {
        try {
            const filename: string = req.params.filename || "";
            const documentId = filename.substr(filename.lastIndexOf("-") + 1).trim().split('.')[0];

            let streamResult;
            if (documentId.startsWith('S')) {
                const medianame: string = req.params.medianame || "";
                const imdbId = medianame.substr(medianame.lastIndexOf("-") + 1).trim();

                const size = parseInt(documentId.substr(1), 32);
                streamResult = await contentStreamerService.streamBySize(imdbId, size, req.headers['range']);
            } else {
                streamResult = await contentStreamerService.stream(documentId, req.headers['range']);
            }

            if (streamResult) {
                res.writeHead(streamResult.status, streamResult.statusText, streamResult.headers);
                await pipeline(streamResult.body, res);
                logger.info(`Streaming completed for ${documentId}`);
            } else {
                logger.warn(`Unable to resolve stream for ${documentId}. Responding with 404..`);
                res.sendStatus(404);
            }
        } catch (error) {
            logger.error('an error occurred while streaming the media content.', error.message);
            if (!res.headersSent) {
                res.status(500).send("Unknown error occurred");
            }
        }
    }

    public async getMediaContentHead(req: Request, res: Response) {
        const medianame: string = req.params.medianame || "";
        const filename: string = req.params.filename || "";
        const imdbId = medianame.substr(medianame.lastIndexOf("-") + 1).trim();

        const documentId = filename.substr(filename.lastIndexOf("-") + 1).trim().split('.')[0];
        let linkInfo: any
        if (documentId.startsWith('S')) {
            const size = parseInt(documentId.substr(1), 32);
            linkInfo = await LinksCacheList.findOne({
                size,
                imdbId,
                status: 'Valid'
            });
        } else {
            linkInfo = await LinksCacheList.findById(documentId);
        }
        if (linkInfo && linkInfo.status === 'Valid') {
            res.writeHead(200, {
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache',
                'Content-Length': linkInfo.size,
                'Content-Type': linkInfo.contentType,
                'Last-Modified': linkInfo.lastModified && linkInfo.lastModified.toGMTString()
            });
            logger.info(`HEAD DocId:${documentId}, ${linkInfo.size}, ${linkInfo.lastModified}, ${linkInfo.contentType}`);
            res.end();
        } else {
            logger.warn(`HEAD DocId:${documentId}, NOT FOUND!`);
            res.sendStatus(404);
        }
    }
}