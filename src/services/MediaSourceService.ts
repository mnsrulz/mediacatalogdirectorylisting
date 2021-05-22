import * as mongoose from 'mongoose';
import { MediaSchema, LinksCacheSchema } from '../models/mediaModel';
import nurlresolver from 'nurlresolver';
import { FileNode } from "../models/fileNode";
import { ResolvedMediaItem } from 'nurlresolver/dist/BaseResolver';
import logger from "./../services/Logger";
import { getMediaSources } from './mediaCatalogApiClient';
const LinksCacheList = mongoose.model('LinksCache', LinksCacheSchema);
const MediaList = mongoose.model('MediaCatalog', MediaSchema);
const refreshLinkTimeout = (1000 * 24 * 7 * 60 * 60); //7 Days of refreshness

export class MediaSourceService {

    public async listMediaSources(imdbId: string, isMovie: boolean, defaultOnly: boolean = false): Promise<FileNode[]> {
        var allCacheLinksForGivenImdbId: any[] = await LinksCacheList.find({ imdbId: imdbId });
        logger.info(`Listing media sources for imdbId: ${imdbId}, isMovie:${isMovie}, defaultOnly: ${defaultOnly}`);
        if (allCacheLinksForGivenImdbId.length === 0
            || allCacheLinksForGivenImdbId.some(x => x.lastUpdated < Date.now() - refreshLinkTimeout)) {
            logger.info('Refreshing the source for current imdbid');
            await this.refreshSources(imdbId);
            allCacheLinksForGivenImdbId = await LinksCacheList.find({ imdbId: imdbId });
        }

        if (defaultOnly) {
            const _tempMapper: Record<number, boolean> = {};
            allCacheLinksForGivenImdbId = allCacheLinksForGivenImdbId.filter(x => x.size && x.size > 1 * 1024 * 1024 && x.status === 'Valid').map(x => {
                if (_tempMapper[x.size]) {
                    return null;
                } else {
                    _tempMapper[x.size] = true;
                    return x;
                }
            }).filter(x => x);
            //lets use the default item for movie only. Cause tv items may have multiple items.
            if (isMovie && allCacheLinksForGivenImdbId.length > 0) {
                const theDefaultItem = allCacheLinksForGivenImdbId.find(x => x.isDefault);
                if (theDefaultItem) {
                    allCacheLinksForGivenImdbId = [theDefaultItem];
                } else {
                    allCacheLinksForGivenImdbId.sort((a, b) => b.size - a.size);    //max size first
                    allCacheLinksForGivenImdbId = [allCacheLinksForGivenImdbId[0]];
                }
            }
        } else {
            allCacheLinksForGivenImdbId = allCacheLinksForGivenImdbId.filter(x => x.status === 'Valid');
        }

        logger.info(`Found ${allCacheLinksForGivenImdbId.length} items for imdbId: ${imdbId}`)

        const result: FileNode[] = allCacheLinksForGivenImdbId.map(x => {
            return {
                parent: x.parentLink,
                title: x.title,
                isDirectory: false,
                size: x.size,
                lastModified: x.lastModified,
                documentId: defaultOnly ? `S${x.size.toString(32)}` : x._id,
                headers: x.headers,
                imdbId: x.imdbId,
                lastUpdated: x.lastUpdated,
                status: x.status,
                ts: x.ts,
                playableLink: x.playableLink,
                speedRank: x.speedRank
            } as FileNode
        });
        return result;
    }

    public async refreshSources(imdbId: string) {
        logger.info(`fetching media from url for imdbid: ${imdbId}`);
        await LinksCacheList.updateMany({ imdbId: imdbId }, { status: 'Refreshing', lastUpdated: Date.now() });

        //var webLinks = await MediaList.find({ 'imdbInfo.id': imdbId });   
        const webLinks = await getMediaSources(imdbId); //use the new api service

        var allPromiseForRefreshSources: any[] = [];
        webLinks.forEach(w => {
            allPromiseForRefreshSources.push(this.fetchLinksAndPerformSave(imdbId, w));
        });
        await Promise.all(allPromiseForRefreshSources);
        await LinksCacheList.updateMany({ imdbId: imdbId, status: 'Refreshing' }, { status: 'Dead', lastUpdated: Date.now() });
    }

