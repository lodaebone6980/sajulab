import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  getCompatibilityResultById, updateCompatibilityResult, getCustomerById,
} from '@/lib/db/index';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { analyzeCompatibility } from '@/lib/saju/compatibility';
import type { CompatibilityResult } from '@/lib/saju/compatibility';
import type { SajuResult } from '@/lib/saju/types';

// ── 궁합 중심 서술 텍스트 생성 ──

function elName(el: string): string {
  const m: Record<string, string> = { '목': '나무(木)', '화': '불(火)', '토': '흙(土)', '금': '쇠(金)', '수': '물(水)' };
  return m[el] || el;
}

function genderStr(g: string): string { return g === 'male' ? '남' : '여'; }
function calStr(c: string): string { return c === 'lunar' ? '음력' : c === 'leap' ? '윤달' : '양력'; }

function gradeNarrative(score: number, p1: string, p2: string): string {
  if (score >= 85)
    return `두 분의 사주를 종합적으로 살펴보았을 때, 서로의 기운이 자연스럽게 맞물리는 매우 좋은 궁합입니다. ${p1}님과 ${p2}님은 함께 있을 때 서로의 부족한 부분을 채워주고, 시너지를 내는 관계라 할 수 있습니다.`;
  if (score >= 70)
    return `전체적으로 보면 ${p1}님과 ${p2}님의 궁합은 양호한 편입니다. 서로 보완해주는 요소가 많고, 갈등 요소는 상대적으로 적은 구성입니다. 약간의 배려만 더한다면 오래도록 좋은 관계를 유지할 수 있습니다.`;
  if (score >= 50)
    return `${p1}님과 ${p2}님의 궁합은 보통 수준입니다. 특별히 크게 좋거나 나쁜 점이 두드러지지는 않으며, 두 분이 어떻게 관계를 풀어가느냐에 따라 결과가 달라지는 구성입니다.`;
  if (score >= 30)
    return `솔직히 말씀드리면, ${p1}님과 ${p2}님의 사주 구성은 서로 부딪히는 부분이 있습니다. 그러나 궁합이란 운명이 아니라 참고 자료입니다. 서로의 차이를 이해하고 노력한다면 충분히 좋은 관계를 만들어갈 수 있습니다.`;
  return `${p1}님과 ${p2}님의 사주에는 상극의 기운이 다소 강하게 작용합니다. 서로의 에너지가 충돌하는 부분이 있어 갈등이 생기기 쉬운 구조이지만, 이를 알고 대비한다면 오히려 성장의 기회가 될 수 있습니다.`;
}

// 세부 항목별로 궁합을 줄글로 풀어서 서술
function detailNarrative(d: { category: string; score: number; maxScore: number; description: string; rating: string }, p1: string, p2: string): string {
  const cat = d.category;
  const desc = d.description;

  if (d.rating === 'excellent') {
    return `${cat} 부분은 두 분에게 큰 강점입니다. ${desc} 이 부분에서 ${p1}님과 ${p2}님은 서로에게 매우 긍정적인 영향을 주고받는 관계입니다.`;
  } else if (d.rating === 'good') {
    return `${cat} 측면에서 두 분은 괜찮은 조합을 이루고 있습니다. ${desc} 큰 문제 없이 안정적인 흐름을 기대할 수 있습니다.`;
  } else if (d.rating === 'neutral') {
    return `${cat}에서는 특별히 좋거나 나쁜 점 없이 무난한 편입니다. ${desc}`;
  } else if (d.rating === 'caution') {
    return `${cat} 부분은 조금 신경 써야 합니다. ${desc} 이 부분에서 갈등이 생길 수 있으니, 서로 한 발짝 양보하는 자세가 도움이 됩니다.`;
  } else {
    return `${cat}은 두 분 사이에서 주의가 필요한 영역입니다. ${desc} 이 부분을 미리 인지하고 있으면 불필요한 충돌을 줄일 수 있습니다.`;
  }
}

