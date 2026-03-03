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
  lines.push(`[사주팔자]`);
  lines.push(`년주: ${fourPillars.year.heavenlyStem}${fourPillars.year.earthlyBranch} (${fourPillars.year.heavenlyStemKo}${fourPillars.year.earthlyBranchKo}) - ${fourPillars.year.elementKo}(${fourPillars.year.element}) ${fourPillars.year.yinYangKo}`);
  lines.push(`월주: ${fourPillars.month.heavenlyStem}${fourPillars.month.earthlyBranch} (${fourPillars.month.heavenlyStemKo}${fourPillars.month.earthlyBranchKo}) - ${fourPillars.month.elementKo}(${fourPillars.month.element}) ${fourPillars.month.yinYangKo}`);
  lines.push(`일주: ${fourPillars.day.heavenlyStem}${fourPillars.day.earthlyBranch} (${fourPillars.day.heavenlyStemKo}${fourPillars.day.earthlyBranchKo}) - ${fourPillars.day.elementKo}(${fourPillars.day.element}) ${fourPillars.day.yinYangKo}`);
  lines.push(`시주: ${fourPillars.hour.heavenlyStem}${fourPillars.hour.earthlyBranch} (${fourPillars.hour.heavenlyStemKo}${fourPillars.hour.earthlyBranchKo}) - ${fourPillars.hour.elementKo}(${fourPillars.hour.element}) ${fourPillars.hour.yinYangKo}`);
  lines.push('');

  // 일간
  lines.push(`[일간 - 나를 대표하는 오행]`);
  lines.push(`일간: ${fourPillars.day.heavenlyStem} (${fourPillars.day.heavenlyStemKo}) - ${fourPillars.day.elementKo}(${fourPillars.day.element}) ${fourPillars.day.yinYangKo}`);
  lines.push('');

  // 십성
  lines.push(`[십성]`);
  lines.push(`년주 십성: ${tenGods.year}`);
  lines.push(`월주 십성: ${tenGods.month}`);
  lines.push(`시주 십성: ${tenGods.hour}`);
  lines.push('');

  // 오행 분포
  lines.push(`[오행 분포]`);
  lines.push(`목: ${elementDistribution.wood}개`);
  lines.push(`화: ${elementDistribution.fire}개`);
  lines.push(`토: ${elementDistribution.earth}개`);
  lines.push(`금: ${elementDistribution.metal}개`);
  lines.push(`수: ${elementDistribution.water}개`);
  const total = elementDistribution.wood + elementDistribution.fire + elementDistribution.earth + elementDistribution.metal + elementDistribution.water;
  lines.push(`총 ${total}개 중 가장 많은 오행: ${getStrongestElement(elementDistribution)}`);
  lines.push(`부족한 오행: ${getWeakestElement(elementDistribution)}`);
  lines.push('');

  // 용신/기신
  lines.push(`[용신/기신]`);
  lines.push(`용신: ${yongSin} - 나에게 이로운 기운`);
  lines.push(`기신: ${giSin} - 나에게 불리한 기운`);
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
    lines.push(`[신살]`);
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
    lines.push(`[형충회합]`);
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
    lines.push(`[대운 - 10년 주기]`);
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
    lines.push(`[월운]`);
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
한국 전통 사주명리학의 깊은 지식을 갖추고 있으며, 사주팔자를 바탕으로 개인 맞춤형 운명 분석서를 작성합니다.

분석 작성 원칙:
1. 전문적이면서도 이해하기 쉬운 한국어로 작성
2. 긍정적 관점 유지 - 단점보다 장점을 먼저 언급하고, 약점은 개선 방향과 함께 제시
3. 사주 데이터에 근거한 분석 (추상적 일반론 지양)
4. 각 챕터별로 지정된 글자수에 맞춰 상세하고 풍부하게 작성
5. 고객의 이름을 사용하여 개인화된 분석서 작성
6. "~하세요", "~해요", "~이에요/예요" 체 사용 (부드럽고 친근한 어조)
7. 한자는 절대 사용하지 마세요. 모든 전문 용어는 한글로만 작성하세요 (예: 목, 화, 토, 금, 수 / 갑, 을, 병 등). 괄호 안에 한자를 넣으면 안 됩니다.
8. JSON 형식으로 응답 (각 챕터별 title과 content)
9. 풍부한 설명과 구체적 예시를 들어 독자가 쉽게 이해할 수 있도록 서술
10. 각 문단을 충분히 길게 작성하고, 주제마다 배경 설명과 실천 방안을 포함`;

export function getBasicAnalysisPrompt(sajuData: string, customerName: string): string {
  return `다음 사주 데이터를 기반으로 "기본 사주 분석서"를 작성해주세요.
