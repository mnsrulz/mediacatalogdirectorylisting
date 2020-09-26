import { Request, Response } from 'express';
const viewFile: string = __dirname + '/../../views/search.ejs';
import ejs from 'ejs';
import logger from './../services/Logger';

export class SearchController {
    public async getIndex(req: Request, res: Response) {
        res.setHeader('content-type', 'text/html');
        res.end(await ejs.renderFile(viewFile));
    }
}