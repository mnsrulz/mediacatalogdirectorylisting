import { Request, Response } from 'express';
import { ZipService } from '../services/ZipService';
const zipService = new ZipService();

export class ZipFileController {
    public async listFiles(req: Request, res: Response) {
        const { zipFileUrl } = req.query || '';
        if (zipFileUrl) {
            const allFiles = await zipService.listFiles(zipFileUrl.toString());
            res.json(allFiles);
        }
        else {
            res.status(400).send('zipFileUrl is missing');
        }
    }
}
