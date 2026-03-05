import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { isOAuthConfigured, uploadPdfToDriveOAuth, refreshAccessToken } from '@/lib/google-drive';
import { getUserGoogleTokens, updateUserGoogleTokens, clearUserGoogleTokens } from '@/lib/db';

// GET: Drive 연결 상태 확인
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const oauthConfigured = isOAuthConfigured();
  const tokens = getUserGoogleTokens(auth.userId);
  const userConnected = !!(tokens?.google_refresh_token);

  return NextResponse.json({
    oauthConfigured,
    configured: userConnected,
    driveEmail: tokens?.google_drive_email || '',
    folderId: tokens?.google_drive_folder_id || '',
  });
}

// POST: Drive 연결 테스트
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const tokens = getUserGoogleTokens(auth.userId);
  if (!tokens?.google_refresh_token) {
    return NextResponse.json(
      { error: 'Google Drive가 연결되지 않았습니다. 먼저 연결해주세요.' },
      { status: 400 }
    );
  }

  try {
    // 토큰 갱신
    let accessToken = tokens.google_access_token;
    const isExpired = !tokens.google_token_expiry || new Date(tokens.google_token_expiry) < new Date();

    if (isExpired) {
      const refreshed = await refreshAccessToken(tokens.google_refresh_token);
      accessToken = refreshed.access_token;
      updateUserGoogleTokens(auth.userId, {
        refresh_token: tokens.google_refresh_token,
        access_token: refreshed.access_token,
        token_expiry: refreshed.expiry_date,
        drive_email: tokens.google_drive_email,
      });
    }

    // 테스트 파일 업로드
    const testContent = Buffer.from('%PDF-1.4 sajulab drive test file');
    const result = await uploadPdfToDriveOAuth(
      testContent,
      `sajulab_test_${Date.now()}.pdf`,
      accessToken,
      tokens.google_refresh_token,
      tokens.google_drive_folder_id || undefined
    );

    // 테스트 파일 삭제 시도
    try {
      const { google: gapis } = require('googleapis');
      const { OAuth2 } = gapis.auth;
      const oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: tokens.google_refresh_token,
      });
      const drive = gapis.drive({ version: 'v3', auth: oauth2Client });
      await drive.files.delete({ fileId: result.fileId });
    } catch { /* 삭제 실패해도 테스트 성공 */ }

    return NextResponse.json({
      success: true,
      message: 'Google Drive 연동 테스트 성공! PDF 업로드가 정상 작동합니다.',
    });
  } catch (error: any) {
    console.error('[Drive Test] Error:', error);

    // refresh token 만료 시 재연결 필요
    if (error.message?.includes('invalid_grant') || error.code === 401) {
      clearUserGoogleTokens(auth.userId);
      return NextResponse.json(
        { error: 'Google Drive 인증이 만료되었습니다. 다시 연결해주세요.', needReconnect: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: `연동 테스트 실패: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE: Drive 연결 해제
export async function DELETE(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  clearUserGoogleTokens(auth.userId);
  return NextResponse.json({ message: 'Google Drive 연결이 해제되었습니다.' });
}
