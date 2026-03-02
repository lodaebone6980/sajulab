import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { findUserById, getOrders, getOrderStats } from '@/lib/db/index';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  try {
    // Get user data for points
    const user = findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // Get order stats
    const { stats, todayCompleted, todayProcessing } = getOrderStats(userId);

    // Get all orders for recent orders list
    const allOrders = getOrders(userId) as any[];

    // Map status codes to Korean labels
    const statusMap: { [key: string]: string } = {
      pending: '대기',
      requested: '나가중',
      extracting: '처리중',
      analyzing: '처리중',
      pdf_generating: '처리중',
      processing: '처리중',
      completed: '완료',
      failed: '실패',
    };

    // Count orders by status for status bars
    const statusCounts = {
      pending: 0,
      requested: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const stat of stats) {
      if (stat.status === 'pending') statusCounts.pending = stat.count;
      else if (stat.status === 'requested') statusCounts.requested = stat.count;
      else if (['extracting', 'analyzing', 'pdf_generating', 'processing'].includes(stat.status)) {
        statusCounts.processing += stat.count;
      } else if (stat.status === 'completed') statusCounts.completed = stat.count;
      else if (stat.status === 'failed') statusCounts.failed = stat.count;
    }

    // Get total orders count
    const totalOrders = allOrders.length;

    // Map recent orders with Korean status labels
    const recentOrders = allOrders.slice(0, 10).map((order) => ({
      id: order.id,
      customerName: order.customer_name,
      product: order.product_name || order.product_code,
      status: statusMap[order.status] || order.status,
      statusKey: order.status,
      createdAt: new Date(order.created_at).toISOString().split('T')[0],
    }));

    return NextResponse.json({
      points: user.points,
      todayCompleted,
      processing: todayProcessing,
      totalOrders,
      statusCounts,
      recentOrders,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: '대시보드 데이터를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}