상세하고 풍부한 분석을 제공하세요. 구체적인 설명과 실천 방안을 포함하세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 따뜻한 인사말 (200~300자)",
  "chapters": [
    {
      "number": "01",
      "title": "종합 운세 분석",
      "content": "종합적인 사주 분석. 일간의 기질과 의미, 오행 균형, 용신의 역할, 성격적 특징, 직업 적성, 재물운, 건강 주의점, 연애/가정운을 상세하고 구체적으로 서술. (3000~4000자)"
    }
  ]
}`;
}

export function getPremiumAnalysisPrompt(sajuData: string, customerName: string): string {
  return `다음 사주 데이터를 기반으로 "프리미엄 심층 사주 분석서"를 작성해주세요.
상세하고 풍부한 분석을 제공하세요. 각 챕터를 충분히 길게 작성하고, 구체적인 설명과 실천 방안을 포함하세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 따뜻한 인사말 (300~500자)",
  "chapters": [
    {
      "number": "01",
      "title": "나의 사주팔자 상세분석",
      "content": "일간 특성, 사주 구성, 오행 균형, 핵심 키워드를 상세하게 설명. 일간의 성격적 의미, 강약 판정, 개인의 기질과 기운의 특징을 구체적으로 서술. (2000~3000자)"
    },
    {
      "number": "02",
      "title": "내 인생의 황금기",
      "content": "대운 전체 흐름 분석, 각 대운 시기의 특징, 인생에서 가장 중요한 황금기 시점과 그 의미, 현재 위치에서의 전망을 상세하게 서술. (2000~3000자)"
    },
    {
      "number": "03",
      "title": "연애운과 배우자운",
      "content": "연애 패턴, 배우자 유형, 결혼 시기와 가능성, 기존 관계에 대한 분석, 인생의 파트너와의 조화를 구체적으로 설명. (2000~3000자)"
    },
    {
      "number": "04",
      "title": "나의 재물운 분석",
      "content": "재성 분석, 재물운의 특성, 투자 성향, 수입 유형, 재물을 얻을 수 있는 방법, 피해야 할 투자 패턴을 상세하게 서술. (2000~3000자)"
    },
    {
      "number": "05",
      "title": "직업과 성공의 운명",
      "content": "직업 적성, 성공 분야, 경력 방향, 사업 능력, 리더십 특성, 성공하기 위한 구체적 전략을 상세하게 설명. (2000~3000자)"
    },
    {
      "number": "06",
      "title": "사주로 보는 건강과 체질",
      "content": "체질적 약점, 주의 질환, 건강 관리법, 계절별 건강 주의점, 정신 건강, 예방 방법을 구체적으로 서술. (2000~3000자)"
    },
    {
      "number": "07",
      "title": "당신을 도와줄 운명의 귀인",
      "content": "귀인 유형, 만나는 시기, 도움이 되는 사람의 특징, 신살 분석, 인간관계 개선 방법을 상세하게 설명. (1500~2500자)"
    },
    {
      "number": "08",
      "title": "운명을 바꾸는 방법",
      "content": "용신 활용 개운법, 행운 요소, 풍수 조언, 일상에서의 실천 방법, 운을 높이기 위한 구체적 활동을 상세하게 서술. (1500~2500자)"
    },
    {
      "number": "09",
      "title": "월별 상세 운세",
      "content": "올해 1~12월 각 월의 천간지지, 운세 특징, 해야 할 일과 피해야 할 일을 포함하여 상세하게 분석. 각 월별로 300~400자씩 작성. (3000~4000자)"
    },
    {
      "number": "10",
      "title": "앞으로의 10년간 운명 분석",
      "content": "향후 10년 대운 흐름을 상세하게 분석. 각 년도별로 운의 특징, 주의점, 기회요소, 전략을 포함하여 300~400자씩 작성. (3000~4000자)"
    }
  ]
}`;
}

export function getNewYearAnalysisPrompt(sajuData: string, customerName: string, year: number): string {
  return `다음 사주 데이터를 기반으로 "${year}년 신년운세 분석서"를 작성해주세요.
