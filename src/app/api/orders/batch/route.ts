import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getOrderById, updateOrderStatus, updateOrderResult, updateOrderProgress, updateOrderDriveInfo, saveFortuneData, saveNarrative, getDb } from '@/lib/db/index';
import { uploadPdfToDrive, isDriveConfigured } from '@/lib/google-drive';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { convertSajuResultToSections, countTotalLines } from '@/lib/saju/fortune-data';
import { generateSajuPdf } from '@/lib/pdf/generator';
import { generateNarrative, generateFallbackNarrative } from '@/lib/ai';
import path from 'path';
import fs from 'fs';

// 단일 주문 처리 (백그라운드)
async function processOneOrder(orderId: number, userId: number) {
  const order = getOrderById(orderId, userId) as any;
  if (!order) throw new Error(`Order ${orderId} not found`);

  // pending/failed/requested만 처리
  if (!['pending', 'failed', 'requested'].includes(order.status)) {
    console.log(`[Batch] Skip order ${orderId} (status: ${order.status})`);
    return;
  }

  updateOrderStatus(orderId, userId, 'requested');

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

  updateOrderStatus(orderId, userId, 'analyzing');
  updateOrderProgress(orderId, userId, 5, '사주 데이터 분석 시작');

  const sajuResult = await analyzeSajuWithFortune({
    year, month, day, hour, minute,
    gender: order.customer_gender as 'male' | 'female',
    isLunar: order.customer_calendar_type === 'lunar' || order.customer_calendar_type === 'leap',
  });

  updateOrderProgress(orderId, userId, 15, '사주 데이터 분석 완료');

  const resultJson = JSON.stringify(sajuResult);
  updateOrderResult(orderId, userId, resultJson);

  // 운세 데이터 저장
  try {
    const sections = convertSajuResultToSections(sajuResult, order.customer_name, order.customer_gender, order.customer_calendar_type);
    const totalLines = countTotalLines(sections);
    saveFortuneData(orderId, order.customer_name, JSON.stringify(sajuResult.birthInfo), {
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
  } catch (e) {
    console.error(`[Batch] Fortune data save error for order ${orderId}:`, e);
  }

  // PDF 생성 (saju-data 상품 제외)
  if (order.product_code !== 'saju-data') {
    updateOrderProgress(orderId, userId, 18, '내러티브 생성 준비');

    // 챕터별 진행률 콜백
    const onNarrativeProgress = (chapterNum: number, totalChapters: number, phase: string) => {
      if (phase === 'greeting_done') {
        updateOrderProgress(orderId, userId, 20, '인사말 생성 완료');
      } else if (phase === 'chapter_done') {
        const chapterProgress = Math.round(20 + (chapterNum / totalChapters) * 68);
        updateOrderProgress(orderId, userId, chapterProgress, `${chapterNum}/${totalChapters} 챕터 생성 완료`);
      }
    };

    let narrative = await generateNarrative(sajuResult, order.customer_name, order.product_code, onNarrativeProgress);
    if (!narrative) {
      narrative = generateFallbackNarrative(sajuResult, order.customer_name, order.product_code);
    }

    if (narrative) {
      try {
        saveNarrative(orderId, order.product_code, {
          greeting: narrative.greeting,
          chapters: JSON.stringify(narrative.chapters),
          model: narrative.model || 'fallback',
          promptTokens: narrative.tokenUsage?.input || 0,
          completionTokens: narrative.tokenUsage?.output || 0,
        });
      } catch (nErr) {
        console.error(`[Batch] Narrative save error for order ${orderId}:`, nErr);
      }
    }

    updateOrderStatus(orderId, userId, 'pdf_generating');
    updateOrderProgress(orderId, userId, 90, 'PDF 파일 생성중');

    const pdfBuffer = await generateSajuPdf(sajuResult, {
      customerName: order.customer_name,
      productName: order.product_name,
      productCode: order.product_code,
      narrative,
    });

    const pdfDir = path.join(process.cwd(), 'data', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    fs.writeFileSync(path.join(pdfDir, `${orderId}.pdf`), pdfBuffer);

    const db = getDb();
    db.prepare('UPDATE orders SET pdf_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
      .run(`/api/orders/${orderId}/pdf`, orderId, userId);

    updateOrderProgress(orderId, userId, 95, 'PDF 저장 완료');

    // Google Drive 업로드
    if (isDriveConfigured()) {
      try {
        updateOrderProgress(orderId, userId, 97, 'Google Drive 업로드중');
        const fileName = `${order.customer_name}_${order.product_code}_${orderId}.pdf`;
        const driveResult = await uploadPdfToDrive(pdfBuffer, fileName);
        updateOrderDriveInfo(orderId, userId, driveResult.fileId, driveResult.webViewLink);
        console.log(`[Drive] ✅ Order ${orderId} uploaded: ${driveResult.webViewLink}`);
      } catch (driveErr) {
        console.error(`[Drive] ❌ Upload failed for order ${orderId}:`, driveErr);
      }
    }

    updateOrderProgress(orderId, userId, 99, '처리 완료');
  }

  updateOrderStatus(orderId, userId, 'completed');
  console.log(`[Batch] Order ${orderId} completed (${order.customer_name} - ${order.product_code})`);
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { orderIds } = await request.json();

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: '처리할 주문을 선택해주세요.' }, { status: 400 });
    }

    const userId = auth.userId;

    // 즉시 상태를 'requested'로 변경 (UI 즉시 반영)
    for (const id of orderIds) {
      try {
        const order = getOrderById(id, userId) as any;
        if (order && ['pending', 'failed', 'requested'].includes(order.status)) {
          updateOrderStatus(id, userId, 'requested');
        }
      } catch (e) {
        // skip
      }
    }

    // 백그라운드 순차 처리 (fire-and-forget)
    const bgProcess = async () => {
      for (const id of orderIds) {
        try {
          await processOneOrder(id, userId);
        } catch (err) {
          console.error(`[Batch] Order ${id} failed:`, err);
          try { updateOrderStatus(id, userId, 'failed'); } catch (_) {}
        }
      }
      console.log(`[Batch] All ${orderIds.length} orders processed`);
    };

    bgProcess().catch(err => console.error('[Batch] Background error:', err));

    return NextResponse.json({
      success: true,
      message: `${orderIds.length}개 주문 처리가 시작되었습니다.`,
      orderIds,
    });
  } catch (error) {
    console.error('Batch process error:', error);
    return NextResponse.json({ error: '일괄 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
