import * as mongoose from 'mongoose';
import { MediaSchema, LinksCacheSchema } from '../models/mediaModel';
import { Request, Response } from 'express';

import { MediaService, FileNode } from '../services/MediaService';

import ejs, { promiseImpl } from 'ejs';
import path from 'path';
import nurlresolver from 'nurlresolver';

import got from 'got';

const MediaList = mongoose.model('MediaCatalog', MediaSchema);
const LinksCacheList = mongoose.model('LinksCache', LinksCacheSchema);

const viewFile: string = __dirname + '/../views/files.ejs';
const mediaService = new MediaService();

export class DirectoryController {
    public getContactWithID(req: Request, res: Response) {
        MediaList.findById(req.params.contactId, (err, contact) => {
            if (err) {
                res.send(err);
            }
            res.json(contact);
        });
    }

    // public updateContact(req: Request, res: Response) {
    //     MediaList.findOneAndUpdate({ _id: req.params.contactId }, req.body, { new: true }, (err, contact) => {
    //         if (err) {
    //             res.send(err);
    //         }
    //         res.json(contact);
    //     });
    // }

    public async getYearsOfMovie(req: Request, res: Response) {
        const result: FileNode[] = await mediaService.fetchYearsByMediaType();
        const output = await ejs.renderFile(viewFile, {
            title: req.url,
            data: result,
        })
        res.end(output);
    }

    public async getMoviesOfYear(req: Request, res: Response) {
        const mediaByYear = await mediaService.fetchMediaByYear('Movie', req.params.year);
        const result = await ejs.renderFile(viewFile, {
            title: req.url,
            data: mediaByYear,
        })
        res.end(result);
    }

    public async getTVShowsOfYear(req: Request, res: Response) {
        const mediaByYear = await mediaService.fetchMediaByYear('TV', req.params.year);
        const result = await ejs.renderFile(viewFile, {
            title: req.url,
            data: mediaByYear,
        })
        res.end(result);
    }

    public async fn1(mediaType: string, year: any, requestUrl: string): Promise<string> {
        async function listAllMoviesOfYear(year: any): Promise<FileNode[]> {
            var allMoviesGroupByYear: any[] = await MediaList.aggregate(
                [
                    { "$match": { "imdbInfo.year": `${year}`, "tmdbInfo.media": mediaType } },    //List only movies
                    { "$group": { _id: "$imdbInfo.id", title: { $max: "$tmdbInfo.title" } } },
                    { $sort: { title: 1 } },
                ],
            );

            return allMoviesGroupByYear.map((x) => {
                const title = decodeURI(encodeURI(x.title).replace("%C2%A0", "%20"));
                const f: FileNode = {
                    id: `${title}-${x._id}`,
                    parent: x._id,
                    title: title,
                    isDirectory: true,
                    size: 0,
                };
                return f;
            });
        }
        const result: FileNode[] = await listAllMoviesOfYear(year);
        const output = await ejs.renderFile(viewFile, {
            title: requestUrl,
            data: result,
        })
        return output;
    }

