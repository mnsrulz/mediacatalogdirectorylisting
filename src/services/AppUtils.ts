export default class AppUtils {
    static parseContentLengthFromRangeHeader(headerValue: string | null): string | undefined {
        if (headerValue) {
            console.log(`parsing header value:${headerValue}`);
            return headerValue.split('/').pop();
        }
    }
}