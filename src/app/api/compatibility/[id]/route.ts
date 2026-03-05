import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  getCompatibilityResultById, updateCompatibilityResult, getCustomerById,
} from '@/lib/db/index';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { analyzeCompatibility } from '@/lib/saju/compatibility';
import type { CompatibilityResult } from '@/lib/saju/compatibility';

function formatCompatibilityText(
  result: CompatibilityResult,
  person1: any,
  person2: any,
  relationLabel: string,
): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════');
  lines.push('  궁합 분석 결과');
  lines.push('═══════════════════════════════════════');
  lines.push('');
  lines.push(`${person1.name} ↔ ${person2.name}`);
  if (relationLabel) lines.push(`관계: ${relationLabel}`);
  lines.push(`${person1.name}: ${person1.birth_date} ${person1.birth_time || ''} (${person1.gender === 'male' ? '남' : '여'})`);
  lines.push(`${person2.name}: ${person2.birth_date} ${person2.birth_time || ''} (${person2.gender === 'male' ? '남' : '여'})`);
  lines.push('');

  // 종합 점수
  lines.push('───────────────────────────────────────');
  lines.push(`종합 점수: ${result.totalScore}점 / 100점`);
  lines.push(`등급: ${result.grade}`);
  lines.push('───────────────────────────────────────');
  lines.push('');
  lines.push(result.summary);
  lines.push('');

  // 세부 항목
  lines.push('【 세부 항목 점수 】');
  lines.push('');
  for (const d of result.details) {
    const stars = '★'.repeat(Math.max(0, Math.round(d.score / d.maxScore * 5))) +
                  '☆'.repeat(Math.max(0, 5 - Math.round(d.score / d.maxScore * 5)));
    lines.push(`  ${d.category}`);
    lines.push(`  ${stars} (${d.score}/${d.maxScore}점)`);
    lines.push(`  ${d.description}`);
    lines.push('');
  }

  // 강점/약점
  if (result.strengths.length > 0) {
    lines.push('【 강점 】');
    result.strengths.forEach(s => lines.push(`  • ${s}`));
    lines.push('');
  }

  if (result.weaknesses.length > 0) {
    lines.push('【 주의할 점 】');
    result.weaknesses.forEach(w => lines.push(`  • ${w}`));
    lines.push('');
  }

  // 조언
  lines.push('【 종합 조언 】');
  lines.push(result.advice);
  lines.push('');
  lines.push('═══════════════════════════════════════');

  return lines.join('\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const resultId = parseInt(id, 10);

  const result = getCompatibilityResultById(resultId, auth.userId);
  if (!result) return NextResponse.json({ error: '결과를 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ result });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const resultId = parseInt(id, 10);

  const body = await request.json();

  if (body.action === 'analyze') {
    const cr = getCompatibilityResultById(resultId, auth.userId);
    if (!cr) return NextResponse.json({ error: '결과를 찾을 수 없습니다.' }, { status: 404 });

    try {
      updateCompatibilityResult(resultId, auth.userId, { status: 'analyzing' });

      const person1 = getCustomerById(cr.customer_id_1, auth.userId) as any;
      const person2 = getCustomerById(cr.customer_id_2, auth.userId) as any;

      if (!person1 || !person2) {
        updateCompatibilityResult(resultId, auth.userId, { status: 'failed' });
        return NextResponse.json({ error: '고객 데이터를 찾을 수 없습니다.' }, { status: 404 });
      }

      const parseBirth = (bd: string) => {
        if (bd.includes('-')) return bd.split('-').map(Number);
        if (bd.length === 8) return [parseInt(bd.slice(0,4)), parseInt(bd.slice(4,6)), parseInt(bd.slice(6,8))];
        return [1990, 1, 1];
      };

      const parseTime = (bt: string) => {
        if (!bt) return [12, 0];
        if (bt.includes(':')) return bt.split(':').map(Number);
        if (bt.length === 4) return [parseInt(bt.slice(0,2)), parseInt(bt.slice(2,4))];
        return [12, 0];
      };

      const [y1, m1, d1] = parseBirth(person1.birth_date);
      const [h1, mi1] = parseTime(person1.birth_time);
      const [y2, m2, d2] = parseBirth(person2.birth_date);
      const [h2, mi2] = parseTime(person2.birth_time);

      const saju1 = await analyzeSajuWithFortune({
        year: y1, month: m1, day: d1, hour: h1, minute: mi1,
        gender: person1.gender as 'male' | 'female',
        isLunar: person1.calendar_type === 'lunar' || person1.calendar_type === 'leap',
      });

      const saju2 = await analyzeSajuWithFortune({
        year: y2, month: m2, day: d2, hour: h2, minute: mi2,
        gender: person2.gender as 'male' | 'female',
        isLunar: person2.calendar_type === 'lunar' || person2.calendar_type === 'leap',
      });

      const compatResult = analyzeCompatibility(
        {
          fourPillars: saju1.fourPillars,
          elementDistribution: saju1.elementDistribution,
          yongSin: saju1.yongSin?.element || '목',
          giSin: saju1.giSin?.element || '목',
          birthInfo: saju1.birthInfo,
        },
        {
          fourPillars: saju2.fourPillars,
          elementDistribution: saju2.elementDistribution,
          yongSin: saju2.yongSin?.element || '목',
          giSin: saju2.giSin?.element || '목',
          birthInfo: saju2.birthInfo,
        },
      );

      const resultText = formatCompatibilityText(compatResult, person1, person2, cr.relation_label);

      updateCompatibilityResult(resultId, auth.userId, {
        score: compatResult.totalScore,
        grade: compatResult.grade,
        resultJson: JSON.stringify(compatResult),
        resultText,
        status: 'completed',
      });

      return NextResponse.json({
        message: '분석 완료',
        score: compatResult.totalScore,
        grade: compatResult.grade,
      });
    } catch (err: any) {
      console.error('Compatibility analysis error:', err);
      updateCompatibilityResult(resultId, auth.userId, { status: 'failed' });
      return NextResponse.json({ error: '분석 중 오류: ' + err.message }, { status: 500 });
    }
  }

  // 관계 라벨 수정
  if (body.relationLabel !== undefined) {
    updateCompatibilityResult(resultId, auth.userId, { status: body.status });
  }

  return NextResponse.json({ message: '업데이트 완료' });
}
