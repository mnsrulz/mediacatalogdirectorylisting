import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

export const MediaSchema = new Schema({
    source: String,
    ts: Date,
    imdbInfo: {
        id: String,
        title: String,
        year: String
    },
    media_document: {
        webViewLink: String
    }
}, { collection: 'media_catalog' });

export const LinkSchema = new Schema({
    ts: Date,
    link: String,
    status: String,

    imdbInfo: {
        id: String,
        title: String,
        year: String
    }
}, { collection: 'linkstest' });

export const LinksCacheSchema = new Schema({
    ts: {
        type: Date,
        default: Date.now()
    },
    imdbId: String,
    parentLink: String,
    playableLink: String,
    status: String,
    lastUpdated: Date,
    title: String
}, { collection: 'links_cache' });