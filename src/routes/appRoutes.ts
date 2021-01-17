import { Request, Response, NextFunction } from "express";
import { DirectoryController } from "../controllers/DirectoryController";
import { JobsController } from "../controllers/JobsController";
import { MediaStreamingController } from "../controllers/MediaStreamingController";
import { LinkCacheController } from '../controllers/LinkCacheController';
import { SearchController } from '../controllers/SearchController';
import express from "express";
import logger from './../services/Logger';
import { GoogleDriveUploadController } from "../controllers/GoogleDriveUploadController";
import { ZipFileController } from "../controllers/ZipFileController";

export class Routes {

    public directoryController = new DirectoryController();
    public jobController = new JobsController();
    public mediaStreamingController = new MediaStreamingController();
    public linkCacheController = new LinkCacheController();
    public searchController = new SearchController();
    public gdUploadController = new GoogleDriveUploadController();
    public zipFileController = new ZipFileController();

    public routes(app: express.Application): void {
        app.route('/').get(mw, this.directoryController.getRoot);
        app.route(['/movie', '/tv']).get(mw, this.directoryController.getYearsOfMovie);
        app.route('/movie/:year').get(mw, this.directoryController.getMoviesOfYear);
        app.route('/movie/:year/:medianame')
            .head(send405)
            .get(mw, this.directoryController.getMovieMediaSources);
        app.route(['/movie/:year/:medianame/:filename', '/tv/:year/:medianame/:filename'])
            .head(this.mediaStreamingController.getMediaContentHead)
            .get(this.mediaStreamingController.getMediaContent);

        app.route('/tv/:year').get(mw, this.directoryController.getTVShowsOfYear);
        app.route('/tv/:year/:medianame')
            .head(send405)
            .get(mw, this.directoryController.getTVMediaSources);

        app.route(['/movie/:year/:medianame/refreshSources', '/tv/:year/:medianame/refreshSources']).post(this.jobController.refreshSources);

        app.route('/search').get(this.searchController.getIndex);
        app.route('/api/links').get(this.linkCacheController.getLinks);
        app.route('/api/links/refresh/:documentId').post(this.linkCacheController.refresh);

        app.route('/api/zip/listfiles').get(this.zipFileController.listFiles);

        function mw(req: Request, res: Response, next: NextFunction) {
            logger.info(`${req.method} ${decodeURI(req.originalUrl)}`);
            if (req.originalUrl.endsWith('/')) {
                res.setHeader('content-type', 'text/html');
                next();
            } else {
                res.redirect(req.originalUrl + '/');
            }
        }

        function send405(req: Request, res: Response, next: NextFunction) {
            res.sendStatus(405);
        }
    }
}