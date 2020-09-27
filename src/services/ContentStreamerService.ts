import { LinksCacheList } from "./../models/mediaModel";
import AppUtils from "./AppUtils";

import fetch from 'node-fetch';
import logger from "./Logger";

const headerNamesToPipe = ['content-length', 'content-range', 'content-type', 'range', 'last-modified', 'content-disposition', 'accept-ranges'];
import { MediaSourceService } from './MediaSourceService';
import moment from "moment";
const mediaSourceService = new MediaSourceService();
export class ContentStreamerService {

    async stream(documentId: string, rangeHeader?: string): Promise<MyStreamResponse | null> {
        return this._stream(documentId, rangeHeader, false);
    }

    async _stream(documentId: string, rangeHeader?: string, isRetrying: boolean = false): Promise<MyStreamResponse | null> {
        const linkInfo: any = await LinksCacheList.findById(documentId);
        if (linkInfo == null) return null;
        const linkToPlay = linkInfo.playableLink;
        const playableLinkContentLength = parseInt(linkInfo.size);
        const headersForInboundRequest: Record<string, string> = linkInfo.headers || {};
        headersForInboundRequest['range'] = rangeHeader || 'bytes=0-';

        try {
            const response = await fetch(linkToPlay, {
                headers: headersForInboundRequest
            });
            if (response.ok && response.body) {
                let potentialContentLength: number | undefined;
                potentialContentLength = AppUtils.parseContentLengthFromRangeHeader(response.headers.get('content-range')) 
                                            || parseInt(response.headers.get('content-length') || '0');
                if (potentialContentLength) {
                    if (playableLinkContentLength === potentialContentLength) {
                        logger.info(`GET ${documentId} ${headersForInboundRequest['range']} - content length ${playableLinkContentLength} matches up.. piping response with total content length ${response.headers.get('content-length')}`);
                        const headersForStreamingRequest: Record<string, string> = {};
                        response.headers.forEach((_headerValue, _headerName) => {
                            headerNamesToPipe.includes(_headerName) && (headersForStreamingRequest[_headerName] = _headerValue);
                        });
                        return {
                            headers: headersForStreamingRequest,
                            body: response.body,
                            status: response.status,
                            statusText: response.statusText
                        }
                    } else {
                        logger.warn(`MISMATCH found in playableLinkContentLength (${playableLinkContentLength}) and potentialContentLength (${potentialContentLength})`);
                    }
                } else {
                    logger.warn(`Unable to detect content length.`);
                }
            } else {
                logger.warn(`GET ${documentId} ${headersForInboundRequest['range']} - Unexpected response code ${response.status} received while acquiring the media content stream.`);
            }
        } catch (error) {
            logger.error(`GET ${documentId} ${headersForInboundRequest['range']} - An unknown error occurred while acquiring the media content stream...`);
        }

        const lastUpdatedDate: number = linkInfo.lastUpdated;
        const hasRecentlyRefreshed = moment(lastUpdatedDate).add(1, 'hour').isAfter();

        if (isRetrying || hasRecentlyRefreshed) return null;

        await mediaSourceService.Refresh(documentId);
        return this._stream(documentId, rangeHeader, true);
    }
}

export interface MyStreamResponse {
    status: number,
    statusText: string,
    headers: Record<string, string>,
    body: NodeJS.ReadableStream
}