function formatCompatibilityText(
  result: CompatibilityResult,
  person1: any,
  person2: any,
  relationLabel: string,
  saju1: SajuResult,
  saju2: SajuResult,
): string {
  const p1 = person1.name;
  const p2 = person2.name;
  const L: string[] = [];

  // ── 1. 도입부 ──
  L.push(`${p1}님과 ${p2}님의 궁합 분석 결과입니다.`);
  if (relationLabel) L.push(`관계: ${relationLabel}`);
  L.push(`${p1}님(${person1.birth_date}, ${calStr(person1.calendar_type)}, ${genderStr(person1.gender)}) / ${p2}님(${person2.birth_date}, ${calStr(person2.calendar_type)}, ${genderStr(person2.gender)})`);
  L.push('');

  // ── 2. 종합 점수 ──
  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push(`■ 궁합 종합`);
  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push('');
  L.push(`두 분의 궁합은 100점 만점 기준 ${result.totalScore}점입니다.`);
  L.push(`등급: ${result.grade}`);
  L.push('');
  L.push(gradeNarrative(result.totalScore, p1, p2));
  L.push('');

  // ── 3. 두 사람의 사주 구성 (간략) ──
  const ds1Ko = saju1.fourPillars.day.heavenlyStemKo;
  const ds2Ko = saju2.fourPillars.day.heavenlyStemKo;
  const de1Ko = saju1.fourPillars.day.elementKo;
  const de2Ko = saju2.fourPillars.day.elementKo;

  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push(`■ 사주 구성 비교`);
  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push('');
  L.push(`${p1}님의 일간은 ${ds1Ko}(${saju1.fourPillars.day.heavenlyStem})으로 ${elName(de1Ko)}의 기운이며, ${p2}님의 일간은 ${ds2Ko}(${saju2.fourPillars.day.heavenlyStem})으로 ${elName(de2Ko)}의 기운입니다.`);
  L.push('');

  // 오행 분포
  const ed1 = saju1.elementDistribution;
  const ed2 = saju2.elementDistribution;
  L.push(`오행 분포로 보면, ${p1}님은 목${ed1.wood} · 화${ed1.fire} · 토${ed1.earth} · 금${ed1.metal} · 수${ed1.water}이고, ${p2}님은 목${ed2.wood} · 화${ed2.fire} · 토${ed2.earth} · 금${ed2.metal} · 수${ed2.water}입니다.`);
  L.push('');

  // 용신/기신 궁합 관계
  const yong1 = String(saju1.yongSin?.element || saju1.yongSin || '목');
  const yong2 = String(saju2.yongSin?.element || saju2.yongSin || '목');
  const gi1 = String(saju1.giSin?.element || saju1.giSin || '목');
  const gi2 = String(saju2.giSin?.element || saju2.giSin || '목');

  L.push(`용신(필요한 기운)을 기준으로 보면, ${p1}님의 용신은 ${elName(yong1)}, ${p2}님의 용신은 ${elName(yong2)}입니다.`);

  // 용신 보완 관계를 궁합 관점에서 서술
  if (de2Ko === yong1 && de1Ko === yong2) {
    L.push(`두 분의 타고난 기운이 서로의 용신과 일치합니다. 이는 상대가 존재하는 것만으로도 내게 이로운 기운을 가져다주는, 매우 이상적인 궁합 구조입니다.`);
  } else if (de2Ko === yong1) {
    L.push(`${p2}님의 기운이 ${p1}님의 용신과 일치하여, ${p1}님 입장에서 ${p2}님은 큰 도움이 되는 존재입니다.`);
  } else if (de1Ko === yong2) {
    L.push(`${p1}님의 기운이 ${p2}님의 용신과 일치하여, ${p2}님 입장에서 ${p1}님은 든든한 존재가 됩니다.`);
  }

  if (de2Ko === gi1) {
    L.push(`다만 ${p2}님의 기운이 ${p1}님의 기신(부담이 되는 기운)과 겹치는 면이 있어, ${p1}님이 무의식적으로 피로감을 느낄 수 있습니다.`);
  }
  if (de1Ko === gi2) {
    L.push(`또한 ${p1}님의 기운이 ${p2}님의 기신과 겹치는 면이 있어, ${p2}님에게 부담을 줄 수 있는 부분입니다.`);
  }
  L.push('');

  // ── 4. 세부 궁합 항목 (줄글 서술) ──
  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push(`■ 세부 궁합 분석`);
  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push('');

  for (const d of result.details) {
    L.push(`▸ ${d.category} [${d.score}/${d.maxScore}점]`);
    L.push(detailNarrative(d, p1, p2));
    L.push('');
  }

  // ── 5. 궁합의 강점 (줄글) ──
  const hasRealStrengths = result.strengths.length > 0 && result.strengths[0] !== '특별히 두드러지는 장점은 없으나 무난한 관계입니다';
  if (hasRealStrengths) {
    L.push(`━━━━━━━━━━━━━━━━━━━━`);
    L.push(`■ 두 분의 궁합이 좋은 부분`);
    L.push(`━━━━━━━━━━━━━━━━━━━━`);
    L.push('');
    L.push(`두 분의 사주를 함께 놓고 보면, 다음과 같은 점들이 긍정적으로 작용합니다.`);
    L.push('');
    for (const s of result.strengths) {
      L.push(`· ${s}`);
    }
    L.push('');
    L.push(`이러한 강점들은 두 분이 함께할 때 자연스럽게 드러나는 시너지입니다. 어려운 시기에도 이 부분들이 관계를 지탱해주는 힘이 됩니다.`);
    L.push('');
  }

  // ── 6. 주의할 점 (줄글) ──
  const hasRealWeaknesses = result.weaknesses.length > 0 && result.weaknesses[0] !== '특별히 큰 약점은 없습니다';
  if (hasRealWeaknesses) {
    L.push(`━━━━━━━━━━━━━━━━━━━━`);
    L.push(`■ 두 분 사이에서 주의할 부분`);
    L.push(`━━━━━━━━━━━━━━━━━━━━`);
    L.push('');
    L.push(`반면, 다음과 같은 부분에서는 갈등이 생기기 쉬우니 참고하시기 바랍니다.`);
    L.push('');
    for (const w of result.weaknesses) {
      L.push(`· ${w}`);
    }
    L.push('');
    L.push(`이러한 점들은 미리 알고 있으면 불필요한 다툼을 줄일 수 있습니다. 상대의 입장에서 한 번 더 생각하는 습관이 큰 도움이 됩니다.`);
    L.push('');
  }

  // ── 7. 관계에서의 오행 에너지 흐름 ──
  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push(`■ 관계 속 오행 에너지 흐름`);
  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push('');

  // 오행 보완도 분석
  const elNames: [string, number, number][] = [
    ['목(木)', ed1.wood, ed2.wood],
    ['화(火)', ed1.fire, ed2.fire],
    ['토(土)', ed1.earth, ed2.earth],
    ['금(金)', ed1.metal, ed2.metal],
    ['수(水)', ed1.water, ed2.water],
  ];

  const complementary: string[] = [];
  const conflicting: string[] = [];

  for (const [name, v1, v2] of elNames) {
    if (v1 <= 1 && v2 >= 3) {
      complementary.push(`${p1}님에게 부족한 ${name} 기운을 ${p2}님이 보완해줍니다`);
    } else if (v2 <= 1 && v1 >= 3) {
      complementary.push(`${p2}님에게 부족한 ${name} 기운을 ${p1}님이 보완해줍니다`);
    }
    if (v1 >= 4 && v2 >= 4) {
      conflicting.push(`두 분 모두 ${name} 기운이 강해서, 같은 방향으로 과하게 쏠릴 수 있습니다`);
    }
  }

  if (complementary.length > 0) {
    L.push(`오행 에너지 측면에서, 두 분은 서로 부족한 부분을 채워주는 관계입니다.`);
    for (const c of complementary) L.push(`· ${c}`);
    L.push('');
  }
  if (conflicting.length > 0) {
    L.push(`다만 주의할 점도 있습니다.`);
    for (const c of conflicting) L.push(`· ${c}`);
    L.push(`이런 경우 한쪽이 의식적으로 균형을 잡아주는 역할을 하면 좋습니다.`);
    L.push('');
  }
  if (complementary.length === 0 && conflicting.length === 0) {
    L.push(`오행 분포에서 특별히 강하게 보완하거나 충돌하는 부분은 없으며, 무난한 에너지 조합입니다.`);
    L.push('');
  }

  // ── 8. 종합 조언 ──
  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push(`■ 종합 조언`);
  L.push(`━━━━━━━━━━━━━━━━━━━━`);
  L.push('');
  L.push(result.advice);
  L.push('');

  // 성격적 궁합 코멘트 (personality 기반으로 두 사람 관계에 대한 코멘트)
  if (saju1.fortune?.personality && saju2.fortune?.personality) {
    L.push(`성격적으로 살펴보면, ${p1}님은 ${ds1Ko}${de1Ko} 일간으로 ${saju1.fortune.personality.slice(0, 50).replace(/[.。].*/, '.')} 반면 ${p2}님은 ${ds2Ko}${de2Ko} 일간으로 ${saju2.fortune.personality.slice(0, 50).replace(/[.。].*/, '.')} 이러한 성향의 차이를 이해하고 존중하는 것이 건강한 관계의 기본입니다.`);
    L.push('');
  }

  // 행운 정보
  const lc1 = saju1.fortune?.luckyColor;
  const lc2 = saju2.fortune?.luckyColor;
  if (lc1 && lc2) {
    L.push(`참고로 ${p1}님의 행운 색상은 ${lc1}, ${p2}님은 ${lc2}입니다. 함께 있을 때 서로의 행운 색상을 활용해보시면 좋겠습니다.`);
  }

  const ld1 = saju1.fortune?.luckyDirection;
  const ld2 = saju2.fortune?.luckyDirection;
  if (ld1 && ld2) {
    L.push(`행운의 방위는 ${p1}님이 ${ld1}, ${p2}님이 ${ld2}입니다.`);
  }
  L.push('');

  L.push(`이상 ${p1}님과 ${p2}님의 궁합 분석을 마칩니다.`);

  return L.join('\n');
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

      const resultText = formatCompatibilityText(compatResult, person1, person2, cr.relation_label, saju1, saju2);

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
