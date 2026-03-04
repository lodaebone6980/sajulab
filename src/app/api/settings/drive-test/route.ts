import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { isDriveConfigured, uploadPdfToDrive } from '@/lib/google-drive';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Drive 설정 상태 반환
  return NextResponse.json({
    configured: isDriveConfigured(),
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: 'Google Drive 환경변수가 설정되지 않았습니다.' },
      { status: 400 }
    );
  }

  try {
    // 테스트 PDF 업로드
    const testContent = Buffer.from('%PDF-1.4 test file from sajulab drive integration test');
    const result = await uploadPdfToDrive(testContent, `sajulab_test_${Date.now()}.pdf`);

    // 테스트 파일 삭제
    try {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const jwtAuth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/drive.file'] });
      const drive = google.drive({ version: 'v3', auth: jwtAuth });
      await drive.files.delete({ fileId: result.fileId });
    } catch {
      // 삭제 실패해도 테스트 자체는 성공
    }

    return NextResponse.json({
      success: true,
      message: 'Google Drive 연동 테스트 성공!',
      fileId: result.fileId,
      webViewLink: result.webViewLink,
    });
  } catch (error: any) {
    console.error('[Drive Test] Error:', error);
    return NextResponse.json(
      { error: `연동 테스트 실패: ${error.message}` },
      { status: 500 }
    );
  }
}
