import { Request, Response } from 'express';

import { FileNode } from "../models/fileNode";

import ejs from 'ejs';

import moment from 'moment';
import prettyBytes from 'pretty-bytes';
import { MediaService } from '../services/MediaService';
import { MediaSourceService } from '../services/MediaSourceService';
import { FileNameCleanerService } from '../services/FileNameCleanerService';

const viewFile: string = __dirname + '/../../views/files.ejs';
const mediaService = new MediaService();
const mediaSourceService = new MediaSourceService();
const fileNameCleanerService = new FileNameCleanerService();

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

    public async getMovieMediaSources(req: Request, res: Response) {
        await DirectoryController.getMediaSources(req, res, true);
    }

    public async getTVMediaSources(req: Request, res: Response) {
        await DirectoryController.getMediaSources(req, res, false);
    }

    private static async getMediaSources(req: Request, res: Response, isMovie: boolean) {
        const medianame: string = req.params.medianame || "";
        const year: string = req.params.year;
        const normalizedMediaName = medianame.substr(0, medianame.lastIndexOf("-")).trim();
        const imdbId = medianame.substr(medianame.lastIndexOf("-") + 1).trim();
        const allCacheLinksForGivenImdbId = await mediaSourceService.listMediaSources(imdbId);
        isMovie ?
            fileNameCleanerService.CleanMovieTitle(allCacheLinksForGivenImdbId, normalizedMediaName, year) :
            fileNameCleanerService.CleanTvTitle(allCacheLinksForGivenImdbId, normalizedMediaName, year);
        const output = await DirectoryController.GetRenderData(req.url, allCacheLinksForGivenImdbId, {
            imdbId
        });
        res.end(output);
    }

    public async getRoot(req: Request, res: Response) {
        var result = await mediaService.getRoot();
        const output = await DirectoryController.GetRenderData(req.url, result);
        res.end(output);
    }

    private static async GetRenderData(reqUrl: string, data: any, options?: any): Promise<string> {
        return await ejs.renderFile(viewFile, {
            title: reqUrl,
            data,
            options,
            moment,
            prettyBytes
        });
    }
}