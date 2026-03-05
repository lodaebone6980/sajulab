import { NextRequest, NextResponse } from 'next/server';
import {
  createCustomer,
  createOrder,
  getProducts,
  updateOrderStatus,
  updateOrderResult,
  saveNarrative,
  saveFortuneData,
  findUserByEmail,
  getPdfDir,
  getDb,
} from '@/lib/db/index';
import { uploadPdfToUserDrive } from '@/lib/google-drive/upload-helper';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { convertSajuResultToSections, countTotalLines } from '@/lib/saju/fortune-data';
import { generateSajuPdf } from '@/lib/pdf/generator';
import { generateNarrative, generateFallbackNarrative } from '@/lib/ai';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  return handleSeed(request);
}

export async function POST(request: NextRequest) {
  return handleSeed(request);
}

// ─── 주문 1건씩 백그라운드 처리 ───
async function processOrder(
  orderId: number,
  userId: number,
  customerData: { name: string; gender: string; birthDate: string; birthTime: string; calendarType: string },
  product: { id: number; name: string; code: string },
  pdfDir: string,
) {
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

    // Save result_json
    const resultJson = JSON.stringify(sajuResult);
    updateOrderResult(orderId, userId, resultJson);

    // Save fortune data (10 sections)
    try {
      const sections = convertSajuResultToSections(sajuResult, customerData.name, customerData.gender, customerData.calendarType);
      const totalLines = countTotalLines(sections);
      saveFortuneData(orderId, customerData.name, JSON.stringify(sajuResult.birthInfo), {
        info: JSON.stringify(sections.info),
        pillar: JSON.stringify(sections.pillar),
        yongsin: JSON.stringify(sections.yongsin),
        yinyang: JSON.stringify(sections.yinyang),
        shinsal: JSON.stringify(sections.shinsal),
        hyungchung: JSON.stringify(sections.hyungchung),
        daeun: JSON.stringify(sections.daeun),
        nyunun: JSON.stringify(sections.nyunun),
        wolun: JSON.stringify(sections.wolun),
        wolun2: JSON.stringify(sections.wolun2),
      }, totalLines);
    } catch (fdError) {
      console.error(`[Seed] Fortune data save error for order ${orderId}:`, fdError);
    }

    // saju-data 상품은 PDF 생성 건너뛰기
    if (product.code === 'saju-data') {
      updateOrderStatus(orderId, userId, 'completed');
      console.log(`[Seed] ✅ Order ${orderId} completed (${customerData.name} - ${product.code}) [data-only]`);
      return;
    }

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
    updateOrderStatus(orderId, userId, 'pdf_generating');
    const pdfBuffer = await generateSajuPdf(sajuResult, {
      customerName: customerData.name,
      productName: product.name,
      productCode: product.code,
      narrative,
    });

    // Save PDF (use volume-aware path)
    const actualPdfDir = getPdfDir();
    const pdfPath = path.join(actualPdfDir, `${orderId}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Save pdf_url to DB
    const db = getDb();
    db.prepare('UPDATE orders SET pdf_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
      .run(`/api/orders/${orderId}/pdf`, orderId, userId);

    // Google Drive 업로드 (사용자 OAuth 토큰 사용)
    try {
      const fileName = `${customerData.name}_${product.code}_${orderId}.pdf`;
      await uploadPdfToUserDrive(pdfBuffer, fileName, userId, orderId);
    } catch (driveErr) {
      console.error(`[Drive] ❌ Upload failed for order ${orderId}:`, driveErr);
    }

    updateOrderStatus(orderId, userId, 'completed');
    console.log(`[Seed] ✅ Order ${orderId} completed (${customerData.name} - ${product.code})`);
  } catch (analysisError) {
    console.error(`[Seed] ❌ Order ${orderId} failed:`, analysisError);
    updateOrderStatus(orderId, userId, 'failed');
  }
}

async function handleSeed(_request: NextRequest) {
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

    // ── Phase 1: 즉시 고객 + 주문 생성 (동기, 빠름) ──
    const createdOrders: { orderId: number; customerData: typeof customers[0]; product: any }[] = [];
    const pdfDir = getPdfDir();

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

      for (const product of products) {
        const orderResult = createOrder(userId, {
          customer_id: customerId,
          product_id: product.id,
          points_used: product.price_points || 0,
          extra_answer: '',
          internal_memo: `Seed data for ${customerData.name} - ${product.name}`,
        });

        const orderId = orderResult.lastInsertRowid as number;
        createdOrders.push({ orderId, customerData, product });
      }
    }

    console.log(`[Seed] 📦 ${createdOrders.length}개 주문 생성 완료. 백그라운드 AI 분석 시작...`);

    // ── Phase 2: 백그라운드에서 AI 분석 + PDF 생성 (fire-and-forget) ──
    // 순차 처리 (OpenAI rate limit 방지)
    const backgroundProcess = async () => {
      for (const { orderId, customerData, product } of createdOrders) {
        await processOrder(orderId, userId, customerData, product, pdfDir);
      }
      console.log(`[Seed] 🎉 모든 ${createdOrders.length}개 주문 백그라운드 처리 완료!`);
    };

    // fire-and-forget: 즉시 응답, 백그라운드에서 처리
    backgroundProcess().catch(err => console.error('[Seed] Background processing error:', err));

    return NextResponse.json(
      {
        success: true,
        message: `시드 데이터 생성 시작: ${customers.length}명의 고객, ${createdOrders.length}개의 주문 (AI 분석은 백그라운드에서 진행 중)`,
        customers: customers.length,
        orders: createdOrders.length,
        orderIds: createdOrders.map(o => o.orderId),
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