    public async getMovieSources(req: Request, res: Response) {
        async function fetchLinksAndPerformSave(w: any) {
            var allResolvedLinks = await nurlresolver.resolveRecursive(w.media_document.webViewLink, {
                timeout: 30
            });
            // console.log('printing all resolved links for imdbid');
            // console.log(allResolvedLinks);
            var allPromiseForPersistence: any[] = [];
            allResolvedLinks.forEach((x: any) => {
                //should not be updatemany but noticed in the past that there exists multiple due to some concurrency issues.
                var persistencePromise = LinksCacheList.updateMany({ imdbId: imdbId, parentLink: x.parent }, {
                    title: x.title,
                    imdbId: imdbId,
                    playableLink: x.link,
                    isPlayable: x.isPlayable,
                    parentLink: x.parent,
                    lastUpdated: Date.now(),
                    status: 'Valid'
                }, { upsert: true, setDefaultsOnInsert: true });
                allPromiseForPersistence.push(persistencePromise);
            });
            await Promise.all(allPromiseForPersistence);
        }
        async function refreshSources(imdbId: any) {
            console.log(`fetching media from url for imdbid: ${imdbId}`);
            await LinksCacheList.updateMany({ imdbId: imdbId }, { status: 'Refreshing', lastUpdated: Date.now() });
            var webLinks = await MediaList.find({ 'imdbInfo.id': imdbId });
            var allPromiseForRefreshSources: any[] = [];
            webLinks.forEach((w: any) => {
                allPromiseForRefreshSources.push(fetchLinksAndPerformSave(w));
            });
            await Promise.all(allPromiseForRefreshSources);
            await LinksCacheList.updateMany({ imdbId: imdbId, status: 'Refreshing' }, { status: 'Dead', lastUpdated: Date.now() });
        }

        async function listMovieSources(imdbId: any): Promise<FileNode[]> {
            var allCacheLinksForGivenImdbId: any[] = await LinksCacheList.find({ imdbId: imdbId, status: 'Valid' });

            if (allCacheLinksForGivenImdbId.length === 0
                || allCacheLinksForGivenImdbId.some(x => x.lastUpdated < Date.now() - (1000 * 24 * 60 * 60))) {
                console.log('Refreshing the source for current imdbid');
                await refreshSources(imdbId); //lets refresh and then present..
                allCacheLinksForGivenImdbId = await LinksCacheList.find({ imdbId: imdbId, status: 'Valid' });
            } else {
                console.log('Sources are fresh... no need to refresh.');
            }
            return allCacheLinksForGivenImdbId.map(x => {
                let cleanedTitle = x.title; //cleanMovieTitle(x.title);
                let extensionOfTitle = path.extname(x.title);

                if (cleanedTitle.toLowerCase().endsWith('.mkv')) {
                    cleanedTitle = `${normalizedMediaName} (${year})-${x._id}.mkv`;
                } else if (cleanedTitle.toLowerCase().endsWith('.mp4')) {
                    cleanedTitle = `${normalizedMediaName} (${year})-${x._id}.mp4`;
                    // } else if (cleanedTitle.toLowerCase().endsWith('.zip')) {
                    //     cleanedTitle = `${x.title}-${x._id}.zip`;
                } else {
                    if (extensionOfTitle)
                        cleanedTitle = x.title.replace(/(\.[\w\d_-]+)$/i, `-${x._id}$1`);
                    else
                        cleanedTitle = `${x.title}-${x._id}`;
                }

                const f: FileNode = {
                    id: cleanedTitle,
                    parent: x._id,
                    title: x.title,
                    isDirectory: false,
                    size: 0,
                };
                return f;
            });
        }
        const medianame: string = req.params.medianame || "";
        const year: string = req.params.year;
        const normalizedMediaName = medianame.substr(0, medianame.lastIndexOf("-")).trim();
        const imdbId = medianame.substr(medianame.lastIndexOf("-") + 1).trim();
        const result: FileNode[] = await listMovieSources(imdbId);
        const output = await ejs.renderFile(viewFile, {
            title: req.url,
            data: result,
        })
        res.end(output);
    }

    public async getMediaContent(req: Request, res: Response) {        
        console.log(`${req.method}, ${req.originalUrl}`);
        let linkInfo: any;
        try {

            const medianame: string = req.params.filename || "";
            const documentId = medianame.substr(medianame.lastIndexOf("-") + 1).trim().split('.')[0];
            linkInfo = await LinksCacheList.findById(documentId);
            let linkToPlay = ''
            console.log(`docid: ${documentId}, parent: ${linkInfo.parentLink}`);
            let requireRefresh = false;
            if (linkInfo.lastUpdated < Date.now() - (1000 * 30 * 60)) {
                const { statusCode } = await got.head(linkInfo.playableLink, {
                    throwHttpErrors: false
                });
                statusCode !== 200 && (requireRefresh = true);
            }

            if (requireRefresh) {
                console.log(`Link expired. Refreshing it. ${linkInfo.parentLink}`);
                const resolvedLinks = await nurlresolver.resolveRecursive(linkInfo.parentLink
                //     , {
                //     timeout: 30
                // }
                );
                // console.log(resolvedLinks);
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
                    //if (this.isValidLink(x.link))
                    linkToPlay = x.link;
                    // } else if (resolvedLinks.length > 1) {
                    //     console.log(`More than one link resolved for given parent link: ${linkInfo.parentLink}`);
                } else {
                    await LinksCacheList.updateOne({ _id: documentId }, {
                        lastUpdated: Date.now(),
                        status: 'Dead'
                    });
                    console.log(`No link resolved for given parent link: ${linkInfo.parentLink}`);
                }
            } else {
                linkToPlay = linkInfo.status === 'Valid' && linkInfo.playableLink;
            }

            if (linkToPlay) {                
                res.redirect(linkToPlay);
            } else {
                res.status(404).send("Not found.");
            }
        } catch (error) {
            console.log('GetMediaContent: Erroring out.', linkInfo, error);
            // console.log(error);
            res.status(500).send("Unknown error occurred");
        }
    }

    public async getRoot(req: Request, res: Response) {
        var result = await mediaService.getRoot()
        const output = await ejs.renderFile(viewFile, {
            title: req.url,
            data: result,
        })
        res.end(output);
    }

}

