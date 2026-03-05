import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getOrdersWithQuestions, saveQuestionAnswer } from '@/lib/db/index';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || undefined;
    const questions = getOrdersWithQuestions(auth.userId, filter);
    return NextResponse.json({ questions, total: questions.length });
  } catch (error) {
    console.error('Questions GET error:', error);
    return NextResponse.json({ error: '추가질문 조회 실패' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { orderId, answer } = body;
    if (!orderId) return NextResponse.json({ error: '주문 ID가 필요합니다.' }, { status: 400 });

    saveQuestionAnswer(orderId, auth.userId, answer || '');
    return NextResponse.json({ message: '답변이 저장되었습니다.' });
  } catch (error) {
    console.error('Questions PATCH error:', error);
    return NextResponse.json({ error: '답변 저장 실패' }, { status: 500 });
  }
}
