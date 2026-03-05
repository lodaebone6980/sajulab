import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-drive';
import { updateUserGoogleTokens } from '@/lib/db';

// Google OAuth2 콜백 처리
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 에러 처리
  if (error) {
    console.error('[Google Callback] Error:', error);
    return NextResponse.redirect(new URL('/settings?drive_error=' + encodeURIComponent('Google 인증이 취소되었습니다.'), request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?drive_error=' + encodeURIComponent('인증 코드가 없습니다.'), request.url));
  }

  // state에서 userId 추출
  let userId: number;
  try {
    const parsed = JSON.parse(state || '{}');
    userId = parsed.userId;
    if (!userId) throw new Error('userId not found');
  } catch {
    return NextResponse.redirect(new URL('/settings?drive_error=' + encodeURIComponent('잘못된 인증 요청입니다.'), request.url));
  }

  try {
    // authorization code → tokens 교환
    const tokens = await exchangeCodeForTokens(code);

    // DB에 토큰 저장
    updateUserGoogleTokens(userId, {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      token_expiry: tokens.expiry_date,
      drive_email: tokens.email,
    });

    console.log(`[Google Callback] User ${userId} connected Drive: ${tokens.email}`);
    return NextResponse.redirect(new URL('/settings?drive_success=true', request.url));
  } catch (err: any) {
    console.error('[Google Callback] Token exchange failed:', err);
    return NextResponse.redirect(new URL('/settings?drive_error=' + encodeURIComponent(`토큰 교환 실패: ${err.message}`), request.url));
  }
}
