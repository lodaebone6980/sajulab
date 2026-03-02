import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './index';

export function getAuthUserId(request: NextRequest): number | null {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

export function requireAuth(request: NextRequest): { userId: number } | NextResponse {
  const userId = getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  return { userId };
}
