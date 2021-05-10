import { LinksCacheList } from "./../models/mediaModel";
import AppUtils from "./AppUtils";

import fetch from 'node-fetch';
import logger from "./Logger";

const headerNamesToPipe = ['content-length', 'content-range', 'content-type', 'range', 'last-modified', 'content-disposition', 'accept-ranges'];
import { MediaSourceService } from './MediaSourceService';
import { LinksCacheService } from './LinksCacheService';
import moment from "moment";
const mediaSourceService = new MediaSourceService();
const linksCacheService = new LinksCacheService();
const maxRetryCount = 3;
export class ContentStreamerService {

    async streamBySize(imdbId: string, size: number, rangeHeader?: string): Promise<MyStreamResponse | null> {
        const potentialLinks = await linksCacheService.ListValidLinksFromCache(imdbId, size);
        logger.info(`Found ${potentialLinks.length} links (${fetchHostName(potentialLinks.map(x => x.parentLink))}) for imdbId: ${imdbId} with size: ${size}`);
        for (const potentialLink of potentialLinks) {
            const documentId = potentialLink.id;
            const stream = await this._stream(documentId, rangeHeader);
            if (stream) {
                return stream;
            }
        }
        return null;
    }

    async stream(documentId: string, rangeHeader?: string): Promise<MyStreamResponse | null> {
        return await this._stream(documentId, rangeHeader);
    }

    async _stream(documentId: string, rangeHeader?: string, retryCount: number = 0): Promise<MyStreamResponse | null> {
        const linkInfo: any = await LinksCacheList.findById(documentId);
        if (linkInfo == null) return null;
        const linkToPlay = linkInfo.playableLink;
        const playableLinkContentLength = parseInt(linkInfo.size);
        const headersForInboundRequest: Record<string, string> = linkInfo.headers || {};
        rangeHeader && (headersForInboundRequest['range'] = rangeHeader);// || 'bytes=0-';
        linkInfo.parentLink && (headersForInboundRequest['Referer'] = linkInfo.parentLink);
        headersForInboundRequest['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0';

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
                        logger.info(`GET ${documentId} ${headersForInboundRequest['range']}, CL ${playableLinkContentLength} matches up.. piping CL ${response.headers.get('content-length')}`);
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
                        logger.warn(`GET ${documentId} ${headersForInboundRequest['range']} - MISMATCH found in playableLinkCL (${playableLinkContentLength}) & potentialCL (${potentialContentLength})`);
                    }
                } else {
                    logger.warn(`GET ${documentId} ${headersForInboundRequest['range']} - Unable to detect content length.`);
                }
            } else {
                logger.warn(`GET ${documentId} ${headersForInboundRequest['range']} - Unexpected response code ${response.status} received while acquiring the media content stream.`);
            }
        } catch (error) {
            logger.error(`GET ${documentId} ${headersForInboundRequest['range']} - An unknown error occurred while acquiring the media content stream...`);
        }

        const hasRecentlyRefreshed = moment(linkInfo.lastUpdated).add(1, 'hour').isAfter();
        if (retryCount > maxRetryCount || (hasRecentlyRefreshed && linkInfo.status === 'Dead')) {
            logger.warn(`GET ${documentId} ${headersForInboundRequest['range']} - Max retries reached so marking the document as dead.`);
            mediaSourceService.MarkDocumentAsDead(documentId);
            return null;
        }
        logger.warn(`GET ${documentId} ${headersForInboundRequest['range']} - Retrying ${retryCount++}/${maxRetryCount} to acquire valid content stream.`);
        await mediaSourceService.Refresh(documentId);
        return await this._stream(documentId, rangeHeader, retryCount);
    }
}

const fetchHostName = (s: string[]) => {
    return s.map(AppUtils.parseHostName).join(',');
}

export interface MyStreamResponse {
    status: number,
    statusText: string,
    headers: Record<string, string>,
    body: NodeJS.ReadableStream
}