import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  getCompatibilityResultById, updateCompatibilityResult, getCustomerById,
} from '@/lib/db/index';
import { analyzeSajuWithFortune } from '@/lib/saju';
import { analyzeCompatibility } from '@/lib/saju/compatibility';
import type { CompatibilityResult } from '@/lib/saju/compatibility';
import type { SajuResult } from '@/lib/saju/types';

// ── 구어체 궁합 텍스트 생성 ──

function getElementKoName(el: string): string {
  const map: Record<string, string> = { '목': '나무(木)', '화': '불(火)', '토': '흙(土)', '금': '쇠(金)', '수': '물(水)' };
  return map[el] || el;
}

function getGenderLabel(g: string): string {
  return g === 'male' ? '남성' : '여성';
}

function getCalendarLabel(c: string): string {
  if (c === 'lunar') return '음력';
  if (c === 'leap') return '윤달';
  return '양력';
}

function getScoreEmoji(score: number): string {
  if (score >= 85) return '💕';
  if (score >= 70) return '😊';
  if (score >= 50) return '🤝';
  if (score >= 30) return '💪';
  return '⚡';
}

function getGradeComment(score: number): string {
  if (score >= 85) return '정말 좋은 인연이에요! 하늘이 맺어준 인연이라 해도 과언이 아닐 정도입니다.';
  if (score >= 70) return '꽤 잘 맞는 궁합이에요. 서로에게 좋은 영향을 주는 관계입니다.';
  if (score >= 50) return '나쁘지 않은 궁합이에요. 서로 조금만 신경 쓰면 충분히 좋은 관계를 이어갈 수 있습니다.';
  if (score >= 30) return '솔직히 쉽지는 않은 궁합이에요. 하지만 노력한다면 충분히 극복할 수 있습니다.';
  return '상극의 기운이 좀 강한 편이에요. 서로를 이해하려는 마음이 무엇보다 중요합니다.';
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
  const lines: string[] = [];

  // ── 인사 & 기본 정보 ──
  lines.push(`안녕하세요, ${p1}님과 ${p2}님의 궁합 분석 결과를 알려드릴게요.`);
  lines.push('');

  if (relationLabel) {
    lines.push(`두 분의 관계는 "${relationLabel}"(으)로 등록되어 있네요.`);
  }

  lines.push(`${p1}님은 ${person1.birth_date} ${getCalendarLabel(person1.calendar_type)} 출생 ${getGenderLabel(person1.gender)}이시고, ${p2}님은 ${person2.birth_date} ${getCalendarLabel(person2.calendar_type)} 출생 ${getGenderLabel(person2.gender)}이십니다.`);
  lines.push('');

  // ── 두 사람의 사주 성격 ──
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✦ 두 분의 타고난 기질`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push('');

  const dayStem1Ko = saju1.fourPillars.day.heavenlyStemKo;
  const dayStem2Ko = saju2.fourPillars.day.heavenlyStemKo;
  const dayEl1Ko = saju1.fourPillars.day.elementKo;
  const dayEl2Ko = saju2.fourPillars.day.elementKo;

  lines.push(`먼저 ${p1}님부터 볼게요. ${p1}님의 일간은 ${dayStem1Ko}(${saju1.fourPillars.day.heavenlyStem}), ${getElementKoName(dayEl1Ko)}의 기운을 타고나셨어요.`);
  if (saju1.fortune?.personality) {
    lines.push(`${saju1.fortune.personality}`);
  }
  lines.push('');

  lines.push(`다음은 ${p2}님이에요. ${p2}님의 일간은 ${dayStem2Ko}(${saju2.fourPillars.day.heavenlyStem}), ${getElementKoName(dayEl2Ko)}의 기운이에요.`);
  if (saju2.fortune?.personality) {
    lines.push(`${saju2.fortune.personality}`);
  }
  lines.push('');

  // ── 오행 분포 비교 ──
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✦ 오행 에너지 비교`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push('');

  const ed1 = saju1.elementDistribution;
  const ed2 = saju2.elementDistribution;

  lines.push(`${p1}님의 오행 분포를 보면, 목(${ed1.wood}) · 화(${ed1.fire}) · 토(${ed1.earth}) · 금(${ed1.metal}) · 수(${ed1.water})로 구성되어 있고요,`);
  lines.push(`${p2}님은 목(${ed2.wood}) · 화(${ed2.fire}) · 토(${ed2.earth}) · 금(${ed2.metal}) · 수(${ed2.water})의 분포를 보입니다.`);
  lines.push('');

  // 오행 보완 관계 서술
  const yong1 = saju1.yongSin?.element || saju1.yongSin || '목';
  const yong2 = saju2.yongSin?.element || saju2.yongSin || '목';
  const gi1 = saju1.giSin?.element || saju1.giSin || '목';
  const gi2 = saju2.giSin?.element || saju2.giSin || '목';

  lines.push(`${p1}님에게 필요한 기운(용신)은 ${getElementKoName(String(yong1))}이고, 피해야 할 기운(기신)은 ${getElementKoName(String(gi1))}이에요.`);
  lines.push(`${p2}님에게 필요한 기운(용신)은 ${getElementKoName(String(yong2))}이고, 피해야 할 기운(기신)은 ${getElementKoName(String(gi2))}이고요.`);
  lines.push('');

  // 서로 보완 여부 체크
  if (String(dayEl2Ko) === String(yong1)) {
    lines.push(`재미있는 건, ${p2}님의 타고난 기운이 바로 ${p1}님이 필요로 하는 용신 오행이라는 거예요. 그러니까 ${p2}님이 옆에 있는 것만으로도 ${p1}님에게 좋은 기운이 된다는 뜻이죠.`);
  }
  if (String(dayEl1Ko) === String(yong2)) {
    lines.push(`반대로 ${p1}님의 기운도 ${p2}님에게 필요한 용신과 같아서, 서로가 서로에게 좋은 영향을 주는 관계예요.`);
  }
  if (String(dayEl2Ko) === String(gi1)) {
    lines.push(`다만 ${p2}님의 기운이 ${p1}님의 기신과 같은 부분이 있어서, 가끔 부담으로 느껴질 수도 있어요. 이 부분은 서로 이해하면 충분히 극복 가능합니다.`);
  }
  if (String(dayEl1Ko) === String(gi2)) {
    lines.push(`또한 ${p1}님의 기운이 ${p2}님의 기신과 닿아 있어서, 무의식적으로 스트레스를 줄 수 있는 면이 있어요. 의식적으로 배려하면 좋겠습니다.`);
  }
  lines.push('');

  // ── 종합 궁합 점수 ──
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✦ 궁합 종합 결과 ${getScoreEmoji(result.totalScore)}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push('');

  lines.push(`${p1}님과 ${p2}님의 궁합 점수는 100점 만점에 ${result.totalScore}점이에요!`);
  lines.push(`등급으로 보면 "${result.grade}"에 해당합니다.`);
  lines.push('');
  lines.push(getGradeComment(result.totalScore));
  lines.push('');

  // ── 세부 항목별 서술 ──
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✦ 항목별 궁합 풀이`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push('');

  for (const d of result.details) {
    const pct = d.maxScore > 0 ? Math.round((Math.max(0, d.score) / d.maxScore) * 100) : 0;
    let ratingWord = '';
    if (d.rating === 'excellent') ratingWord = '아주 좋아요!';
    else if (d.rating === 'good') ratingWord = '괜찮은 편이에요.';
    else if (d.rating === 'neutral') ratingWord = '무난한 편이에요.';
    else if (d.rating === 'caution') ratingWord = '조금 주의가 필요해요.';
    else ratingWord = '신경 써야 할 부분이에요.';

    lines.push(`▸ ${d.category} (${d.score}/${d.maxScore}점) — ${ratingWord}`);
    lines.push(`  ${d.description}`);
    lines.push('');
  }

  // ── 강점 ──
  if (result.strengths.length > 0 && result.strengths[0] !== '특별히 두드러지는 장점은 없으나 무난한 관계입니다') {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✦ 두 분의 궁합에서 좋은 점`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push('');
    lines.push(`두 분의 사주를 함께 놓고 보면, 이런 점들이 좋아요.`);
    lines.push('');
    for (const s of result.strengths) {
      lines.push(`  · ${s}`);
    }
    lines.push('');
  }

  // ── 약점 ──
  if (result.weaknesses.length > 0 && result.weaknesses[0] !== '특별히 큰 약점은 없습니다') {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✦ 주의하면 좋을 점`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push('');
    lines.push(`반면에 이런 부분들은 좀 신경 쓰시면 좋겠어요.`);
    lines.push('');
    for (const w of result.weaknesses) {
      lines.push(`  · ${w}`);
    }
    lines.push('');
  }

  // ── 애정운 비교 ──
  if (saju1.fortune?.love || saju2.fortune?.love) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✦ 두 분의 연애·관계 스타일`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push('');
    if (saju1.fortune?.love) {
      lines.push(`${p1}님의 연애 스타일을 보면요, ${saju1.fortune.love}`);
      lines.push('');
    }
    if (saju2.fortune?.love) {
      lines.push(`${p2}님은요, ${saju2.fortune.love}`);
      lines.push('');
    }
  }

  // ── 건강운 비교 ──
  if (saju1.fortune?.health || saju2.fortune?.health) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✦ 건강 면에서 서로 챙겨줄 점`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push('');
    if (saju1.fortune?.health) {
      lines.push(`${p1}님은 ${saju1.fortune.health}`);
      lines.push('');
    }
    if (saju2.fortune?.health) {
      lines.push(`${p2}님은 ${saju2.fortune.health}`);
      lines.push('');
    }
    lines.push(`서로의 건강 취약점을 알고 있으면, 함께 있을 때 더 잘 챙겨줄 수 있겠죠?`);
    lines.push('');
  }

  // ── 재물운 비교 ──
  if (saju1.fortune?.wealth || saju2.fortune?.wealth) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✦ 재물·경제적 궁합`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push('');
    if (saju1.fortune?.wealth) {
      lines.push(`${p1}님의 재물운을 보면, ${saju1.fortune.wealth}`);
      lines.push('');
    }
    if (saju2.fortune?.wealth) {
      lines.push(`${p2}님의 재물운은요, ${saju2.fortune.wealth}`);
      lines.push('');
    }
    lines.push(`두 분이 경제적으로 어떻게 역할을 나누면 좋을지 참고하시면 좋겠어요.`);
    lines.push('');
  }

  // ── 직업·방향성 비교 ──
  if (saju1.fortune?.career || saju2.fortune?.career) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✦ 직업·적성 비교`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push('');
    if (saju1.fortune?.career) {
      lines.push(`${p1}님은 ${saju1.fortune.career}`);
      lines.push('');
    }
    if (saju2.fortune?.career) {
      lines.push(`${p2}님은 ${saju2.fortune.career}`);
      lines.push('');
    }
    lines.push(`서로의 적성을 이해하고 응원해주는 게 좋은 관계의 비결이에요.`);
    lines.push('');
  }

  // ── 종합 조언 ──
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✦ 마무리 조언`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push('');
  lines.push(result.advice);
  lines.push('');

  // 럭키 아이템 서술
  const lc1 = saju1.fortune?.luckyColor;
  const lc2 = saju2.fortune?.luckyColor;
  const ld1 = saju1.fortune?.luckyDirection;
  const ld2 = saju2.fortune?.luckyDirection;
  const ln1 = saju1.fortune?.luckyNumber;
  const ln2 = saju2.fortune?.luckyNumber;

  if (lc1 || lc2) {
    lines.push(`참고로 ${p1}님의 행운 색상은 "${lc1}"이고, ${p2}님은 "${lc2}"예요. 함께 있을 때 서로의 행운 색상을 활용해보세요.`);
  }
  if (ld1 || ld2) {
    lines.push(`행운의 방향은 ${p1}님이 "${ld1}", ${p2}님이 "${ld2}"입니다. 여행이나 이사 계획이 있다면 참고하시면 좋겠어요.`);
  }
  if (ln1 || ln2) {
    lines.push(`행운의 숫자는 ${p1}님이 ${ln1}, ${p2}님이 ${ln2}이에요.`);
  }
  lines.push('');

  lines.push(`이상으로 ${p1}님과 ${p2}님의 궁합 풀이를 마칩니다. 좋은 인연 이어가시길 바랍니다! 🙏`);

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
