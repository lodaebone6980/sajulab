import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getAuthUrl, isOAuthConfigured } from '@/lib/google-drive';

// GET: Google OAuth 인증 URL 리턴
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!isOAuthConfigured()) {
    return NextResponse.json(
      { error: 'Google OAuth2가 설정되지 않았습니다. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 환경변수를 설정해주세요.' },
      { status: 400 }
    );
  }

  try {
    // state에 userId 포함 (callback에서 사용)
    const state = JSON.stringify({ userId: auth.userId });
    const authUrl = getAuthUrl(state);
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('[Google Auth] URL generation failed:', error);
    return NextResponse.json(
      { error: `인증 URL 생성 실패: ${error.message}` },
      { status: 500 }
    );
  }
}
