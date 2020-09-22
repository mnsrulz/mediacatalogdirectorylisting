import { FileNode } from "../models/fileNode";
import fileNameParser, { filenameParse } from '@ctrl/video-filename-parser';

import path from 'path';
export class FileNameCleanerService {

    public CleanMovieTitle(fileNodes: FileNode[], normalizedMediaName: string, year: string) {
        fileNodes.forEach(x => {
            let cleanedTitle = x.title;
            let extensionOfTitle = path.extname(x.title).toLowerCase();
            //TODO: IN case of TV, parse season and episode numbers too.
            const knownExtensions = ['.mkv', '.mp4', '.m3u8'];
            if (knownExtensions.indexOf(extensionOfTitle) >= 0) {
                cleanedTitle = `${normalizedMediaName} (${year})-${x.documentId}${extensionOfTitle}`;
            } else {
                if (extensionOfTitle)
                    cleanedTitle = x.title.replace(/(\.[\w\d_-]+)$/i, `-${x.documentId}$1`);
                else
                    cleanedTitle = `${x.title}-${x.documentId}`;
            }
            x.id = cleanedTitle;
        });
    }

    public CleanTvTitle(fileNodes: FileNode[], normalizedMediaName: string, year: string) {
        function toTwoDigit(n: number): string {
            return n > 9 ? "" + n : "0" + n;
        }
        fileNodes.forEach(x => {
            let cleanedTitle = x.title;
            let extensionOfTitle = path.extname(x.title).toLowerCase();

            const knownExtensions = ['.mkv', '.mp4', '.m3u8'];
            if (knownExtensions.indexOf(extensionOfTitle) >= 0) {
                const parsedFileName = filenameParse(x.title, true);
                // console.log(parsedFileName);
                const seasonNumber = parsedFileName.seasons[0];
                const episodeNumber = parsedFileName.episodeNumbers[0];
                let mediaName = `${normalizedMediaName} (${year})`;
                if (seasonNumber > 0 && episodeNumber > 0) {
                    mediaName = `${mediaName} - S${toTwoDigit(seasonNumber)}E${toTwoDigit(episodeNumber)}`;
                } else {
                    console.log(`Unable to parse TV Season and episode info:`, parsedFileName);
                }

                cleanedTitle = `${mediaName} - ${x.documentId}${extensionOfTitle}`;
            } else {
                const parsedFileName = filenameParse(x.title, true);
                // console.log(parsedFileName);
                const seasonNumber = parsedFileName.seasons[0];
                const episodeNumber = parsedFileName.episodeNumbers[0];
                console.log(`${seasonNumber}:${episodeNumber}`);
                if (extensionOfTitle)
                    cleanedTitle = x.title.replace(/(\.[\w\d_-]+)$/i, `-${x.documentId}$1`);
                else
                    cleanedTitle = `${x.title}-${x.documentId}`;
            }
            x.id = cleanedTitle;
        });
    }
}