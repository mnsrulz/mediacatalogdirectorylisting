
export interface FileNode {
    parent: string;
    id: string;
    title: string;
    documentId?: string;
    isDirectory: boolean;
    size?: number;
    lastModified?: Date;
}


