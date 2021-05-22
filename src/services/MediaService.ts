import * as mongoose from 'mongoose';
import { MediaSchema, LinksCacheSchema } from '../models/mediaModel';
import { FileNode } from '../models/fileNode';
import { getItems, MediaItemModel, getPlaylistItems } from './mediaCatalogApiClient';
import logger from "./Logger";

const MediaList = mongoose.model('MediaCatalog', MediaSchema);

const createRootDirecotry = (id: string) => {
    return {
        id: id,
        parent: "",
        title: id,
        isDirectory: true,
        size: 0,
    } as FileNode;
}

const mapMediaItemsToFileNode = (items: MediaItemModel[]) => {
    items.filter(x => !x.imdbId).forEach(x => {
        logger.warn(`item with title: "${x.title}" does not have an imdb attached to it. Skipping...`);
    });

    //clean up any items which doesn't have an imdbid
    return items.filter(x => x.imdbId).sort((a, b) => a.title.localeCompare(b.title)).map((x) => {
        //const title = decodeURI(encodeURI(x.title).replace("%C2%A0", "%20"));   //may be some conversion needed
        const f: FileNode = {
            id: `${x.title}-${x.year}-${x.imdbId}`,
            parent: x.id,
            //lastModified: x.lastModified,
            title: x.title,
            isDirectory: true,
            size: 0,
        };
        return f;
    });
}

export class MediaService {
    public async getRoot(): Promise<FileNode[]> {
        const movieNode = createRootDirecotry('movie');
        const tvNode = createRootDirecotry('tv');
        const plexMovieNode = createRootDirecotry('plexmovie');
        const plexTvNode = createRootDirecotry('plextv');
        const result: FileNode[] = [movieNode, tvNode, plexMovieNode, plexTvNode];
        return result;
    }

    public async fetchMediaByYear(mediaType: string, year: any): Promise<FileNode[]> {
        async function listAllMoviesOfYear(year: any): Promise<FileNode[]> {
            var allMoviesGroupByYear: any[] = await MediaList.aggregate(
                [
                    { "$match": { "imdbInfo.year": `${year}`, "tmdbInfo.media": mediaType } },    //List only movies
                    { "$group": { _id: "$imdbInfo.id", title: { $max: "$tmdbInfo.title" }, lastModified: { $max: "$media_document.modifiedTime" } } },
                    { $sort: { title: 1 } },
                ],
            );

            return allMoviesGroupByYear.map((x) => {
                const title = decodeURI(encodeURI(x.title).replace("%C2%A0", "%20"));
                const f: FileNode = {
                    id: `${title}-${x._id}`,
                    parent: x._id,
                    lastModified: x.lastModified,
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

    public async fetchMediaByYearNetlify(mediaType: 'movie' | 'tv', year: number): Promise<FileNode[]> {
        const items = await getItems(mediaType, year);
        return mapMediaItemsToFileNode(items);
    }

    public async fetchMediaPlexNetlify(mediaType: 'movie' | 'tv'): Promise<FileNode[]> {
        const items = await getPlaylistItems();
        return mapMediaItemsToFileNode(items.filter(x => x.itemType === mediaType));
    }

    public async fetchYearsByMediaType(): Promise<FileNode[]> {
        //can simplify by just returning last 50 years as array
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


