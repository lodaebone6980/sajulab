/**
 * 상품별 LLM 프롬프트 템플릿
 * sajulab.kr과 동일한 구조의 장문 사주 분석을 생성하기 위한 프롬프트
 */

import type { SajuResult } from '@/lib/saju/types';

// ─── 사주 데이터를 LLM 입력용 텍스트로 변환 ───

export function formatSajuDataForLLM(result: SajuResult, customerName: string): string {
  const { birthInfo, fourPillars, elementDistribution, tenGods, fortune, daeUn, yongSin, giSin } = result;

  const lines: string[] = [];

  // 기본 정보
  lines.push(`[고객 정보]`);
  lines.push(`이름: ${customerName}`);
  lines.push(`성별: ${birthInfo.gender === 'male' ? '남성' : '여성'}`);
  lines.push(`생년월일: ${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일`);
  lines.push(`출생시간: ${String(birthInfo.hour).padStart(2,'0')}시 ${String(birthInfo.minute).padStart(2,'0')}분`);
  lines.push(`역법: ${birthInfo.isLunar ? '음력' : '양력'}`);
  lines.push('');

  // 사주팔자
  lines.push(`[사주팔자 (四柱八字)]`);
  lines.push(`년주: ${fourPillars.year.heavenlyStem}${fourPillars.year.earthlyBranch} (${fourPillars.year.heavenlyStemKo}${fourPillars.year.earthlyBranchKo}) - ${fourPillars.year.elementKo}(${fourPillars.year.element}) ${fourPillars.year.yinYangKo}`);
  lines.push(`월주: ${fourPillars.month.heavenlyStem}${fourPillars.month.earthlyBranch} (${fourPillars.month.heavenlyStemKo}${fourPillars.month.earthlyBranchKo}) - ${fourPillars.month.elementKo}(${fourPillars.month.element}) ${fourPillars.month.yinYangKo}`);
  lines.push(`일주: ${fourPillars.day.heavenlyStem}${fourPillars.day.earthlyBranch} (${fourPillars.day.heavenlyStemKo}${fourPillars.day.earthlyBranchKo}) - ${fourPillars.day.elementKo}(${fourPillars.day.element}) ${fourPillars.day.yinYangKo}`);
  lines.push(`시주: ${fourPillars.hour.heavenlyStem}${fourPillars.hour.earthlyBranch} (${fourPillars.hour.heavenlyStemKo}${fourPillars.hour.earthlyBranchKo}) - ${fourPillars.hour.elementKo}(${fourPillars.hour.element}) ${fourPillars.hour.yinYangKo}`);
  lines.push('');

  // 일간
  lines.push(`[일간 (日干) - 나를 대표하는 오행]`);
  lines.push(`일간: ${fourPillars.day.heavenlyStem} (${fourPillars.day.heavenlyStemKo}) - ${fourPillars.day.elementKo}(${fourPillars.day.element}) ${fourPillars.day.yinYangKo}`);
  lines.push('');

  // 십성
  lines.push(`[십성 (十星)]`);
  lines.push(`년주 십성: ${tenGods.year}`);
  lines.push(`월주 십성: ${tenGods.month}`);
  lines.push(`시주 십성: ${tenGods.hour}`);
  lines.push('');

  // 오행 분포
  lines.push(`[오행 분포]`);
  lines.push(`목(木): ${elementDistribution.wood}개`);
  lines.push(`화(火): ${elementDistribution.fire}개`);
  lines.push(`토(土): ${elementDistribution.earth}개`);
  lines.push(`금(金): ${elementDistribution.metal}개`);
  lines.push(`수(水): ${elementDistribution.water}개`);
  const total = elementDistribution.wood + elementDistribution.fire + elementDistribution.earth + elementDistribution.metal + elementDistribution.water;
  lines.push(`총 ${total}개 중 가장 많은 오행: ${getStrongestElement(elementDistribution)}`);
  lines.push(`부족한 오행: ${getWeakestElement(elementDistribution)}`);
  lines.push('');

  // 용신/기신
  lines.push(`[용신/기신]`);
  lines.push(`용신(用神): ${yongSin} - 나에게 이로운 기운`);
  lines.push(`기신(忌神): ${giSin} - 나에게 불리한 기운`);
  lines.push('');

  // 강약 판정
  if (result.strength) {
    lines.push(`[일간 강약]`);
    lines.push(`강약: ${result.strength.result} (총점: ${result.strength.totalScore}점)`);
    lines.push('');
  }

  // 용신 5체계
  if (result.yongShinSystem) {
    lines.push(`[용신 5체계]`);
    lines.push(`용신: ${result.yongShinSystem.yongSin}`);
    lines.push(`희신: ${result.yongShinSystem.huiSin}`);
    lines.push(`기신: ${result.yongShinSystem.giSin}`);
    lines.push(`구신: ${result.yongShinSystem.guSin}`);
    lines.push(`한신: ${result.yongShinSystem.hanSin}`);
    lines.push(`격국: ${result.yongShinSystem.pattern}`);
    lines.push(`근거: ${result.yongShinSystem.reason}`);
    lines.push('');
  }

  // 십이운성
  if (result.twelveStages) {
    lines.push(`[십이운성]`);
    for (const [key, val] of Object.entries(result.twelveStages)) {
      if (val && typeof val === 'object' && 'stage' in val) {
        lines.push(`${key}: ${(val as { stage: string }).stage}`);
      }
    }
    lines.push('');
  }

  // 신살
  if (result.sinsal?.length) {
    lines.push(`[신살 (神殺)]`);
    const pillarMap: Record<string, string[]> = { year: [], month: [], day: [], hour: [] };
    for (const s of result.sinsal) {
      if (pillarMap[s.pillar]) {
        pillarMap[s.pillar].push(`${s.name}(${s.category})`);
      }
    }
    if (pillarMap.year.length) lines.push(`년주 신살: ${pillarMap.year.join(', ')}`);
    if (pillarMap.month.length) lines.push(`월주 신살: ${pillarMap.month.join(', ')}`);
    if (pillarMap.day.length) lines.push(`일주 신살: ${pillarMap.day.join(', ')}`);
    if (pillarMap.hour.length) lines.push(`시주 신살: ${pillarMap.hour.join(', ')}`);
    lines.push('');
  }

  // 형충회합
  if (result.interactions?.length) {
    lines.push(`[형충회합 (刑沖會合)]`);
    for (const inter of result.interactions) {
      lines.push(`- ${inter.type}: ${inter.description}`);
    }
    lines.push('');
  }

  // 기존 운세 분석 (짧은 템플릿)
  lines.push(`[기본 운세 분석 (참고용)]`);
  lines.push(`성격: ${fortune.personality}`);
  lines.push(`직업: ${fortune.career}`);
  lines.push(`재물: ${fortune.wealth}`);
  lines.push(`건강: ${fortune.health}`);
  lines.push(`애정: ${fortune.love}`);
  lines.push(`종합: ${fortune.overall}`);
  lines.push(`행운색: ${fortune.luckyColor}, 행운숫자: ${fortune.luckyNumber}, 행운방향: ${fortune.luckyDirection}`);
  lines.push('');

  // 대운
  if (daeUn?.length) {
    lines.push(`[대운 (大運) - 10년 주기]`);
    for (const du of daeUn) {
      lines.push(`${du.startYear}~${du.endYear}년 (${du.age}세~): ${du.heavenlyStem}${du.earthlyBranch} ${du.element} - ${du.description}`);
    }
    lines.push('');
  }

  // 세운 (올해)
  if (result.yearFortune) {
    lines.push(`[${result.yearFortune.year}년 세운]`);
    lines.push(`천간: ${result.yearFortune.stem}(${result.yearFortune.stemKo}), 지지: ${result.yearFortune.branch}(${result.yearFortune.branchKo})`);
    lines.push(`오행: ${result.yearFortune.elementKo}(${result.yearFortune.element})`);
    lines.push(`띠: ${result.yearFortune.animal}`);
    lines.push(`십성: ${result.yearFortune.tenGod}, 십이운성: ${result.yearFortune.twelveStage}`);
    lines.push(`길흉점수: ${result.yearFortune.favorableRating}`);
    lines.push(`요약: ${result.yearFortune.summary}`);
    lines.push('');
  }

  // 월운
  if (result.monthFortunes?.length) {
    lines.push(`[월운 (月運)]`);
    for (const mf of result.monthFortunes) {
      lines.push(`${mf.month}월: ${mf.stemKo}${mf.branchKo} (${mf.elementKo}) 십성:${mf.tenGod} - ${mf.summary}`);
    }
    lines.push('');
  }

  // 외부 운세
  if (result.externalFortune && !result.externalFortune.error) {
    const ext = result.externalFortune;
    if (ext.yearly?.items?.length) {
      lines.push(`[외부 운세 데이터 - 년운]`);
      for (const item of ext.yearly.items) {
        lines.push(`${item.title}: ${item.description}`);
      }
      lines.push('');
    }
    if (ext.lifetime?.items?.length) {
      lines.push(`[외부 운세 데이터 - 평생운]`);
      for (const item of ext.lifetime.items.slice(0, 10)) {
        lines.push(`${item.title}: ${item.description}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── 상품별 프롬프트 ───

const SYSTEM_PROMPT = `당신은 사주명리학 전문가이자 운명 분석 컨설턴트입니다.
한국 전통 사주명리학(四柱命理學)의 깊은 지식을 갖추고 있으며, 사주팔자를 바탕으로 개인 맞춤형 운명 분석서를 작성합니다.

분석 작성 원칙:
1. 전문적이면서도 이해하기 쉬운 한국어로 작성
2. 긍정적 관점 유지 - 단점보다 장점을 먼저 언급하고, 약점은 개선 방향과 함께 제시
3. 사주 데이터에 근거한 분석 (추상적 일반론 지양)
4. 각 챕터별로 지정된 글자수에 맞춰 핵심 위주로 간결하게 작성
5. 고객의 이름을 사용하여 개인화된 분석서 작성
6. "~습니다" 체 사용 (정중하고 전문적인 어조)
7. 오행, 천간, 지지, 십성 등 전문 용어는 한글과 한자를 병기
8. JSON 형식으로 응답 (각 챕터별 title과 content)
9. 불필요한 반복이나 동어반복 없이 핵심만 간결하게 서술`;

export function getBasicAnalysisPrompt(sajuData: string, customerName: string): string {
  return `다음 사주 데이터를 기반으로 "기본 사주 분석서"를 작성해주세요.
간결하고 핵심적인 분석을 제공하세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 인사말 (100자 내외)",
  "chapters": [
    {
      "number": "01",
      "title": "종합 운세 분석",
      "content": "종합적인 사주 분석 (1200~1500자). 일간의 기질, 오행 균형, 용신의 역할, 성격, 직업/재물/건강/연애운을 핵심 위주로 서술."
    }
  ]
}`;
}

export function getPremiumAnalysisPrompt(sajuData: string, customerName: string): string {
  return `다음 사주 데이터를 기반으로 "프리미엄 심층 사주 분석서"를 작성해주세요.
각 챕터별로 핵심 위주 간결한 분석을 제공하세요. 반복 없이 핵심만 서술하세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 인사말 (150자 내외)",
  "chapters": [
    {
      "number": "01",
      "title": "나의 사주팔자 상세분석",
      "content": "일간 특성, 사주 구성, 오행 균형, 핵심 키워드 도출. (600~800자)"
    },
    {
      "number": "02",
      "title": "내 인생의 황금기",
      "content": "대운 흐름과 황금기 시점 안내. (600~800자)"
    },
    {
      "number": "03",
      "title": "연애운과 배우자운",
      "content": "연애 패턴, 배우자 유형, 결혼 시기. (600~800자)"
    },
    {
      "number": "04",
      "title": "나의 재물운 분석",
      "content": "재성 분석, 재물 유형, 투자 성향. (600~800자)"
    },
    {
      "number": "05",
      "title": "직업과 성공의 운명",
      "content": "직업 적성, 성공 분야, 경력 방향. (600~800자)"
    },
    {
      "number": "06",
      "title": "사주로 보는 건강과 체질",
      "content": "체질적 약점, 주의 질환, 건강 관리법. (600~800자)"
    },
    {
      "number": "07",
      "title": "당신을 도와줄 운명의 귀인",
      "content": "귀인 유형, 만나는 시기, 신살 분석. (500~700자)"
    },
    {
      "number": "08",
      "title": "운명을 바꾸는 방법",
      "content": "용신 활용 개운법, 행운 요소. (500~700자)"
    },
    {
      "number": "09",
      "title": "월별 상세 운세",
      "content": "올해 1~12월 핵심 운세. 각 월 1~2줄로 간결하게. (800~1000자)"
    },
    {
      "number": "10",
      "title": "앞으로의 10년간 운명 분석",
      "content": "향후 10년 대운 흐름. 각 해 1~2줄로 간결하게. (800~1000자)"
    }
  ]
}`;
}

export function getNewYearAnalysisPrompt(sajuData: string, customerName: string, year: number): string {
  return `다음 사주 데이터를 기반으로 "${year}년 신년운세 분석서"를 작성해주세요.
${year}년에 초점을 맞춰 핵심 위주 간결한 분석을 제공하세요. 반복 없이 핵심만 서술하세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 ${year}년 새해 인사말 (100자 내외)",
  "chapters": [
    {
      "number": "01",
      "title": "나의 사주 한눈에 보기",
      "content": "사주 핵심 특성 요약. 일간, 오행 균형, 용신. (500~700자)"
    },
    {
      "number": "02",
      "title": "${year}년 운세 총평",
      "content": "${year}년 세운과 사주의 관계, 핵심 테마, 상반기/하반기 흐름. (600~800자)"
    },
    {
      "number": "03",
      "title": "${year} 재물운·직업운",
      "content": "재물운과 직업/사업운을 함께 분석. 좋은 시기, 주의사항. (600~800자)"
    },
    {
      "number": "04",
      "title": "${year} 연애·건강·인간관계",
      "content": "연애/가정운, 건강 주의점, 귀인 특성을 종합. (600~800자)"
    },
    {
      "number": "05",
      "title": "월별 운세와 행운 가이드",
      "content": "1~12월 핵심 운세(각 월 1~2줄)와 행운 색상/숫자/방위. (800~1000자)"
    }
  ]
}`;
}

export { SYSTEM_PROMPT };

// ─── Helper functions ───

function getStrongestElement(dist: SajuResult['elementDistribution']): string {
  const map: Record<string, number> = { '목(木)': dist.wood, '화(火)': dist.fire, '토(土)': dist.earth, '금(金)': dist.metal, '수(水)': dist.water };
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0][0];
}

function getWeakestElement(dist: SajuResult['elementDistribution']): string {
  const map: Record<string, number> = { '목(木)': dist.wood, '화(火)': dist.fire, '토(土)': dist.earth, '금(金)': dist.metal, '수(水)': dist.water };
  return Object.entries(map).sort((a, b) => a[1] - b[1])[0][0];
}
