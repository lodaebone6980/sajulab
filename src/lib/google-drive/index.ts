import { google } from 'googleapis';
import { Readable } from 'stream';

// OAuth2 클라이언트 생성
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://sajulab-production.up.railway.app'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth2 환경변수가 설정되지 않았습니다. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET를 설정해주세요.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// OAuth2 인증 URL 생성
export function getAuthUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // 항상 refresh_token 받기
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: state || '',
  });
}

// authorization code로 토큰 교환
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  // 이메일 가져오기
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  return {
    access_token: tokens.access_token || '',
    refresh_token: tokens.refresh_token || '',
    expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : '',
    email: userInfo.data.email || '',
  };
}

// 사용자 토큰으로 인증된 Drive 클라이언트 가져오기
function getDriveClient(accessToken: string, refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

// access_token 갱신
export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expiry_date: string }> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return {
    access_token: credentials.access_token || '',
    expiry_date: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : '',
  };
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  webContentLink: string;
}

// 사용자 OAuth 토큰으로 Drive에 PDF 업로드
export async function uploadPdfToDriveOAuth(
  pdfBuffer: Buffer,
  fileName: string,
  accessToken: string,
  refreshToken: string,
  folderId?: string
): Promise<DriveUploadResult> {
  const drive = getDriveClient(accessToken, refreshToken);

  const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
    name: fileName,
    mimeType: 'application/pdf',
  };

  if (folderId) {
    fileMetadata.parents = [folderId];
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

// ====== 레거시: 서비스 계정 방식 (하위 호환) ======
function getServiceAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Drive 서비스 계정 환경변수가 설정되지 않았습니다.');
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

export async function uploadPdfToDrive(
  pdfBuffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<DriveUploadResult> {
  const auth = getServiceAuth();
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

// OAuth2 설정 여부 확인
export function isOAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// 서비스 계정 설정 여부 확인 (레거시)
export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

// 사용자가 Drive 연결했는지 확인 (토큰 유무)
export function isUserDriveConnected(googleRefreshToken: string): boolean {
  return !!googleRefreshToken;
}
