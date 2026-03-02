import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { findUserById, getDb } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;
    const body = await request.json();
    const { current_password, new_password } = body;

    // Validation
    if (!current_password || !new_password) {
      return NextResponse.json(
        { message: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { message: '새 비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // Get current user with password
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as {
      id: number;
      email: string;
      password: string;
      name: string;
      shop_name: string;
      points: number;
      role: string;
    } | undefined;

    if (!user) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValid = await verifyPassword(current_password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { message: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(new_password);
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      hashedPassword,
      userId
    );

    return NextResponse.json(
      { message: '비밀번호가 변경되었습니다.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
