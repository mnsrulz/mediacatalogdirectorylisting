import { LinksCacheList } from "./../models/mediaModel";
import AppUtils from "./AppUtils";

import fetch from 'node-fetch';

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
        const playableLinkContentLength = linkInfo.size;
        const headersForInboundRequest: Record<string, string> = linkInfo.headers || {};
        rangeHeader && (headersForInboundRequest['range'] = rangeHeader);

        try {
            const response = await fetch(linkToPlay, {
                headers: headersForInboundRequest
            });

            if (response.ok && response.body) {
                let potentialContentLength;
                if (rangeHeader) {
                    potentialContentLength = AppUtils.parseContentLengthFromRangeHeader(response.headers.get('content-range'))
                } else {
                    potentialContentLength = response.headers.get('content-length');
                }
                if (potentialContentLength) {
                    if (playableLinkContentLength === parseInt(potentialContentLength)) {
                        console.log('content length matches up.. piping the response');
                        const headersForStreamingRequest: Record<string, string> = {};
                        response.headers.forEach((_headerValue, _headerName) => {
                            headerNamesToPipe.includes(_headerName) && (headersForStreamingRequest[_headerName] = _headerValue);
                        })
                        return {
                            headers: headersForStreamingRequest,
                            body: response.body,
                            status: response.status,
                            statusText: response.statusText
                        }
                    } else {
                        console.warn(`MISMATCH found in playableLinkContentLength (${playableLinkContentLength}) and potentialContentLength (${potentialContentLength})`);
                    }
                }
            } else {
                console.warn(`Unexpected response code ${response.status} received while acquiring the media content stream.`);
            }
        } catch (error) {
            console.error('An unknown error occurred while acquiring the media content stream...');
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