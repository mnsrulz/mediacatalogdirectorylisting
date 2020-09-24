
export interface FileNode {
    parent: string;
    id: string;
    title: string;
    documentId?: string;
    isDirectory: boolean;
    size?: number;
    lastModified?: Date;
    imdbId?: string;
    lastUpdated?: Date;
    status?: string;
    ts?: Date;
    headers?: Object;
    playableLink?: string;
}


