import { Request, Response } from 'express';
import { ZipService } from '../services/ZipService';

export class GoogleDriveUploadController {
    public async upload(req: Request, res: Response) {
        res.end('hello');
    }
    public async status(req: Request, res: Response) {
        res.end('hello');
    }
}



