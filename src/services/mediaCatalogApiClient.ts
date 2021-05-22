import got from 'got';
import configs from '../config';

const authenticatedClient = got.extend({
    prefixUrl: 'https://mediacatalog.netlify.app/.netlify/functions/server',
    responseType: 'json',
    headers: {
        'Authorization': `Basic ${configs.apiToken}`
    }
});
export const getItems = async (mediaType: string, year: number) => {
    //show default 2000 items for now
    const items = await authenticatedClient<MediaItemModel[]>(`items?limit=2000&year=${year}&type=${mediaType}`, {
        resolveBodyOnly: true
    });
    return items;
}

export const getMediaSources = async (imdbId: string) => {
    const mediaItem = await authenticatedClient<MediaItemModel>(`items/byExternalId/${imdbId}?type=imdb`, {
        resolveBodyOnly: true
    });
    return await authenticatedClient<MediaSourceModel[]>(`items/${mediaItem.id}/mediasources`, {
        resolveBodyOnly: true
    });
}

export const getPlaylistItems = async () => {
    //playlists/6060ef70f862060008dd7383/items
    const response = await authenticatedClient<{
        items: MediaItemModel[]
    }>(`playlists/6060ef70f862060008dd7383/items`, {
        resolveBodyOnly: true
    });
    return response.items;
}

export interface MediaItemModel {
    id: string,
    title: string,
    year: number,
    imdbId: string,
    itemType: string
}

export interface MediaSourceModel {
    webViewLink: string
}