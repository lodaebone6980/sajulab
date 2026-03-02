import { google } from 'googleapis';
import { Readable } from 'stream';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Drive 환경변수가 설정되지 않았습니다. GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY를 설정해주세요.');
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  webContentLink: string;
}

export async function uploadPdfToDrive(
  pdfBuffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<DriveUploadResult> {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
    name: fileName,
    mimeType: 'application/pdf',
  };

  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (targetFolderId) {
    fileMetadata.parents = [targetFolderId];
  }

  const stream = new Readable();
  stream.push(pdfBuffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: 'application/pdf',
      body: stream,
    },
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = response.data.id!;

  // 링크 공유 설정 (링크가 있는 모든 사용자 조회 가능)
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    fileId,
    webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    webContentLink: response.data.webContentLink || `https://drive.google.com/uc?id=${fileId}&export=download`,
  };
}

export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}
