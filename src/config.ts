export default {
    mongoUri: process.env.MONGODB_URI || '',
    apiToken: process.env.MEDIA_CATALOG_API_TOKEN || '',
    urlResolverTimeout: parseInt(process.env.URL_RESOLVER_TIMEOUT || '25')
}