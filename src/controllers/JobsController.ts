import { MediaSourceService } from '../services/MediaSourceService';
import { Request, Response } from 'express';
const mediaSourceService = new MediaSourceService();

export class JobsController {

    public async refreshSources(req: Request, res: Response) {
        const { imdbid } = req.params;
        await mediaSourceService.refreshSources(imdbid);
        res.send({
            'acknowledged': true
        });
    }
}