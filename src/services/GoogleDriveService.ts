import { google } from "googleapis";
const driveService = google.drive("v3");
const OAuth2 = google.auth.OAuth2;

export class GoogleDriveService {
    async uploadStream(stream: any, fileName: string, folderId: string, driveId: string, accessToken: string) {
        const createResponse = await driveService.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
                driveId: driveId
            },
            media: {
                body: stream
            },
            fields: "id",
            supportsTeamDrives: true,
            oauth_token: accessToken,
        });
    }
}
