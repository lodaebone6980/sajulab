import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getConsultations, createConsultation, updateConsultation, deleteConsultations } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const rows = getConsultations(authResult.userId, { date, status, search }) as any[];

    // 통계 계산 (날짜 필터만 적용, 상태 필터 제외)
    const allForDate = date
      ? (getConsultations(authResult.userId, { date }) as any[])
      : rows;

    const stats = {
      total: allForDate.length,
      inProgress: allForDate.filter((r: any) => r.status === 'in_progress').length,
      completed: allForDate.filter((r: any) => r.status === 'completed').length,
      noShow: allForDate.filter((r: any) => r.status === 'no_show').length,
    };

    return NextResponse.json({ consultations: rows, total: rows.length, stats });
  } catch (error) {
    console.error('Consultations list error:', error);
    return NextResponse.json({ error: '상담 기록을 불러올 수 없습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const result = createConsultation(authResult.userId, body);
    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error: any) {
    console.error('Create consultation error:', error);
    return NextResponse.json({ error: `[v5] 상담 기록 생성 실패: ${error?.message || String(error)}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    updateConsultation(id, authResult.userId, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update consultation error:', error);
    return NextResponse.json({ error: '상담 기록 수정에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '삭제할 항목을 선택해주세요.' }, { status: 400 });
    }
    deleteConsultations(ids, authResult.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete consultation error:', error);
    return NextResponse.json({ error: '상담 기록 삭제에 실패했습니다.' }, { status: 500 });
  }
}
