import { MediaSourceService } from '../services/MediaSourceService';
const mediaSourceService = new MediaSourceService();

export class JobsController {

    public async refresh(req: Request, res: Response) {

        //use to refresh the imdb sources

        // const result: FileNode[] = await mediaService.fetchYearsByMediaType();
        // const output = await ejs.renderFile(viewFile, {
        //     title: req.url,
        //     data: result,
        // })
        // res.end(output);
    }



}