import { LinksCacheList } from "./../models/mediaModel";
import { Request, Response } from 'express';
import { MediaSourceService } from './../services/MediaSourceService';
const mediaSourceService = new MediaSourceService();

export class LinkCacheController {
    public async getLinks(req: Request, res: Response) {
        var dbFilter: any = {};

        if (req.query.title) {
            dbFilter['title'] = { $regex: `.*${req.query.title}.*`, $options: "i" };
        }

        if (req.query.imdbId) {
            dbFilter['imdbId'] = { $regex: `.*${req.query.imdbId}.*`, $options: "i" };
        }

        if (req.query.parentLink) {
            dbFilter['parentLink'] = { $regex: `.*${req.query.parentLink}.*`, $options: "i" };
        }

        if (req.query.playableLink) {
            dbFilter['playableLink'] = { $regex: `.*${req.query.playableLink}.*`, $options: "i" };
        }

        var pageNo = parseInt(req.query.pageIndex?.toString() || '') || 1;
        var limit = parseInt(req.query.pageSize?.toString() || '') || 10;
        var skip = limit * (pageNo - 1);


        var countQuery = await LinksCacheList.find(dbFilter).countDocuments();
        var sortOrder = (req.query.sortOrder && req.query.sortOrder === 'desc' && 1) || -1;
        var sortField = req.query.sortField?.toString() || 'title';
        var sort: any = {};
        sort[sortField] = sortOrder;
        var dbresponse = await LinksCacheList.find(dbFilter)
            .sort(sort)
            .skip(skip).limit(limit).exec();

        res.json({
            results: dbresponse,
            count: countQuery
        });

    }

    public async refresh(req: Request, res: Response) {
        const documentId: string = req.params.documentId || "";
        if (documentId) {
            await mediaSourceService.Refresh(documentId);
            res.json({
                status: 'OK'
            });
        }
        else {
            res.status(400).send('documentId is missing');
        }
    }
}