    public async fetchLinksAndPerformSave(imdbId: string, w: { webViewLink: string }) {
        var allResolvedLinks = await nurlresolver.resolveRecursive(w.webViewLink, {
            timeout: 25,
            extractMetaInformation: true
        });
        var allPromiseForPersistence: any[] = [];
        allResolvedLinks.forEach(x => {
            //should not be updatemany but noticed in the past that there exists multiple due to some concurrency issues.
            let size = 0;
            let lastModified = null;

            if (x.lastModified) {
                lastModified = new Date(x.lastModified);
            }
            if (x.size && parseInt(x.size) !== NaN) {
                size = parseInt(x.size);
            } else {
                logger.warn(`Size undetected for imdbid ${imdbId}, parentLink ${x.parent}`);
            }
            var persistencePromise = LinksCacheList.updateMany({ imdbId: imdbId, parentLink: x.parent }, {
                playableLink: x.link,
                lastUpdated: Date.now(),
                status: 'Valid',
                headers: x.headers,
                contentType: x.contentType,
                size: size,
                speedRank: x.speedRank,
                lastModified: lastModified,  //CHANGED--We don't want to update the size and lastmodified in case the doucment already exists. To avoid any failure from the providers where they reuse the old id's.
                $setOnInsert: {
                    title: x.title,
                    imdbId: imdbId,
                    parentLink: x.parent,
                    isPlayable: x.isPlayable,
                }
            }, { upsert: true, setDefaultsOnInsert: true });
            allPromiseForPersistence.push(persistencePromise);
        });
        await Promise.all(allPromiseForPersistence);
    }

    async Refresh(documentId: string): Promise<ResolvedMediaItem | null> {
        const linkInfo: any = await LinksCacheList.findById(documentId);
        logger.info(`Refreshing link for docid: ${documentId}, parent: ${linkInfo.parentLink}`);
        const resolvedLinks = await nurlresolver.resolveRecursive(linkInfo.parentLink, {
            extractMetaInformation: true
        });
        if (resolvedLinks && resolvedLinks.length >= 1) {
            const x = resolvedLinks[0];

            const size = x.size && parseInt(x.size);
            let lastModified = null;

            if (x.lastModified) {
                lastModified = new Date(x.lastModified);
            }

            const documentToPersist = {
                lastModified: linkInfo.lastModified || lastModified,
                contentType: linkInfo.contentType || x.contentType,
                size: linkInfo.size || size,
                playableLink: x.link,
                lastUpdated: Date.now(),
                status: 'Valid',
                headers: x.headers,
                speedRank: x.speedRank
            };
            logger.info(`Document ${documentId} source refreshed.`, documentToPersist);
            await LinksCacheList.updateOne({ _id: documentId }, documentToPersist);
            return x;
        } else {
            this.MarkDocumentAsDead(documentId);
            logger.info(`Marking ${documentId} as Dead, since no link resolved for given parent link: ${linkInfo.parentLink}`);
        }
        return null;
    }

    public async MarkDocumentAsDead(documentId: string) {
        await LinksCacheList.updateOne({ _id: documentId }, {
            lastUpdated: Date.now(),
            status: 'Dead'
        });
    }

    public async MarkDocumentAsDefault(documentId: string, imdbId: string, seasonNumber?: number, episodeNumber?: number) {
        if (seasonNumber || episodeNumber) {
            //follow tv route
        } else {
            //follow movie route
            // await LinksCacheList.updateMany({ imdbId: imdbId, isDefault: true }, {
            //     isDefault: false
            // });
            logger.info(`Marking default document as ${documentId} for imdbId: ${imdbId}`);
            await LinksCacheList.updateOne({ _id: documentId, imdbId: imdbId }, {
                lastUpdated: Date.now(),
                isDefault: true
            });
        }
    }
}
