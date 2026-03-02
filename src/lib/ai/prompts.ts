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
4. 각 챕터별로 충분히 깊이 있는 분석 제공 (한 챕터에 최소 800자 이상)
5. 고객의 이름을 사용하여 개인화된 분석서 작성
6. "~습니다" 체 사용 (정중하고 전문적인 어조)
7. 오행, 천간, 지지, 십성 등 전문 용어는 한글과 한자를 병기
8. JSON 형식으로 응답 (각 챕터별 title과 content)`;

export function getBasicAnalysisPrompt(sajuData: string, customerName: string): string {
  return `다음 사주 데이터를 기반으로 "기본 사주 분석서"를 작성해주세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 인사말 (200자 내외, 이 분석서가 삶의 나침반이 되길 바란다는 내용)",
  "chapters": [
    {
      "number": "01",
      "title": "종합 운세 분석",
      "content": "종합적인 사주 분석 (2000자 이상). 일간의 기질, 사주의 전체 구성, 오행 균형, 용신의 역할, 성격적 특성, 대인관계, 직업적 소양, 재물운의 흐름, 건강 주의점, 연애/결혼운 등을 종합적으로 서술. 구체적인 조언과 함께 작성."
    }
  ]
}`;
}

export function getPremiumAnalysisPrompt(sajuData: string, customerName: string): string {
  return `다음 사주 데이터를 기반으로 "프리미엄 심층 사주 분석서"를 작성해주세요.
각 챕터별로 깊이 있고 상세한 분석을 제공하며, 최소 1500자 이상 작성해주세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 인사말 (300자 내외, 정성스럽고 따뜻한 인사)",
  "chapters": [
    {
      "number": "01",
      "title": "나의 사주팔자 상세분석",
      "content": "일간(日干)의 특성부터 시작하여 사주 전체 구성을 상세히 풀이. 천간과 지지의 관계, 십성의 배치, 오행의 균형/불균형, 음양의 조화를 분석. 이 사주의 핵심 키워드와 인생 테마를 도출. (1500자 이상)"
    },
    {
      "number": "02",
      "title": "내 인생의 황금기",
      "content": "대운(大運)과 세운(歲運)을 분석하여 인생에서 가장 좋은 시기를 상세히 안내. 과거의 대운 흐름 평가, 현재 대운의 의미, 앞으로 다가올 황금기 시점과 그 시기에 해야 할 일. (1500자 이상)"
    },
    {
      "number": "03",
      "title": "연애운과 배우자운",
      "content": "사주에서 나타나는 연애 패턴, 이상적인 배우자 유형, 결혼 시기, 부부 궁합의 특성. 일지(日支)와 관성(官星)/재성(財星) 분석. 연애에서의 강점과 주의점. (1500자 이상)"
    },
    {
      "number": "04",
      "title": "나의 재물운 분석",
      "content": "재성(財星)의 위치와 강도, 돈을 모으는 유형, 투자 성향, 재물이 들어오는 시기와 방법. 정재 vs 편재 성향, 사업 적합성. (1500자 이상)"
    },
    {
      "number": "05",
      "title": "직업과 성공의 운명",
      "content": "사주에서 나타나는 직업 적성, 가장 어울리는 직업군, 성공하는 분야와 피해야 할 분야. 관성(官星)과 식상(食傷)의 배치로 본 경력 방향. (1500자 이상)"
    },
    {
      "number": "06",
      "title": "사주로 보는 건강과 체질",
      "content": "오행의 과다/부족으로 본 체질적 약점, 주의해야 할 장기와 질환, 건강 관리법, 좋은 음식과 운동. 계절별 건강 주의사항. (1500자 이상)"
    },
    {
      "number": "07",
      "title": "당신을 도와줄 운명의 귀인",
      "content": "사주에서 귀인(貴人)의 위치와 유형, 도움을 주는 사람의 특성, 귀인을 만나는 시기와 방법. 천을귀인, 월덕귀인 등 신살 분석. (1500자 이상)"
    },
    {
      "number": "08",
      "title": "운명을 바꾸는 방법",
      "content": "용신(用神)을 활용한 개운법, 좋은 방위/색상/숫자, 이름에 들어가면 좋은 오행, 피해야 할 것들, 일상에서 실천할 수 있는 구체적인 개운 팁. (1500자 이상)"
    },
    {
      "number": "09",
      "title": "월별 상세 운세",
      "content": "올해 1월부터 12월까지 각 월별 운세를 상세히 분석. 각 월의 천간/지지와 사주의 관계, 좋은 달과 주의할 달, 월별 행동 지침. (2000자 이상)"
    },
    {
      "number": "10",
      "title": "앞으로의 10년간 운명 분석",
      "content": "향후 10년간의 대운/세운 흐름을 연도별로 분석. 각 해의 주요 테마, 기회와 위기, 주의사항과 행동 지침. (2000자 이상)"
    }
  ]
}`;
}

export function getNewYearAnalysisPrompt(sajuData: string, customerName: string, year: number): string {
  return `다음 사주 데이터를 기반으로 "${year}년 신년운세 분석서"를 작성해주세요.
