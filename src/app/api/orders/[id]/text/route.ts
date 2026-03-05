import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getOrderById, getNarrative, getFortuneData } from '@/lib/db/index';

/**
 * 주문의 분석 결과를 텍스트로 변환하여 반환
 * - 내러티브 (인사말 + 챕터별 내용)
 * - 사주 데이터 (10섹션)
 */
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

  const order = getOrderById(orderId, auth.userId) as any;
  if (!order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }

  const sections: string[] = [];

  // 기본 정보
  sections.push('═══════════════════════════════════════');
  sections.push(`📋 분석 보고서: ${order.customer_name}`);
  sections.push(`📦 상품: ${order.product_name} (${order.product_code})`);
  sections.push(`📅 생년월일: ${order.customer_birth_date} ${order.customer_birth_time || ''}`);
  sections.push(`🔄 음양력: ${order.customer_calendar_type === 'lunar' ? '음력' : order.customer_calendar_type === 'leap' ? '윤달' : '양력'}`);
  sections.push(`👤 성별: ${order.customer_gender === 'male' ? '남' : '여'}`);
  sections.push('═══════════════════════════════════════\n');

  // 내러티브 (AI 생성 분석 내용)
  const narrative = getNarrative(orderId);
  if (narrative) {
    sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    sections.push('📝 AI 분석 내러티브');
    sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (narrative.greeting) {
      sections.push('【 인사말 】');
      sections.push(narrative.greeting);
      sections.push('');
    }

    if (narrative.chapters_json) {
      try {
        const chapters = JSON.parse(narrative.chapters_json);
        if (Array.isArray(chapters)) {
          chapters.forEach((chapter: any, idx: number) => {
            sections.push(`【 ${chapter.title || `챕터 ${idx + 1}`} 】`);
            if (chapter.content) {
              sections.push(chapter.content);
            }
            if (chapter.sections && Array.isArray(chapter.sections)) {
              chapter.sections.forEach((sec: any) => {
                if (sec.title) sections.push(`\n▸ ${sec.title}`);
                if (sec.content) sections.push(sec.content);
              });
            }
            sections.push('');
          });
        }
      } catch (e) {
        sections.push('(내러티브 파싱 오류)');
      }
    }

    sections.push(`[모델: ${narrative.model || 'unknown'}, 토큰: ${narrative.prompt_tokens || 0}+${narrative.completion_tokens || 0}]\n`);
  }

  // 사주 원본 데이터 (10섹션)
  const fortune = getFortuneData(orderId);
  if (fortune) {
    sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    sections.push('📊 사주 원본 데이터 (1300줄)');
    sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const sectionNames = [
      { key: 'section_info', label: '기본 정보' },
      { key: 'section_pillar', label: '사주 기둥' },
      { key: 'section_yongsin', label: '용신' },
      { key: 'section_yinyang', label: '음양 오행' },
      { key: 'section_shinsal', label: '신살' },
      { key: 'section_hyungchung', label: '형충회합' },
      { key: 'section_daeun', label: '대운' },
      { key: 'section_nyunun', label: '년운' },
      { key: 'section_wolun', label: '월운 (상반기)' },
      { key: 'section_wolun2', label: '월운 (하반기)' },
    ];

    for (const sec of sectionNames) {
      const data = (fortune as any)[sec.key];
      if (data) {
        sections.push(`\n【 ${sec.label} 】`);
        try {
          const parsed = JSON.parse(data);
          if (typeof parsed === 'string') {
            sections.push(parsed);
          } else {
            sections.push(JSON.stringify(parsed, null, 2));
          }
        } catch {
          sections.push(data);
        }
      }
    }

    sections.push(`\n[총 줄수: ${fortune.total_lines || 0}줄]`);
  }

  // result_json (원본 사주 계산 결과)
  if (order.result_json) {
    sections.push('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    sections.push('🔢 사주 계산 원본 (result_json)');
    sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    try {
      const resultObj = JSON.parse(order.result_json);
      sections.push(JSON.stringify(resultObj, null, 2));
    } catch {
      sections.push(order.result_json);
    }
  }

  const fullText = sections.join('\n');

  // format=download 이면 텍스트 파일로 다운로드
  const { searchParams } = new URL(request.url);
  if (searchParams.get('format') === 'download') {
    return new NextResponse(fullText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${order.customer_name}_${order.product_code}_분석결과.txt"`,
      },
    });
  }

  return NextResponse.json({
    order_id: orderId,
    customer_name: order.customer_name,
    product_code: order.product_code,
    product_name: order.product_name,
    has_narrative: !!narrative,
    has_fortune_data: !!fortune,
    has_result_json: !!order.result_json,
    text: fullText,
    line_count: fullText.split('\n').length,
  });
}
