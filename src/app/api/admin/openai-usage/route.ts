import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getTokenUsageStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  // 인증 확인 (로그인한 사용자만)
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const stats = getTokenUsageStats();

    return NextResponse.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error('[OpenAI Usage]', error);
    return NextResponse.json({ error: '사용량 조회 실패' }, { status: 500 });
  }
}
