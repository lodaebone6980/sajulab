import { NextRequest, NextResponse } from 'next/server';
import {
  createCustomer,
  createOrder,
  getProducts,
  updateOrderStatus,
  saveNarrative,
  findUserByEmail,
} from '@/lib/db/index';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { generateSajuPdf } from '@/lib/pdf/generator';
import { generateNarrative, generateFallbackNarrative } from '@/lib/ai';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    // Get the first user (admin or test user)
    const adminUser = findUserByEmail('admin@sajulab.kr');
    if (!adminUser) {
      return NextResponse.json(
        { error: '관리자 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const userId = adminUser.id;

    // Get products
    const products = getProducts(userId) as any[];
    if (products.length === 0) {
      return NextResponse.json(
        { error: '상품이 없습니다. 먼저 상품을 등록하세요.' },
        { status: 400 }
      );
    }

    // Sample customer data
    const customers = [
      {
        name: '홍길동',
        gender: 'male',
        birthDate: '1990-01-05',
        birthTime: '10:30',
        calendarType: 'solar',
        phone: '010-1234-5678',
        email: 'hong@example.com',
        memo: '홍길동 테스트',
      },
      {
        name: '석현주',
        gender: 'female',
        birthDate: '1986-03-28',
        birthTime: '14:15',
        calendarType: 'solar',
        phone: '010-2345-6789',
        email: 'seok@example.com',
        memo: '석현주 테스트',
      },
      {
        name: '이재호',
        gender: 'male',
        birthDate: '1995-02-03',
        birthTime: '01:04',
        calendarType: 'solar',
        phone: '010-3456-7890',
        email: 'lee@example.com',
        memo: '이재호 테스트',
      },
    ];

    // Create customers and orders
    const createdOrders = [];
    const pdfDir = path.join(process.cwd(), 'data', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    for (const customerData of customers) {
      const customerResult = createCustomer(userId, {
        name: customerData.name,
        gender: customerData.gender,
        birth_date: customerData.birthDate,
        birth_time: customerData.birthTime,
        calendar_type: customerData.calendarType,
        phone: customerData.phone,
        email: customerData.email,
        memo: customerData.memo,
      });

      const customerId = customerResult.lastInsertRowid as number;

      // Create order for each product
      for (const product of products) {
        const orderResult = createOrder(userId, {
          customer_id: customerId,
          product_id: product.id,
          points_used: product.price_points || 0,
          extra_answer: '',
          internal_memo: `Seed data for ${customerData.name} - ${product.name}`,
        });

        const orderId = orderResult.lastInsertRowid as number;
        createdOrders.push(orderId);

        // Perform analysis
        try {
          updateOrderStatus(orderId, userId, 'requested');

          const birthDateParts = customerData.birthDate.split('-').map(Number);
          const birthTimeParts = customerData.birthTime.split(':').map(Number);

          const sajuResult = await analyzeSajuWithFortune({
            year: birthDateParts[0],
            month: birthDateParts[1],
            day: birthDateParts[2],
            hour: birthTimeParts[0],
            minute: birthTimeParts[1],
            gender: customerData.gender === 'male' ? 'male' : 'female',
            isLunar: customerData.calendarType === 'lunar' || customerData.calendarType === 'leap',
          });

          updateOrderStatus(orderId, userId, 'analyzing');

          // Generate AI narrative (or fallback)
          let narrative = await generateNarrative(sajuResult, customerData.name, product.code);
          if (!narrative) {
            narrative = generateFallbackNarrative(sajuResult, customerData.name, product.code);
          }

          // Save narrative to DB
          if (narrative) {
            try {
              saveNarrative(orderId, product.code, {
                greeting: narrative.greeting,
                chapters: JSON.stringify(narrative.chapters),
                model: narrative.model || 'fallback',
                promptTokens: narrative.tokenUsage?.input || 0,
                completionTokens: narrative.tokenUsage?.output || 0,
              });
            } catch (e) {
              console.warn(`[Seed] Narrative save warning for order ${orderId}:`, e);
            }
          }

          // Generate PDF with narrative
          const pdfBuffer = await generateSajuPdf(sajuResult, {
            customerName: customerData.name,
            productName: product.name,
            productCode: product.code,
            narrative,
          });

          // Save PDF
          const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
          fs.writeFileSync(pdfPath, pdfBuffer);

          updateOrderStatus(orderId, userId, 'completed');
        } catch (analysisError) {
          console.error(`Analysis error for order ${orderId}:`, analysisError);
          updateOrderStatus(orderId, userId, 'failed');
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `시드 데이터 생성 완료: ${customers.length}명의 고객, ${createdOrders.length}개의 주문`,
        customers: customers.length,
        orders: createdOrders.length,
        orderIds: createdOrders,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: '시드 데이터 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
