import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getOrderById, updateOrderStatus } from '@/lib/db/index';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: '잘못된 주문 ID입니다.' }, { status: 400 });
  }

  const order = getOrderById(orderId, auth.userId);
  if (!order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: '잘못된 주문 ID입니다.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (status) {
      updateOrderStatus(orderId, auth.userId, status);
    }

    const updatedOrder = getOrderById(orderId, auth.userId);
    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ error: '주문 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
