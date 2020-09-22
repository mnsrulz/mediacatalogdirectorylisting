import { MediaSourceService } from '../services/MediaSourceService';
import { Request, Response } from 'express';
const mediaSourceService = new MediaSourceService();

export class JobsController {

    public async refreshSources(req: Request, res: Response) {
        const medianame: string = req.params.medianame || "";
        const imdbId = medianame.substr(medianame.lastIndexOf("-") + 1).trim();
        await mediaSourceService.refreshSources(imdbId);
        res.send({
            'acknowledged': true
        });
    }
}