${year}년에 초점을 맞춰 구체적이고 실용적인 분석을 제공하며, 각 챕터별로 최소 1500자 이상 작성해주세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 ${year}년 새해 인사말 (300자 내외)",
  "chapters": [
    {
      "number": "01",
      "title": "나의 사주 한눈에 보기",
      "content": "사주팔자의 핵심 특성을 간결하게 요약. 일간의 특성, 오행 균형, 용신, 올해의 사주와 의 관계. (1500자 이상)"
    },
    {
      "number": "02",
      "title": "${year}년 운세 총평",
      "content": "${year}년 세운(歲運)과 개인 사주의 관계를 종합 분석. 올해의 핵심 테마, 전체적인 운의 흐름, 상반기/하반기 비교. (1500자 이상)"
    },
    {
      "number": "03",
      "title": "${year} 재물운",
      "content": "올해의 재물운 상세 분석. 돈이 들어오는 시기/방법, 투자 주의사항, 재물 관리 전략, 부업/사업 전망. (1500자 이상)"
    },
    {
      "number": "04",
      "title": "${year} 직업/사업운",
      "content": "올해 직장/사업에서의 운세. 승진/이직 타이밍, 사업 확장 여부, 직장 내 인간관계, 새로운 기회. (1500자 이상)"
    },
    {
      "number": "05",
      "title": "${year} 연애/가정운",
      "content": "올해의 연애운과 가정운. 새 만남의 시기, 기존 관계 발전, 결혼 적기, 가족 관계 변화. (1500자 이상)"
    },
    {
      "number": "06",
      "title": "${year} 건강운",
      "content": "올해 건강에서 주의할 점. 취약한 부위, 계절별 건강 관리, 좋은 운동/음식, 스트레스 관리법. (1500자 이상)"
    },
    {
      "number": "07",
      "title": "${year} 인간관계/귀인",
      "content": "올해 만나게 될 귀인의 특성, 대인관계 변화, 좋은 인연을 만드는 방법, 주의할 관계 유형. (1500자 이상)"
    },
    {
      "number": "08",
      "title": "주의할 시기와 대비법",
      "content": "올해 중 특히 주의해야 할 달과 시기, 구체적인 대비 방법, 피해야 할 행동, 위기를 기회로 바꾸는 법. (1500자 이상)"
    },
    {
      "number": "09",
      "title": "${year} 행운 가이드",
      "content": "올해의 행운 색상/숫자/방위/음식, 매월 행운을 부르는 팁, 생활 속 개운법, 풍수 활용법. (1500자 이상)"
    },
    {
      "number": "10",
      "title": "월별 운세 상세 분석",
      "content": "${year}년 1월부터 12월까지 각 월별 운세. 월별 핵심 키워드, 좋은 날과 주의할 날, 실천 과제. (2000자 이상)"
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
