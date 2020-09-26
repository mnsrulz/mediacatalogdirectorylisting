import * as mongoose from 'mongoose';
import { LinksCacheSchema } from '../models/mediaModel';
import { Request, Response } from 'express';
import { ContentStreamerService } from '../services/ContentStreamerService';
import logger from "./../services/Logger";
import stream from 'stream';
import { promisify } from 'util';
const pipeline = promisify(stream.pipeline);
const streamPipeline = promisify(pipeline);

const LinksCacheList = mongoose.model('LinksCache', LinksCacheSchema);
const contentStreamerService = new ContentStreamerService();

export class MediaStreamingController {
    public async getMediaContent(req: Request, res: Response) {
        try {
            const medianame: string = req.params.filename || "";
            const documentId = medianame.substr(medianame.lastIndexOf("-") + 1).trim().split('.')[0];
            const streamResult = await contentStreamerService.stream(documentId, req.headers['range']);
            if (streamResult) {
                res.writeHead(streamResult.status, streamResult.statusText, streamResult.headers);
                await streamPipeline(streamResult.body, res);
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
        const medianame: string = req.params.filename || "";
        const documentId = medianame.substr(medianame.lastIndexOf("-") + 1).trim().split('.')[0];
        const linkInfo: any = await LinksCacheList.findById(documentId);

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