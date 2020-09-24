export default class AppUtils {
    static parseContentLengthFromRangeHeader(headerValue: string | null): number | undefined {
        if (headerValue) {
            return parseInt(headerValue.split('/').pop() || '0');
        }
    }
}