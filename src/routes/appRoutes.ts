import { Request, Response, NextFunction } from "express";
import { DirectoryController } from "../controllers/DirectoryController";

export class Routes {

    public directoryController: DirectoryController = new DirectoryController()

    public routes(app: any): void {
        app.route('/').get(mw, this.directoryController.getRoot);
        app.route('/movie').get(mw, this.directoryController.getYearsOfMovie);
        app.route('/movie/:year').get(mw, this.directoryController.getMoviesOfYear);
        app.route('/movie/:year/:medianame').get(mw, this.directoryController.getMovieSources);
        app.route('/movie/:year/:medianame/:filename').get(this.directoryController.getMediaContent);

        app.route('/tv').get(mw, this.directoryController.getYearsOfMovie);
        app.route('/tv/:year').get(mw, this.directoryController.getTVShowsOfYear);
        app.route('/tv/:year/:medianame').get(mw, this.directoryController.getMovieSources);
        app.route('/tv/:year/:medianame/:filename').get(this.directoryController.getMediaContent);

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