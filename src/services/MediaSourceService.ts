import * as mongoose from 'mongoose';
import { MediaSchema, LinksCacheSchema } from '../models/mediaModel';
import nurlresolver from 'nurlresolver';
import { FileNode } from "../models/fileNode";
const LinksCacheList = mongoose.model('LinksCache', LinksCacheSchema);
const MediaList = mongoose.model('MediaCatalog', MediaSchema);
const refreshLinkTimeout = (1000 * 24 * 60 * 60);

export class MediaSourceService {

    public async listMovieSources(imdbId: string): Promise<FileNode[]> {
        var allCacheLinksForGivenImdbId: any[] = await LinksCacheList.find({ imdbId: imdbId, status: 'Valid' });

        if (allCacheLinksForGivenImdbId.length === 0
            || allCacheLinksForGivenImdbId.some(x => x.lastUpdated < Date.now() - refreshLinkTimeout)) {
            console.log('Refreshing the source for current imdbid');
            await this.refreshSources(imdbId);
            allCacheLinksForGivenImdbId = await LinksCacheList.find({ imdbId: imdbId, status: 'Valid' });
        } else {
            console.log('Sources are fresh... no need to refresh.');
        }

        const result: FileNode[] = allCacheLinksForGivenImdbId.map(x => {
            return {
                parent: x._id,
                title: x.title,
                isDirectory: false,
                size: x.size,
                lastModified: x.lastModified,
                documentId: x._id
            } as FileNode
        });
        return result;
    }

    public async refreshSources(imdbId: string) {
        console.log(`fetching media from url for imdbid: ${imdbId}`);
        await LinksCacheList.updateMany({ imdbId: imdbId }, { status: 'Refreshing', lastUpdated: Date.now() });
        var webLinks = await MediaList.find({ 'imdbInfo.id': imdbId });
        var allPromiseForRefreshSources: any[] = [];
        webLinks.forEach((w: any) => {
            allPromiseForRefreshSources.push(this.fetchLinksAndPerformSave(imdbId, w));
        });
        await Promise.all(allPromiseForRefreshSources);
        await LinksCacheList.updateMany({ imdbId: imdbId, status: 'Refreshing' }, { status: 'Dead', lastUpdated: Date.now() });
    }

    public async fetchLinksAndPerformSave(imdbId: string, w: any) {
        var allResolvedLinks = await nurlresolver.resolveRecursive(w.media_document.webViewLink, {
            timeout: 30,
            extractMetaInformation: true
        });
        var allPromiseForPersistence: any[] = [];
        allResolvedLinks.forEach(x => {
            //should not be updatemany but noticed in the past that there exists multiple due to some concurrency issues.
            const size = x.size && parseInt(x.size);
            let lastModified = null;

            if (x.lastModified) {
                lastModified = new Date(x.lastModified);
            }

            var persistencePromise = LinksCacheList.updateMany({ imdbId: imdbId, parentLink: x.parent }, {
                title: x.title,
                imdbId: imdbId,
                playableLink: x.link,
                isPlayable: x.isPlayable,
                parentLink: x.parent,
                lastUpdated: Date.now(),
                status: 'Valid',
                size: size,
                lastModified: lastModified,
                contentType: x.contentType
            }, { upsert: true, setDefaultsOnInsert: true });
            allPromiseForPersistence.push(persistencePromise);
        });
        await Promise.all(allPromiseForPersistence);
    }
    
    public async Refresh(documentId: string): Promise<string> {
        const linkInfo: any = await LinksCacheList.findById(documentId);
        let linkToPlay = ''
        console.log(`Refreshing link for docid: ${documentId}, parent: ${linkInfo.parentLink}`);
        const resolvedLinks = await nurlresolver.resolveRecursive(linkInfo.parentLink);
        if (resolvedLinks && resolvedLinks.length >= 1) {
            const x = resolvedLinks[0];
            await LinksCacheList.updateOne({ _id: documentId }, {
                title: x.title,
                playableLink: x.link,
                isPlayable: x.isPlayable,
                parentLink: x.parent,
                lastUpdated: Date.now(),
                status: 'Valid'
            });
            linkToPlay = x.link;
        } else {
            this.MarkDocumentAsDead(documentId);
            console.log(`Marking ${documentId} as Dead, since no link resolved for given parent link: ${linkInfo.parentLink}`);
        }
        return linkToPlay;
    }

    public async MarkDocumentAsDead(documentId: string) {
        await LinksCacheList.updateOne({ _id: documentId }, {
            lastUpdated: Date.now(),
            status: 'Dead'
        });
    }
}