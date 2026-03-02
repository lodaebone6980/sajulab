import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getProducts } from '@/lib/db/index';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  try {
    const products = getProducts(userId);
    return NextResponse.json({
      products,
    });
  } catch (error) {
    console.error('Products list error:', error);
    return NextResponse.json(
      { error: '상품 목록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}
