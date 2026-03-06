import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getOrderById, getPdfDir } from '@/lib/db/index';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: '유효하지 않은 주문 ID입니다.' },
        { status: 400 }
      );
    }

    // Verify order belongs to user
    const order = getOrderById(orderId, userId) as any;
    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Try to load local PDF file first (volume-aware path)
    const pdfPath = path.join(getPdfDir(), `${orderId}.pdf`);
    if (fs.existsSync(pdfPath)) {
      const pdfBuffer = fs.readFileSync(pdfPath);
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="order-${orderId}.pdf"`,
          'Cache-Control': 'no-cache, must-revalidate',
        },
      });
    }

    // Fallback to pdf_url from database
    if (order?.pdf_url) {
      return NextResponse.redirect(order.pdf_url);
    }

    return NextResponse.json(
      { error: 'PDF를 찾을 수 없습니다.' },
      { status: 404 }
    );
  } catch (error) {
    console.error('PDF retrieval error:', error);
    return NextResponse.json(
      { error: 'PDF를 가져올 수 없습니다.' },
      { status: 500 }
    );
  }
}
