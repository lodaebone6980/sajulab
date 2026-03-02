import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getOrderById, updateOrderStatus, updateOrderResult, updateCustomer, getDb } from '@/lib/db/index';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { generateSajuPdf } from '@/lib/pdf/generator';
import path from 'path';
import fs from 'fs';

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
    const { action } = body;

    // 고객정보 수정
    if (action === 'update_customer') {
      const order = getOrderById(orderId, auth.userId) as any;
      if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });

      updateCustomer(order.customer_id, auth.userId, {
        name: body.customerName,
        gender: body.customerGender,
        birth_date: body.customerBirthDate,
        birth_time: body.customerBirthTime,
        calendar_type: body.customerCalendarType,
        phone: body.customerPhone,
        email: body.customerEmail,
      });

      return NextResponse.json({ message: '고객 정보가 수정되었습니다.' });
    }

    // 추가답변 저장
    if (action === 'update_extra_answer') {
      const db = getDb();
      db.prepare('UPDATE orders SET extra_answer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
        .run(body.extraAnswer || '', orderId, auth.userId);
      return NextResponse.json({ message: '추가답변이 저장되었습니다.' });
    }

    // 재분석
    if (action === 'reanalyze') {
      return await runReanalysis(orderId, auth.userId);
    }

    // 단순 상태 변경
    if (body.status) {
      updateOrderStatus(orderId, auth.userId, body.status);
    }

    const updatedOrder = getOrderById(orderId, auth.userId);
    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ error: '주문 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 재분석 (기존 주문에 대해 다시 분석 + PDF 생성)
async function runReanalysis(orderId: number, userId: number) {
  const order = getOrderById(orderId, userId) as any;
  if (!order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }

  try {
    updateOrderStatus(orderId, userId, 'analyzing');

    const birthDate = order.customer_birth_date || '';
    const birthTime = order.customer_birth_time || '';

    let year: number, month: number, day: number;
    if (birthDate.includes('-')) {
      [year, month, day] = birthDate.split('-').map(Number);
    } else if (birthDate.length === 8) {
      year = parseInt(birthDate.slice(0, 4));
      month = parseInt(birthDate.slice(4, 6));
      day = parseInt(birthDate.slice(6, 8));
    } else {
      throw new Error('Invalid birth date format');
    }

    let hour = 12, minute = 0;
    if (birthTime.includes(':')) {
      [hour, minute] = birthTime.split(':').map(Number);
    } else if (birthTime.length === 4) {
      hour = parseInt(birthTime.slice(0, 2));
      minute = parseInt(birthTime.slice(2, 4));
    }

    const sajuResult = await analyzeSajuWithFortune({
      year, month, day, hour, minute,
      gender: order.customer_gender as 'male' | 'female',
      isLunar: order.customer_calendar_type === 'lunar' || order.customer_calendar_type === 'leap',
    });

    // Save result
    const resultJson = JSON.stringify(sajuResult);
    updateOrderResult(orderId, userId, resultJson);

    // Generate PDF (skip for saju-data product)
    if (order.product_code !== 'saju-data') {
      updateOrderStatus(orderId, userId, 'pdf_generating');

      const pdfBuffer = await generateSajuPdf(sajuResult, {
        customerName: order.customer_name,
        productName: order.product_name,
        productCode: order.product_code,
      });

      const pdfDir = path.join(process.cwd(), 'data', 'pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      fs.writeFileSync(path.join(pdfDir, `${orderId}.pdf`), pdfBuffer);

      const db = getDb();
      db.prepare('UPDATE orders SET pdf_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
        .run(`/api/orders/${orderId}/pdf`, orderId, userId);
    }

    updateOrderStatus(orderId, userId, 'completed');
    return NextResponse.json({ message: '재분석이 완료되었습니다.' });
  } catch (error) {
    console.error('Reanalysis failed:', error);
    updateOrderStatus(orderId, userId, 'failed');
    return NextResponse.json({ error: '재분석에 실패했습니다.' }, { status: 500 });
  }
}
