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
  updateOrderProgress,
  updateOrderDriveInfo,
  getPdfDir,
  getDb,
} from '@/lib/db/index';
import { uploadPdfToDrive, isDriveConfigured } from '@/lib/google-drive';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { convertSajuResultToSections, countTotalLines } from '@/lib/saju/fortune-data';
import { generateSajuPdf } from '@/lib/pdf/generator';
import { generateNarrative, generateFallbackNarrative } from '@/lib/ai';
import { saveFortuneData, saveNarrative } from '@/lib/db/index';
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

    // Mark as requested immediately
    updateOrderStatus(orderId, userId, 'requested');
    updateOrderProgress(orderId, userId, 1, '주문 접수 완료, 분석 대기중');

    // Background analysis (fire and forget - don't await)
    const runAnalysis = async () => {
      try {
        updateOrderProgress(orderId, userId, 3, '사주 데이터 분석 시작');

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
        updateOrderProgress(orderId, userId, 15, '사주 데이터 분석 완료');

        // Save result_json to database
        const resultJson = JSON.stringify(sajuResult);
        updateOrderResult(orderId, userId, resultJson);

        // 운세 데이터 10섹션 저장 (sajulab.kr 동일 구조)
        try {
          const sections = convertSajuResultToSections(sajuResult, customerName, gender, calendarType || 'solar');
          const totalLines = countTotalLines(sections);
          saveFortuneData(orderId, customerName, JSON.stringify(sajuResult.birthInfo), {
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
          console.error('Fortune data save error (non-fatal):', fdError);
        }

        // Generate PDF (skip for saju-data product)
        if (product.code !== 'saju-data') {
          updateOrderProgress(orderId, userId, 18, '내러티브 생성 준비');

          // 챕터별 진행률 콜백
          const onNarrativeProgress = (chapterNum: number, totalChapters: number, phase: string) => {
            try {
              if (phase === 'greeting_done') {
                updateOrderProgress(orderId, userId, 20, '인사말 생성 완료');
              } else if (phase === 'chapter_done') {
                const chapterProgress = Math.round(20 + (chapterNum / totalChapters) * 68);
                updateOrderProgress(orderId, userId, chapterProgress, `${chapterNum}/${totalChapters} 챕터 생성 완료`);
              }
            } catch (e) {
              console.error('Progress update error (non-fatal):', e);
            }
          };

          // LLM 내러티브 생성 시도 (OpenAI API 키가 있으면)
          let narrative = await generateNarrative(sajuResult, customerName, product.code, onNarrativeProgress);

          // API 키 없으면 fallback 내러티브 사용
          if (!narrative) {
            narrative = generateFallbackNarrative(sajuResult, customerName, product.code);
          }

          // LLM 내러티브 DB 캐시 저장
          if (narrative) {
            try {
              saveNarrative(orderId, product.code, {
                greeting: narrative.greeting,
                chapters: JSON.stringify(narrative.chapters),
                model: narrative.model || 'fallback',
                promptTokens: narrative.tokenUsage?.input || 0,
                completionTokens: narrative.tokenUsage?.output || 0,
              });
            } catch (nErr) {
              console.error('Narrative save error (non-fatal):', nErr);
            }
          }

          updateOrderStatus(orderId, userId, 'pdf_generating');
          updateOrderProgress(orderId, userId, 90, 'PDF 파일 생성중');

          const pdfBuffer = await generateSajuPdf(sajuResult, {
            customerName,
            productName: product.name,
            productCode: product.code,
            narrative,
          });

          // Save PDF to file
          const pdfDir = getPdfDir();
          const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
          fs.writeFileSync(pdfPath, pdfBuffer);

          // Save pdf_url
          const db = getDb();
          db.prepare('UPDATE orders SET pdf_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
            .run(`/api/orders/${orderId}/pdf`, orderId, userId);

          updateOrderProgress(orderId, userId, 95, 'PDF 저장 완료');

          // Google Drive 업로드
          if (isDriveConfigured()) {
            try {
              updateOrderProgress(orderId, userId, 97, 'Google Drive 업로드중');
              const driveFileName = `${customerName}_${product.code}_${orderId}.pdf`;
              const driveResult = await uploadPdfToDrive(pdfBuffer, driveFileName);
              updateOrderDriveInfo(orderId, userId, driveResult.fileId, driveResult.webViewLink);
              console.log(`[Drive] ✅ Order ${orderId} uploaded: ${driveResult.webViewLink}`);
            } catch (driveErr) {
              console.error(`[Drive] ❌ Upload failed for order ${orderId}:`, driveErr);
            }
          }

          updateOrderProgress(orderId, userId, 99, '처리 완료');
        }

        // Mark as completed
        updateOrderStatus(orderId, userId, 'completed');
        console.log(`[Order] ✅ Order ${orderId} analysis completed`);
      } catch (analysisError) {
        console.error(`[Order] ❌ Analysis error for order ${orderId}:`, analysisError);
        updateOrderStatus(orderId, userId, 'failed');
      }
    };

    // Fire background analysis (don't await - respond immediately)
    runAnalysis().catch(err => console.error('[Order] Background analysis fatal error:', err));

    return NextResponse.json(
      {
        success: true,
        orderId,
        customerId,
        message: '주문이 생성되었습니다. 분석이 백그라운드에서 진행됩니다.',
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
