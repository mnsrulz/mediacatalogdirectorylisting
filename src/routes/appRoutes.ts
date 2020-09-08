import { Request, Response, NextFunction } from "express";
import { DirectoryController } from "../controllers/DirectoryController";
import { JobsController } from "../controllers/JobsController";
import express from "express";

export class Routes {

    public directoryController = new DirectoryController();
    public jobController = new JobsController();

    public routes(app: express.Application): void {
        app.route('/').get(mw, this.directoryController.getRoot);
        app.route('/movie').get(mw, this.directoryController.getYearsOfMovie);
        app.route('/movie/:year').get(mw, this.directoryController.getMoviesOfYear);
        app.route('/movie/:year/:medianame').get(mw, this.directoryController.getMediaSources);
        app.route('/movie/:year/:medianame/:filename').get(this.directoryController.getMediaContent);

        app.route('/tv').get(mw, this.directoryController.getYearsOfMovie);
        app.route('/tv/:year').get(mw, this.directoryController.getTVShowsOfYear);
        app.route('/tv/:year/:medianame').get(mw, this.directoryController.getMediaSources);
        app.route('/tv/:year/:medianame/:filename').get(this.directoryController.getMediaContent);

        //app.route('/refresh/:imdbId').get(mw, this.jobController.refresh);

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