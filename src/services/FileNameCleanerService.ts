import { FileNode } from "../models/fileNode";

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
}