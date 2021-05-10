import * as mongoose from 'mongoose';
import { LinksCacheSchema } from "../models/mediaModel";

const LinksCacheList = mongoose.model('LinksCache', LinksCacheSchema);
export class LinksCacheService {

    async getById(documentId: string) {
        const linkInfo = await LinksCacheList.findById(documentId);
    }

    public async ListValidLinksFromCache(imdbId: string, size: number) {
        const potentialLinks = await LinksCacheList.find({
            size: size,
            imdbId: imdbId,
            status: 'Valid'
        }).sort({ speedRank: -1 });   //speedrank sort from high to low

        return potentialLinks.map((x: any) => {
            return {
                id: x._id,
                parentLink: x.parentLink,
                speedRank: x.speedRank
            } as MediaSource;
        });
    }
}


interface MediaSource {
    id: string,
    parentLink: string,
    speedRank: number    //higher the rank better the link is
}