import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getOrderById, updateOrderStatus, updateOrderResult, updateOrderProgress, updateCustomer, getPdfDir, getDb, saveFortuneData, saveNarrative, getNarrative } from '@/lib/db/index';
import { uploadPdfToUserDrive } from '@/lib/google-drive/upload-helper';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { convertSajuResultToSections, countTotalLines } from '@/lib/saju/fortune-data';
import { generateSajuPdf } from '@/lib/pdf/generator';
import { generateNarrative, generateFallbackNarrative } from '@/lib/ai';
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

    // 재분석 (비동기 fire-and-forget)
    if (action === 'reanalyze') {
      // 즉시 상태를 analyzing으로 바꾸고 응답 반환
      updateOrderStatus(orderId, auth.userId, 'analyzing');
      updateOrderProgress(orderId, auth.userId, 5, '재분석 시작');

      const userId = auth.userId;
      runReanalysis(orderId, userId).catch(err => {
        console.error(`[Reanalyze] Order ${orderId} failed:`, err);
        try { updateOrderStatus(orderId, userId, 'failed'); } catch (_) {}
      });

      return NextResponse.json({ message: '재분석이 시작되었습니다.' });
    }

    // PDF만 재생성 (DB에 캐시된 내러티브 사용, LLM 호출 없음)
    if (action === 'regenerate_pdf') {
      const order = getOrderById(orderId, auth.userId) as any;
      if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });

      try {
        updateOrderStatus(orderId, auth.userId, 'pdf_generating');
        updateOrderProgress(orderId, auth.userId, 50, 'PDF 재생성 시작 (캐시된 내러티브 사용)');

        // DB에서 저장된 내러티브 로드
        const cachedNarrative = getNarrative(orderId);
        if (!cachedNarrative || !cachedNarrative.chapters_json) {
          updateOrderStatus(orderId, auth.userId, 'failed');
          return NextResponse.json({ error: '저장된 내러티브가 없습니다. 재분석을 먼저 실행하세요.' }, { status: 400 });
        }

        // 사주 결과 로드
        if (!order.result) {
          updateOrderStatus(orderId, auth.userId, 'failed');
          return NextResponse.json({ error: '저장된 분석 결과가 없습니다.' }, { status: 400 });
        }

        const sajuResult = JSON.parse(order.result);
        const narrative = {
          greeting: cachedNarrative.greeting,
          chapters: JSON.parse(cachedNarrative.chapters_json),
          model: cachedNarrative.model,
        };

        updateOrderProgress(orderId, auth.userId, 70, 'PDF 파일 생성중');

        const pdfBuffer = await generateSajuPdf(sajuResult, {
          customerName: order.customer_name,
          productName: order.product_name,
          productCode: order.product_code,
          narrative,
        });

        const pdfDir = getPdfDir();
        fs.writeFileSync(path.join(pdfDir, `${orderId}.pdf`), pdfBuffer);

        const db = getDb();
        db.prepare('UPDATE orders SET pdf_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
          .run(`/api/orders/${orderId}/pdf`, orderId, auth.userId);

        updateOrderProgress(orderId, auth.userId, 100, 'PDF 재생성 완료');
        updateOrderStatus(orderId, auth.userId, 'completed');

        return NextResponse.json({ message: 'PDF가 재생성되었습니다.' });
      } catch (error) {
        console.error('PDF regeneration failed:', error);
        updateOrderStatus(orderId, auth.userId, 'failed');
        return NextResponse.json({ error: 'PDF 재생성에 실패했습니다.' }, { status: 500 });
      }
    }

    // 상태 변경
    if (body.status) {
      updateOrderStatus(orderId, auth.userId, body.status);

      // 'requested' 상태로 변경 시 → 백그라운드에서 분석 자동 시작
      if (body.status === 'requested') {
        const userId = auth.userId;
        const bgAnalysis = async () => {
          try {
            console.log(`[AutoAnalyze] Starting analysis for order ${orderId}`);
            await runReanalysis(orderId, userId);
            console.log(`[AutoAnalyze] Order ${orderId} completed`);
          } catch (err) {
            console.error(`[AutoAnalyze] Order ${orderId} failed:`, err);
            try { updateOrderStatus(orderId, userId, 'failed'); } catch (_) {}
          }
        };
        bgAnalysis().catch(err => console.error('[AutoAnalyze] Background error:', err));
      }
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
    updateOrderProgress(orderId, userId, 5, '사주 데이터 분석 시작');

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

    updateOrderProgress(orderId, userId, 15, '사주 데이터 분석 완료');

    // Save result
    const resultJson = JSON.stringify(sajuResult);
    updateOrderResult(orderId, userId, resultJson);

    // 운세 데이터 10섹션 저장
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
    } catch (fdError) {
      console.error('Fortune data save error (non-fatal):', fdError);
    }

    // Generate PDF (skip for saju-data product)
    if (order.product_code !== 'saju-data') {
      updateOrderProgress(orderId, userId, 18, '내러티브 생성 준비');

      // 챕터별 진행률 콜백
      const onNarrativeProgress = (chapterNum: number, totalChapters: number, phase: string) => {
        if (phase === 'greeting_done') {
          updateOrderProgress(orderId, userId, 20, '인사말 생성 완료');
        } else if (phase === 'chapter_done') {
          // 챕터 진행: 20% ~ 88% 범위 (68% / totalChapters per chapter)
          const chapterProgress = Math.round(20 + (chapterNum / totalChapters) * 68);
          updateOrderProgress(orderId, userId, chapterProgress, `${chapterNum}/${totalChapters} 챕터 생성 완료`);
        }
      };

      // LLM 내러티브 생성
      let narrative = await generateNarrative(sajuResult, order.customer_name, order.product_code, onNarrativeProgress);
      if (!narrative) {
        narrative = generateFallbackNarrative(sajuResult, order.customer_name, order.product_code);
      }

      // LLM 내러티브 DB 캐시 저장
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
          console.error('Narrative save error (non-fatal):', nErr);
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

      const pdfDir = getPdfDir();
      fs.writeFileSync(path.join(pdfDir, `${orderId}.pdf`), pdfBuffer);

      const db = getDb();
      db.prepare('UPDATE orders SET pdf_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
        .run(`/api/orders/${orderId}/pdf`, orderId, userId);

      updateOrderProgress(orderId, userId, 95, 'PDF 저장 완료');

      // Google Drive 업로드 (사용자 OAuth 토큰 사용)
      try {
        updateOrderProgress(orderId, userId, 97, 'Google Drive 업로드중');
        const fileName = `${order.customer_name}_${order.product_code}_${orderId}.pdf`;
        await uploadPdfToUserDrive(pdfBuffer, fileName, userId, orderId);
      } catch (driveErr) {
        console.error(`[Drive] ❌ Upload failed for order ${orderId}:`, driveErr);
      }

      updateOrderProgress(orderId, userId, 99, '처리 완료');
    }

    updateOrderStatus(orderId, userId, 'completed');
    return NextResponse.json({ message: '재분석이 완료되었습니다.' });
  } catch (error) {
    console.error('Reanalysis failed:', error);
    updateOrderStatus(orderId, userId, 'failed');
    return NextResponse.json({ error: '재분석에 실패했습니다.' }, { status: 500 });
  }
}
