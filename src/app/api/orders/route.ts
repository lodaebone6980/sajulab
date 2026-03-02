import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  createOrder,
  createCustomer,
  getOrders,
  getOrderById,
  getProducts,
  updateOrderStatus,
  updateOrderResult,
  getDb,
} from '@/lib/db/index';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { generateSajuPdf } from '@/lib/pdf/generator';
import { generateNarrative, generateFallbackNarrative } from '@/lib/ai';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const search = searchParams.get('search');
    const productId = searchParams.get('product');
    const status = searchParams.get('status');

    let allOrders = getOrders(userId) as any[];

    // Filter by period
    if (period && period !== 'all') {
      const now = new Date();
      let filterDate = new Date();

      switch (period) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          filterDate.setDate(filterDate.getDate() - 1);
          filterDate.setHours(0, 0, 0, 0);
          break;
        case '3days':
          filterDate.setDate(filterDate.getDate() - 3);
          filterDate.setHours(0, 0, 0, 0);
          break;
        case '7days':
          filterDate.setDate(filterDate.getDate() - 7);
          filterDate.setHours(0, 0, 0, 0);
          break;
        case '30days':
          filterDate.setDate(filterDate.getDate() - 30);
          filterDate.setHours(0, 0, 0, 0);
          break;
      }

      allOrders = allOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        if (period === 'today') {
          return orderDate.toDateString() === now.toDateString();
        } else if (period === 'yesterday') {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          return orderDate.toDateString() === yesterday.toDateString();
        } else {
          return orderDate >= filterDate;
        }
      });
    }

    // Filter by date range
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      allOrders = allOrders.filter(order => new Date(order.created_at) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      allOrders = allOrders.filter(order => new Date(order.created_at) <= to);
    }

    // Filter by search query
    if (search) {
      const query = search.toLowerCase();
      allOrders = allOrders.filter(order => {
        return (
          (order.customer_name && order.customer_name.toLowerCase().includes(query)) ||
          (order.phone && order.phone.includes(query)) ||
          (order.email && order.email.toLowerCase().includes(query)) ||
          (order.internal_memo && order.internal_memo.toLowerCase().includes(query))
        );
      });
    }

    // Filter by product
    if (productId) {
      allOrders = allOrders.filter(order => order.product_id.toString() === productId);
    }

    // Filter by status
    if (status && status !== 'all') {
      allOrders = allOrders.filter(order => order.status === status);
    }

    return NextResponse.json({
      orders: allOrders,
      total: allOrders.length,
    });
  } catch (error) {
    console.error('Orders list error:', error);
    return NextResponse.json(
      { error: '주문 목록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  try {
    const body = await request.json();
    const {
      customerName,
      birthDate,
      birthTime,
      gender,
      calendarType,
      productCode,
      phone = '',
      email = '',
      memo = '',
      extraAnswer = '',
      internalMemo = '',
    } = body;

    // Validate required fields
    if (!customerName || !birthDate || !gender || !productCode) {
      return NextResponse.json(
        { error: '필수 입력 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Get product by code
    const products = getProducts(userId) as any[];
    const product = products.find(p => p.code === productCode);
    if (!product) {
      return NextResponse.json(
        { error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Create customer
    const customerResult = createCustomer(userId, {
      name: customerName,
      gender,
      birth_date: birthDate,
      birth_time: birthTime || '',
      calendar_type: calendarType || 'solar',
      phone,
      email,
      memo,
    });

    const customerId = customerResult.lastInsertRowid as number;

    // Create order
    const orderResult = createOrder(userId, {
      customer_id: customerId,
      product_id: product.id,
      points_used: 0,
      extra_answer: extraAnswer,
      internal_memo: internalMemo,
    });

    const orderId = orderResult.lastInsertRowid as number;

    // Trigger analysis automatically
    try {
      // Mark as requested
      updateOrderStatus(orderId, userId, 'requested');

      // Perform analysis
      const birthDateParts = birthDate.split('-').map(Number);
      const birthTimeParts = (birthTime || '00:00').split(':').map(Number);

      const sajuResult = await analyzeSajuWithFortune({
        year: birthDateParts[0],
        month: birthDateParts[1],
        day: birthDateParts[2],
        hour: birthTimeParts[0],
        minute: birthTimeParts[1],
        gender: gender === 'male' ? 'male' : 'female',
        isLunar: calendarType === 'lunar' || calendarType === 'leap',
      });

      // Mark as analyzing
      updateOrderStatus(orderId, userId, 'analyzing');

      // Save result_json to database
      const resultJson = JSON.stringify(sajuResult);
      updateOrderResult(orderId, userId, resultJson);

      // Generate PDF (skip for saju-data product)
      if (product.code !== 'saju-data') {
        updateOrderStatus(orderId, userId, 'pdf_generating');

        // LLM 내러티브 생성 시도 (OpenAI API 키가 있으면)
        let narrative = await generateNarrative(sajuResult, customerName, product.code);

        // API 키 없으면 fallback 내러티브 사용
        if (!narrative) {
          narrative = generateFallbackNarrative(sajuResult, customerName, product.code);
        }

        const pdfBuffer = await generateSajuPdf(sajuResult, {
          customerName,
          productName: product.name,
          productCode: product.code,
          narrative,
        });

        // Save PDF to file
        const pdfDir = path.join(process.cwd(), 'data', 'pdfs');
        if (!fs.existsSync(pdfDir)) {
          fs.mkdirSync(pdfDir, { recursive: true });
        }
        const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
        fs.writeFileSync(pdfPath, pdfBuffer);

        // Save pdf_url
        const db = getDb();
        db.prepare('UPDATE orders SET pdf_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
          .run(`/api/orders/${orderId}/pdf`, orderId, userId);
      }

      // Mark as completed
      updateOrderStatus(orderId, userId, 'completed');
    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
      // Mark as failed but don't return error - order was created
      updateOrderStatus(orderId, userId, 'failed');
    }

    return NextResponse.json(
      {
        success: true,
        orderId,
        customerId,
        message: '주문이 생성되었습니다.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: '주문을 생성할 수 없습니다.' },
      { status: 500 }
    );
  }
}
