import { parse } from 'url';
export default class AppUtils {
    static parseContentLengthFromRangeHeader(headerValue: string | null): number | undefined {
        if (headerValue) {
            return parseInt(headerValue.split('/').pop() || '0');
        }
    }

    static parseHostName(url: string) {
        const { hostname } = parse(url);
        return hostname;
    }
}