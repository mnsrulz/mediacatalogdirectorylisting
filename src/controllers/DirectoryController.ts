import * as mongoose from 'mongoose';
import { LinksCacheSchema } from '../models/mediaModel';
import { Request, Response } from 'express';

import { MediaService } from '../services/MediaService';
import { MediaSourceService } from '../services/MediaSourceService';
import { FileNode } from "../models/fileNode";

import ejs from 'ejs';

import got from 'got';
import moment from 'moment';
import prettyBytes from 'pretty-bytes';
import { FileNameCleanerService } from '../services/FileNameCleanerService';

const LinksCacheList = mongoose.model('LinksCache', LinksCacheSchema);

const viewFile: string = __dirname + '/../../views/files.ejs';
const mediaService = new MediaService();
const mediaSourceService = new MediaSourceService();
const fileNameCleanerService = new FileNameCleanerService();
const linkRefreshTimeout = (1000 * 30 * 60);

export class DirectoryController {
    public async getYearsOfMovie(req: Request, res: Response) {
        const result: FileNode[] = await mediaService.fetchYearsByMediaType();
        const output = await DirectoryController.GetRenderData(req.url, result);
        res.end(output);
    }

    public async getMoviesOfYear(req: Request, res: Response) {
        const mediaByYear = await mediaService.fetchMediaByYear('Movie', req.params.year);
        const result = await DirectoryController.GetRenderData(req.url, mediaByYear);
        res.end(result);
    }

    public async getTVShowsOfYear(req: Request, res: Response) {
        const mediaByYear = await mediaService.fetchMediaByYear('TV', req.params.year);
        const result = await DirectoryController.GetRenderData(req.url, mediaByYear);
        res.end(result);
    }

    public async getMediaSources(req: Request, res: Response) {
        const medianame: string = req.params.medianame || "";
        const year: string = req.params.year;
        const normalizedMediaName = medianame.substr(0, medianame.lastIndexOf("-")).trim();
        const imdbId = medianame.substr(medianame.lastIndexOf("-") + 1).trim();
        const allCacheLinksForGivenImdbId = await mediaSourceService.listMovieSources(imdbId);
        fileNameCleanerService.CleanMovieTitle(allCacheLinksForGivenImdbId, normalizedMediaName, year);
        const output = await DirectoryController.GetRenderData(req.url, allCacheLinksForGivenImdbId);
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
            if (linkInfo.lastUpdated < Date.now() - linkRefreshTimeout) {
                //change this to actual response since head is not supported by everyone
                const { statusCode } = await got.head(linkInfo.playableLink, {
                    throwHttpErrors: false
                });
                if (statusCode !== 200) {
                    console.log(`Status code ${statusCode} received for playable link ${linkInfo.playableLink}`);
                    requireRefresh = true;
                }
            }

            if (requireRefresh) {
                linkToPlay = await mediaSourceService.Refresh(documentId);
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
        var result = await mediaService.getRoot();
        const output = await DirectoryController.GetRenderData(req.url, result);
        res.end(output);
    }

    private static async GetRenderData(reqUrl: string, data: any): Promise<string> {
        return await ejs.renderFile(viewFile, {
            title: reqUrl,
            data,
            moment,
            prettyBytes
        });
    }
}

