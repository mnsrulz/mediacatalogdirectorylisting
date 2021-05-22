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
        const mediaByYear = await mediaService.fetchMediaByYearNetlify('movie', parseInt(req.params.year));
        const result = await DirectoryController.GetRenderData(req.url, mediaByYear);
        res.end(result);
    }

    public async getTVShowsOfYear(req: Request, res: Response) {
        const mediaByYear = await mediaService.fetchMediaByYearNetlify('tv', parseInt(req.params.year));
        const result = await DirectoryController.GetRenderData(req.url, mediaByYear);
        res.end(result);
    }

    public async getPlexMovies(req: Request, res: Response) {
        const plexMovies = await mediaService.fetchMediaPlexNetlify('movie');
        const result = await DirectoryController.GetRenderData(req.url, plexMovies);
        res.end(result);
    }

    public async getPlexTvs(req: Request, res: Response) {
        const plexTvs = await mediaService.fetchMediaPlexNetlify('tv');
        const result = await DirectoryController.GetRenderData(req.url, plexTvs);
        res.end(result);
    }

    public async getMovieMediaSources(req: Request, res: Response) {
        await DirectoryController.getMediaSources(req, res, true);
    }

    public async getTVMediaSources(req: Request, res: Response) {
        await DirectoryController.getMediaSources(req, res, false);
    }

    private static async getMediaSources(req: Request, res: Response, isMovie: boolean) {
        const { year, medianame, imdbid } = req.params;

        const defaultOnly = req.get('X-DEFAULT-ONLY')?.toString() === '1';  //special header to club files. Used in rclone http header setting so, we don't have to display all the sources
        const allCacheLinksForGivenImdbId = await mediaSourceService.listMediaSources(imdbid, isMovie, defaultOnly);
console.log(year);
        isMovie ?
            fileNameCleanerService.CleanMovieTitle(allCacheLinksForGivenImdbId, medianame, year) :
            fileNameCleanerService.CleanTvTitle(allCacheLinksForGivenImdbId, medianame, year);
        const output = await DirectoryController.GetRenderData(req.url, allCacheLinksForGivenImdbId, {
            imdbId: imdbid
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