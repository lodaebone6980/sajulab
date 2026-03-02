import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getFortuneData, getNarrative, getOrderById } from '@/lib/db/index';

// GET /api/orders/[id]/data - 운세 데이터 10섹션 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;
  const { id } = await params;
  const orderId = parseInt(id, 10);

  try {
    // 주문 확인
    const order = getOrderById(orderId, userId);
    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 운세 데이터 조회
    const fortuneData = getFortuneData(orderId);
    if (!fortuneData) {
      return NextResponse.json({ error: '운세 데이터가 없습니다.' }, { status: 404 });
    }

    // 내러티브 조회
    const narrativeData = getNarrative(orderId);

    // 10섹션 파싱
    const sections = {
      info: JSON.parse(fortuneData.section_info || '{}'),
      pillar: JSON.parse(fortuneData.section_pillar || '{}'),
      yongsin: JSON.parse(fortuneData.section_yongsin || '{}'),
      yinyang: JSON.parse(fortuneData.section_yinyang || '{}'),
      shinsal: JSON.parse(fortuneData.section_shinsal || '{}'),
      hyungchung: JSON.parse(fortuneData.section_hyungchung || '{}'),
      daeun: JSON.parse(fortuneData.section_daeun || '{}'),
      nyunun: JSON.parse(fortuneData.section_nyunun || '{}'),
      wolun: JSON.parse(fortuneData.section_wolun || '{}'),
      wolun2: JSON.parse(fortuneData.section_wolun2 || '{}'),
    };

    return NextResponse.json({
      orderId,
      customerName: fortuneData.customer_name,
      totalLines: fortuneData.total_lines,
      createdAt: fortuneData.created_at,
      sections,
      narrative: narrativeData ? {
        productCode: narrativeData.product_code,
        greeting: narrativeData.greeting,
        chapters: JSON.parse(narrativeData.chapters_json || '[]'),
        model: narrativeData.model,
        tokenUsage: {
          prompt: narrativeData.prompt_tokens,
          completion: narrativeData.completion_tokens,
        },
        createdAt: narrativeData.created_at,
      } : null,
    });
  } catch (error) {
    console.error('Fortune data fetch error:', error);
    return NextResponse.json({ error: '데이터를 불러올 수 없습니다.' }, { status: 500 });
  }
}
