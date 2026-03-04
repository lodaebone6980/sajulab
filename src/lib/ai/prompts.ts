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
  lines.push(`[일간(日干) - 나를 대표하는 오행]`);
  lines.push(`일간: ${fourPillars.day.heavenlyStem} (${fourPillars.day.heavenlyStemKo}) - ${fourPillars.day.elementKo}(${fourPillars.day.element}) ${fourPillars.day.yinYangKo}`);
  lines.push('');

  // 십성
  lines.push(`[십성(十星)]`);
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
    lines.push(`용신(用神): ${result.yongShinSystem.yongSin}`);
    lines.push(`희신: ${result.yongShinSystem.huiSin}`);
    lines.push(`기신(忌神): ${result.yongShinSystem.giSin}`);
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
    lines.push(`[신살(神殺)]`);
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
    lines.push(`[형충회합(刑沖會合)]`);
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
    lines.push(`[대운(大運) - 10년 주기]`);
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
    lines.push(`[월운(月運)]`);
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
4. 각 챕터별로 지정된 글자수에 맞춰 상세하고 풍부하게 작성
5. 고객의 이름을 사용하여 개인화된 분석서 작성
6. "~하세요", "~해요", "~이에요/예요" 체 사용 (부드럽고 친근한 어조)
7. 오행, 천간, 지지, 십성 등 전문 용어는 한글과 한자를 병기하세요 (예: 목(木), 화(火), 용신(用神), 대운(大運), 경금(庚金) 등)
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
매우 상세하고 풍부한 분석을 제공하세요. 각 챕터를 최대한 길고 깊이 있게 작성하세요.
반드시 각 챕터의 지정된 최소 글자수를 채워주세요. 글자수가 부족하면 안 됩니다.
구체적인 설명, 사례, 비유, 실천 방안을 풍부하게 포함하세요.

${sajuData}

