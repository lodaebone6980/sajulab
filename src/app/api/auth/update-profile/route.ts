import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { findUserById, getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;
    const body = await request.json();
    const { shop_name } = body;

    // Get current user
    const user = findUserById(userId);
    if (!user) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Update shop name in database
    const db = getDb();
    db.prepare('UPDATE users SET shop_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      shop_name || '',
      userId
    );

    return NextResponse.json(
      {
        message: '프로필이 업데이트되었습니다.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          shop_name: shop_name || '',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
