import * as mongoose from 'mongoose';
import { LinksCacheSchema } from "../models/mediaModel";

const LinksCacheList = mongoose.model('LinksCache', LinksCacheSchema);
export class LinksCacheService {

    async getById(documentId:string) {
        const linkInfo = await LinksCacheList.findById(documentId);
    }

}