응답 형식 (반드시 JSON):
{
  "greeting": "${customerName}님께 보내는 따뜻한 인사말 (500~800자)",
  "chapters": [
    {
      "number": "01",
      "title": "나의 사주팔자 심층 해석",
      "content": "일간의 근본 특성과 성격적 의미를 깊이 있게 분석. 사주 구성의 독특한 조합이 어떤 의미를 갖는지, 오행 균형 상태와 그 영향, 강약 판정의 의미, 일간과 다른 천간/지지의 상호작용, 핵심 키워드와 그 배경 설명을 구체적 예시와 함께 서술. 일간의 기질이 일상생활, 대인관계, 의사결정에 어떻게 나타나는지 상세히 설명. (4000~5000자)"
    },
    {
      "number": "02",
      "title": "오행으로 보는 나의 기운과 에너지",
      "content": "오행(목화토금수) 각각의 의미와 고객 사주에서의 분포를 상세 분석. 강한 오행이 성격과 삶에 미치는 영향, 부족한 오행을 보완하는 방법, 오행 간의 상생상극 관계가 삶에서 어떻게 나타나는지, 계절과 오행의 관계, 색깔/음식/방향과 오행의 연결고리를 구체적으로 서술. (4000~5000자)"
    },
    {
      "number": "03",
      "title": "십성으로 읽는 관계와 역할",
      "content": "십성(비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인)의 의미를 설명하고, 고객 사주에 나타난 십성 배치가 성격, 대인관계, 사회적 역할에 미치는 영향을 상세히 분석. 각 십성이 어느 자리(년/월/일/시)에 있는지에 따른 의미 차이, 십성 조합이 만드는 성격 유형과 행동 패턴을 구체적으로 서술. (4000~5000자)"
    },
    {
      "number": "04",
      "title": "내 인생의 황금기와 대운 흐름",
      "content": "대운(大運)의 개념과 고객의 전체 대운 흐름을 시기별로 상세 분석. 각 대운 시기(10년 단위)의 특징, 기회, 도전을 설명. 인생에서 가장 중요한 황금기 시점과 그 의미, 현재 대운의 특성과 앞으로 남은 대운 전망, 대운 전환기에 주의할 점과 활용법을 구체적으로 서술. (5000~6000자)"
    },
    {
      "number": "05",
      "title": "연애운과 배우자운 심층 분석",
      "content": "사주에서 읽히는 연애 패턴과 이상형, 배우자 궁(일지)의 의미, 배우자의 성격과 외모 유형, 연애 시기와 결혼 적기, 결혼 후의 부부 관계 전망, 연애 시 강점과 주의할 약점, 이별이나 갈등의 원인과 해결법, 궁합이 좋은 사주 유형, 연애운을 높이는 구체적 방법을 깊이 있게 분석. (4000~5000자)"
    },
    {
      "number": "06",
      "title": "재물운과 경제적 전망",
      "content": "재성(편재/정재)의 위치와 강약 분석, 재물 획득 패턴(정기 수입형/투자형/사업형/횡재형), 돈에 대한 태도와 소비 습관, 재테크 적성, 부동산/주식/사업 중 유리한 재물 경로, 시기별 재물운의 흐름(대운/세운 기준), 재물을 잃기 쉬운 시기와 원인, 재물운을 극대화하는 전략과 구체적 실천법을 상세히 서술. (4000~5000자)"
    },
    {
      "number": "07",
      "title": "직업 적성과 성공 전략",
      "content": "사주에서 나타나는 직업 적성과 재능, 관성(편관/정관)과 식상(식신/상관)의 배치가 직업에 미치는 영향, 적합한 직업 분야 TOP 5와 그 이유, 사업가 기질 분석, 리더십 스타일, 직장 내 인간관계 패턴, 승진/이직 시기 분석, 부업이나 프리랜서 적성, 성공을 위한 10가지 구체적 전략과 조언을 깊이 있게 서술. (4000~5000자)"
    },
    {
      "number": "08",
      "title": "건강 체질과 질병 예방",
      "content": "오행 기반 체질 분석(어떤 장기가 강하고 약한지), 선천적으로 주의해야 할 질환, 나이별 건강 변화 전망, 계절별 건강 관리 포인트, 오행별 추천 음식과 피해야 할 음식, 운동 추천, 정신 건강(스트레스 유형과 해소법), 수면 습관 조언, 대운/세운에 따른 건강 위험기와 예방 전략을 상세히 서술. (4000~5000자)"
    },
    {
      "number": "09",
      "title": "가족관계와 부모/자녀운",
      "content": "년주(부모궁), 월주(형제궁), 일주(배우자궁), 시주(자녀궁)의 의미와 분석. 부모와의 관계, 형제자매와의 관계, 자녀와의 관계 전망, 가족 내 역할, 효도와 부양의 운, 자녀의 성향과 교육 방향, 가정의 화목을 위한 조언, 가족 갈등의 원인과 해결 방안을 구체적으로 서술. (3500~4500자)"
    },
    {
      "number": "10",
      "title": "귀인과 소인 분석",
      "content": "사주에 나타난 귀인(貴人)의 유형과 특징, 귀인을 만나는 시기와 장소, 신살(神殺) 분석을 통한 특수한 인연, 도움이 되는 사람의 띠/나이/직업 유형, 반대로 주의해야 할 소인(小人)의 특징, 인간관계에서의 강점과 약점, 좋은 인연을 끌어당기는 방법, 나쁜 인연을 피하는 지혜를 상세히 서술. (3500~4500자)"
    },
    {
      "number": "11",
      "title": "용신 활용 개운법",
      "content": "용신(用神)과 희신의 개념과 고객에게 이로운 기운의 정체, 용신 오행을 일상에서 활용하는 구체적 방법(색깔, 방향, 숫자, 음식, 직업, 취미 등), 풍수 인테리어 조언(집/사무실), 행운의 아이템과 액세서리, 이름이나 호에서의 오행 활용, 명상과 기 수련, 일상 루틴에서의 개운 실천법, 나쁜 기운(기신)을 피하는 방법을 구체적으로 서술. (4000~5000자)"
    },
    {
      "number": "12",
      "title": "십이운성으로 보는 인생 사이클",
      "content": "십이운성(장생, 목욕, 관대, 건록, 제왕, 쇠, 병, 사, 묘, 절, 태, 양)의 의미를 각각 설명하고, 고객 사주의 년/월/일/시 각 기둥의 운성이 갖는 의미, 현재 대운과 세운의 운성 분석, 인생 전반의 에너지 사이클, 각 운성 시기에 어떤 태도와 전략이 적합한지, 운성 변화에 따른 심리 상태와 대처법을 구체적으로 서술. (4000~5000자)"
    },
    {
      "number": "13",
      "title": "월별 상세 운세 가이드",
      "content": "올해 1~12월 각 월의 천간지지와 오행, 사주와의 상호작용 분석. 각 월별로 전반적 운세, 재물운, 연애운, 건강 주의점, 해야 할 일과 피해야 할 일, 행운의 날과 방향을 포함하여 500~600자씩 작성. 특히 좋은 달과 주의할 달을 강조. (6000~7000자)"
    },
    {
      "number": "14",
      "title": "향후 10년간 운명 로드맵",
      "content": "올해부터 향후 10년간의 세운(歲運) 흐름을 연도별로 상세 분석. 각 연도별 천간지지, 사주와의 관계, 주요 이벤트 전망, 기회와 위험, 재물/직업/건강/연애 각 분야 전망, 구체적 전략을 포함하여 500~600자씩 작성. (5000~6000자)"
    },
    {
      "number": "15",
      "title": "종합 정리와 인생 조언",
      "content": "지금까지의 모든 분석을 종합하여 고객의 사주가 말해주는 인생의 핵심 메시지, 가장 중요한 3가지 실천 사항, 인생 전반의 테마와 방향성, 앞으로 10년의 핵심 키워드, 용신 활용 체크리스트, 매일 실천할 수 있는 개운 루틴, 격려와 응원의 메시지를 따뜻하고 구체적으로 서술. (3500~4500자)"
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
      "content": "${year}년 세운(歲運)의 특성, 사주와의 관계, 올해의 핵심 테마와 키워드, 상반기와 하반기의 운기 흐름 차이, 올해 특히 주목해야 할 포인트, 전반적인 운의 방향성을 상세하게 서술. (3000~4000자)"
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
      "content": "${year}년 대인관계의 변화, 귀인(貴人)의 특성과 만나는 시기, 도움이 되는 사람의 유형, 주의해야 할 인간관계, 인맥 확장의 기회, 사회적 관계에서의 조언을 상세하게 서술. (2000~3000자)"
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
