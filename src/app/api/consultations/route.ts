import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Return empty list for now - consultations table not yet implemented
    return NextResponse.json({
      consultations: [],
      total: 0,
      stats: {
        total: 0,
        inProgress: 0,
        completed: 0,
        noShow: 0,
      },
    });
  } catch (error) {
    console.error('Consultations list error:', error);
    return NextResponse.json(
      { error: '상담 기록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}