${year}년에 초점을 맞춰 상세하고 풍부한 분석을 제공하세요. 각 챕터를 충분히 길게 작성하고, 구체적인 조언과 실천 방안을 포함하세요.
말투는 "~하세요", "~해요", "~이에요" 등 부드럽고 친근한 어조를 사용하세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 ${year}년 새해 인사말. 사주의 특성과 새해 전망을 포함한 따뜻한 인사 (300~500자)",
  "chapters": [
    {
      "number": "01",
      "title": "나의 사주 한눈에 보기",
      "content": "사주 핵심 특성을 상세하게 설명. 일간의 의미와 성격적 특징, 오행 균형 상태의 의미, 용신과 기신이 삶에 미치는 영향, 사주에서 나타나는 강점과 약점을 구체적으로 서술. (2000~3000자)"
    },
    {
      "number": "02",
      "title": "${year}년 운세 총평",
      "content": "${year}년 세운의 특성, 사주와의 관계, 올해의 핵심 테마와 키워드, 상반기와 하반기의 운기 흐름 차이, 올해 특히 주목해야 할 포인트, 전반적인 운의 방향성을 상세하게 서술. (3000~4000자)"
    },
    {
      "number": "03",
      "title": "${year} 재물운",
      "content": "${year}년 재물운의 전반적 흐름, 수입과 지출의 패턴, 재테크나 투자에 유리한 시기와 불리한 시기, 예상치 못한 재물 기회, 재물운을 높이기 위한 구체적 실천 방안, 주의해야 할 재정적 위험 요소를 상세하게 서술. (2500~3500자)"
    },
    {
      "number": "04",
      "title": "${year} 직업/사업운",
      "content": "${year}년 직업운과 사업운의 흐름, 승진이나 이직에 유리한 시기, 사업 확장의 적기, 동료나 상사와의 관계 변화, 새로운 프로젝트나 도전에 대한 전망, 커리어 발전을 위한 구체적 전략과 조언을 상세하게 서술. (2500~3500자)"
    },
    {
      "number": "05",
      "title": "${year} 연애/가정운",
      "content": "${year}년 연애운의 흐름, 새로운 만남의 가능성과 시기, 기존 관계의 변화, 결혼운, 가족관계의 변동, 배우자나 파트너와의 조화, 애정운을 높이기 위한 실천 방안을 상세하게 서술. (2500~3500자)"
    },
    {
      "number": "06",
      "title": "${year} 건강운",
      "content": "${year}년 건강운의 전반적 흐름, 특히 주의해야 할 신체 부위와 질환, 계절별 건강 관리 포인트, 스트레스 관리법, 운동과 식이 조언, 정신 건강 관리, 건강을 지키기 위한 생활 습관 개선점을 상세하게 서술. (2000~3000자)"
    },
    {
      "number": "07",
      "title": "${year} 인간관계/귀인",
      "content": "${year}년 대인관계의 변화, 귀인의 특성과 만나는 시기, 도움이 되는 사람의 유형, 주의해야 할 인간관계, 인맥 확장의 기회, 사회적 관계에서의 조언을 상세하게 서술. (2000~3000자)"
    },
    {
      "number": "08",
      "title": "주의할 시기와 대비법",
      "content": "${year}년 중 특별히 주의해야 할 월과 시기, 주의가 필요한 이유(충, 형, 파 등), 위험을 최소화하기 위한 구체적 대비 전략, 피해야 할 행동과 결정, 위기를 기회로 바꾸는 방법을 상세하게 서술. (2000~3000자)"
    },
    {
      "number": "09",
      "title": "${year} 행운 가이드",
      "content": "행운색, 행운 숫자, 행운 방향, 행운의 날, 개운법(용신 활용), 풍수 인테리어 조언, 일상에서 운을 높이는 구체적 방법, 파워스팟(좋은 기운의 방향과 장소)을 상세하게 서술. (2000~3000자)"
    },
    {
      "number": "10",
      "title": "월별 운세 상세 분석",
      "content": "1월부터 12월까지 각 월의 운세를 상세하게 분석. 각 월별로 해당 월의 천간지지, 전반적 운세, 재물운, 건강 주의점, 실천 가이드를 포함하여 300~400자씩 작성. 총 (4000~5000자)"
    }
  ]
}`;
}

export { SYSTEM_PROMPT };

// ─── Helper functions ───

function getStrongestElement(dist: SajuResult['elementDistribution']): string {
  const map: Record<string, number> = { '목': dist.wood, '화': dist.fire, '토': dist.earth, '금': dist.metal, '수': dist.water };
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0][0];
}

function getWeakestElement(dist: SajuResult['elementDistribution']): string {
  const map: Record<string, number> = { '목': dist.wood, '화': dist.fire, '토': dist.earth, '금': dist.metal, '수': dist.water };
  return Object.entries(map).sort((a, b) => a[1] - b[1])[0][0];
}
