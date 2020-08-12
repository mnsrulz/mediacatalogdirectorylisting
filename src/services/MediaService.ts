import * as mongoose from 'mongoose';
import { MediaSchema, LinksCacheSchema } from '../models/mediaModel';

const MediaList = mongoose.model('MediaCatalog', MediaSchema);

export class MediaService {

    public async getRoot(): Promise<FileNode[]> {
        const f: FileNode = {
            id: 'movie',
            parent: "",
            title: "movie",
            isDirectory: true,
            size: 0,
        };
        const tvNode: FileNode = {
            id: 'tv',
            parent: "",
            title: "tv",
            isDirectory: true,
            size: 0,
        };
        const result: FileNode[] = [f, tvNode];
        return result;
    }

    public async fetchMediaByYear(mediaType: string, year: any): Promise<FileNode[]> {
        console.log(`Year requested: ${year}`);
        async function listAllMoviesOfYear(year: any): Promise<FileNode[]> {
            var allMoviesGroupByYear: any[] = await MediaList.aggregate(
                [
                    { "$match": { "imdbInfo.year": `${year}`, "tmdbInfo.media": mediaType } },    //List only movies
                    { "$group": { _id: "$imdbInfo.id", title: { $max: "$tmdbInfo.title" } } },
                    { $sort: { title: 1 } },
                ],
            );

            return allMoviesGroupByYear.map((x) => {
                const title = decodeURI(encodeURI(x.title).replace("%C2%A0", "%20"));
                const f: FileNode = {
                    id: `${title}-${x._id}`,
                    parent: x._id,
                    title: title,
                    isDirectory: true,
                    size: 0,
                };
                return f;
            });
        }
        const result: FileNode[] = await listAllMoviesOfYear(year);
        return result;
    }

    public async fetchYearsByMediaType(): Promise<FileNode[]> {
        async function listYears(): Promise<FileNode[]> {
            var allMoviesGroupByYear: any[] = await MediaList.aggregate([
                {
                    "$match": { "imdbInfo": { $ne: null } },
                },
                { "$group": { _id: "$imdbInfo.year", count: { $sum: 1 } } },
                { $sort: { _id: -1 } },
            ]);
            return allMoviesGroupByYear.map((x: any) => {
                const f: FileNode = {
                    id: `${x._id}`,
                    parent: x._id,
                    title: x._id,
                    isDirectory: true,
                    size: 0,
                };
                return f;
            });
        }
        return await listYears();
    }
}

export interface FileNode {
    parent: string;
    id: string;
    title: string;
    isDirectory: boolean;
    size?: number;
}
