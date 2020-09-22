import { Request, Response, NextFunction } from "express";
import { DirectoryController } from "../controllers/DirectoryController";
import { JobsController } from "../controllers/JobsController";
import { MediaStreamingController } from "../controllers/MediaStreamingController";
import express from "express";

export class Routes {

    public directoryController = new DirectoryController();
    public jobController = new JobsController();
    public mediaStreamingController = new MediaStreamingController();

    public routes(app: express.Application): void {
        app.route('/').get(mw, this.directoryController.getRoot);
        app.route(['/movie', '/tv']).get(mw, this.directoryController.getYearsOfMovie);
        app.route('/movie/:year').get(mw, this.directoryController.getMoviesOfYear);
        app.route('/movie/:year/:medianame').get(mw, this.directoryController.getMovieMediaSources);
        app.route(['/movie/:year/:medianame/:filename','/tv/:year/:medianame/:filename'])
            .head(this.mediaStreamingController.getMediaContentHead)
            .get(this.mediaStreamingController.getMediaContent);

        app.route('/tv/:year').get(mw, this.directoryController.getTVShowsOfYear);
        app.route('/tv/:year/:medianame').get(mw, this.directoryController.getTVMediaSources);

        app.route('/movie/:year/:medianame/refreshSources').post(this.jobController.refreshSources);

        function mw(req: Request, res: Response, next: NextFunction) {
            console.log(`${req.method}, ${req.originalUrl}`);
            if (req.originalUrl.endsWith('/')) {
                res.setHeader('content-type', 'text/html');
                next();
            } else {
                res.redirect(req.originalUrl + '/');
            }
        }
    }
}