/**
 * LLM 기반 사주 분석 내러티브 생성
 * GPT-4.1을 사용하여 사주 데이터 기반 장문 분석서를 생성합니다.
 */

import { getOpenAIClient, isOpenAIConfigured } from './openai-client';
import {
  SYSTEM_PROMPT,
  formatSajuDataForLLM,
  getBasicAnalysisPrompt,
  getPremiumAnalysisPrompt,
  getNewYearAnalysisPrompt,
} from './prompts';
import type { SajuResult } from '@/lib/saju/types';

export interface NarrativeChapter {
  number: string;
  title: string;
  content: string;
}

export interface NarrativeResult {
  greeting: string;
  chapters: NarrativeChapter[];
  model: string;
  tokenUsage?: { input: number; output: number; total: number };
}

// ─── 상품별 내러티브 생성 ───

export async function generateNarrative(
  result: SajuResult,
  customerName: string,
  productCode: string,
): Promise<NarrativeResult | null> {
  // OpenAI 키가 없으면 null 반환 (기존 템플릿 방식으로 fallback)
  if (!isOpenAIConfigured()) {
    console.log('[AI] OpenAI API 키가 설정되지 않았습니다. 기존 템플릿 방식으로 PDF를 생성합니다.');
    return null;
  }

  // saju-data 상품은 내러티브 불필요
  if (productCode === 'saju-data') {
    return null;
  }

  const sajuData = formatSajuDataForLLM(result, customerName);
  let userPrompt: string;

  switch (productCode) {
    case 'saju-basic':
      userPrompt = getBasicAnalysisPrompt(sajuData, customerName);
      break;
    case 'saju-premium':
      userPrompt = getPremiumAnalysisPrompt(sajuData, customerName);
      break;
    case 'saju-newyear':
      userPrompt = getNewYearAnalysisPrompt(sajuData, customerName, new Date().getFullYear());
      break;
    default:
      userPrompt = getBasicAnalysisPrompt(sajuData, customerName);
      break;
  }

  try {
    console.log(`[AI] GPT-4.1로 ${productCode} 내러티브 생성 시작...`);
    const startTime = Date.now();

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: productCode === 'saju-basic' ? 6000 : productCode === 'saju-newyear' ? 16000 : 16000,
      response_format: { type: 'json_object' },
    });

    const elapsed = Date.now() - startTime;
    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error('[AI] GPT 응답이 비어있습니다.');
      return null;
    }

    const usage = response.usage;
    console.log(`[AI] 생성 완료 (${elapsed}ms) - 입력: ${usage?.prompt_tokens}, 출력: ${usage?.completion_tokens}`);

    // JSON 파싱
    const parsed = JSON.parse(content) as { greeting: string; chapters: NarrativeChapter[] };

    return {
      greeting: parsed.greeting || '',
      chapters: parsed.chapters || [],
      model: response.model || 'gpt-4.1',
      tokenUsage: usage ? {
        input: usage.prompt_tokens,
        output: usage.completion_tokens || 0,
        total: usage.total_tokens,
      } : undefined,
    };
  } catch (error) {
    console.error('[AI] 내러티브 생성 오류:', error);
    return null;
  }
}

// ─── 폴백: AI 없이 기본 내러티브 생성 (기존 템플릿 기반) ───

export function generateFallbackNarrative(
  result: SajuResult,
  customerName: string,
  productCode: string,
): NarrativeResult {
  const { fortune, fourPillars, yongSin, elementDistribution } = result;
  const dayElement = fourPillars.day.elementKo;

  const greeting = `안녕하세요, ${customerName}님.\n\n이 분석서는 ${customerName}님의 사주팔자를 바탕으로 타고난 기질과 성향, 그리고 앞으로의 운명의 흐름을 분석한 결과입니다.\n\n사주명리학은 수천 년의 역사를 가진 동양의 지혜로, 태어난 년, 월, 일, 시를 바탕으로 개인의 타고난 기질과 운명의 흐름을 파악하는 학문입니다.\n\n이 분석서가 ${customerName}님의 삶에 작은 나침반이 되어, 더 나은 선택과 결정을 내리는 데 도움이 되기를 바랍니다.\n\n운명은 정해진 것이 아니라, 알고 대비하면 더 좋은 방향으로 바꿀 수 있습니다.`;

  if (productCode === 'saju-basic') {
    return {
      greeting,
      chapters: [{
        number: '01',
        title: '종합 운세 분석',
        content: buildBasicContent(result, customerName),
      }],
      model: 'fallback-template',
    };
  }

  if (productCode === 'saju-newyear') {
    const year = new Date().getFullYear();
    return {
      greeting: greeting.replace('분석서는', `${year}년 신년운세 분석서는`),
      chapters: [
        { number: '01', title: '나의 사주 한눈에 보기', content: `${customerName}님의 일간은 ${fourPillars.day.heavenlyStem}(${fourPillars.day.heavenlyStemKo})으로, ${dayElement}(${fourPillars.day.element})의 기운을 타고났습니다. ${fortune.personality}\n\n용신은 ${yongSin}이며, 이 기운을 잘 활용하면 운을 더욱 좋은 방향으로 이끌 수 있습니다.` },
        { number: '02', title: `${year}년 운세 총평`, content: result.yearFortune ? `${year}년은 ${result.yearFortune.stemKo}${result.yearFortune.branchKo}년으로, ${result.yearFortune.elementKo}의 기운이 흐르는 해입니다.\n\n${result.yearFortune.summary}\n\n${fortune.overall}` : fortune.overall },
        { number: '03', title: `${year} 재물운`, content: fortune.wealth },
        { number: '04', title: `${year} 직업/사업운`, content: fortune.career },
        { number: '05', title: `${year} 연애/가정운`, content: fortune.love },
        { number: '06', title: `${year} 건강운`, content: fortune.health },
        { number: '07', title: `${year} 인간관계/귀인`, content: `${customerName}님의 사주에서 귀인의 기운은 ${yongSin} 오행과 관련이 깊습니다. 이 기운을 가진 사람이 ${customerName}님에게 큰 도움이 될 수 있습니다.` },
        { number: '08', title: '주의할 시기와 대비법', content: `올해 특히 주의해야 할 시기에는 차분하게 대응하고, 큰 결정은 피하는 것이 좋습니다. 용신인 ${yongSin}의 기운을 활용하여 어려운 시기를 현명하게 넘기시기 바랍니다.` },
        { number: '09', title: `${year} 행운 가이드`, content: `행운색: ${fortune.luckyColor}\n행운 숫자: ${fortune.luckyNumber}\n행운 방향: ${fortune.luckyDirection}\n\n일상에서 이 요소들을 활용하면 좋은 기운을 끌어올 수 있습니다.` },
        { number: '10', title: '월별 운세 상세 분석', content: buildMonthlyContent(result) },
      ],
      model: 'fallback-template',
    };
  }

  // Premium (default)
  return {
    greeting,
    chapters: [
      { number: '01', title: '나의 사주팔자 상세분석', content: `${customerName}님의 일간은 ${fourPillars.day.heavenlyStem}(${fourPillars.day.heavenlyStemKo})으로, ${dayElement}(${fourPillars.day.element})의 기운을 타고났습니다.\n\n${fortune.personality}\n\n사주 전체의 오행 분포를 보면, 목(木) ${elementDistribution.wood}개, 화(火) ${elementDistribution.fire}개, 토(土) ${elementDistribution.earth}개, 금(金) ${elementDistribution.metal}개, 수(水) ${elementDistribution.water}개로 구성되어 있습니다.\n\n용신은 ${yongSin}이며, 이 기운이 부족할 때 보충하면 운이 상승합니다.` },
      { number: '02', title: '내 인생의 황금기', content: buildDaeunContent(result, customerName) },
      { number: '03', title: '연애운과 배우자운', content: fortune.love },
      { number: '04', title: '나의 재물운 분석', content: fortune.wealth },
      { number: '05', title: '직업과 성공의 운명', content: fortune.career },
      { number: '06', title: '사주로 보는 건강과 체질', content: fortune.health },
      { number: '07', title: '당신을 도와줄 운명의 귀인', content: `${customerName}님의 사주에서 용신인 ${yongSin}의 기운을 가진 사람이 귀인이 될 수 있습니다. 이러한 사람과의 만남을 소중히 여기시기 바랍니다.` },
      { number: '08', title: '운명을 바꾸는 방법', content: `용신 ${yongSin}을 활용한 개운법:\n\n행운색: ${fortune.luckyColor}\n행운 숫자: ${fortune.luckyNumber}\n행운 방향: ${fortune.luckyDirection}\n\n일상에서 용신의 기운을 높이는 방법을 꾸준히 실천하시면 운이 좋아질 것입니다.` },
      { number: '09', title: '월별 상세 운세', content: buildMonthlyContent(result) },
      { number: '10', title: '앞으로의 10년간 운명 분석', content: buildDaeunContent(result, customerName) },
    ],
    model: 'fallback-template',
  };
}

// ─── 내부 헬퍼 ───

function buildBasicContent(result: SajuResult, name: string): string {
  const { fortune, fourPillars, yongSin } = result;
  const parts = [
    `${name}님의 사주는 ${fourPillars.day.heavenlyStem}(${fourPillars.day.heavenlyStemKo}) 일간으로, ${fourPillars.day.elementKo}(${fourPillars.day.element})의 기운을 타고났습니다.`,
    '',
    fortune.personality,
    '',
    `직업적으로는 ${fortune.career}`,
    '',
    `재물 면에서는 ${fortune.wealth}`,
    '',
    `건강 측면에서는 ${fortune.health}`,
    '',
    `애정운을 보면, ${fortune.love}`,
    '',
    `종합적으로, ${fortune.overall}`,
    '',
    `용신은 ${yongSin}이며, 행운색은 ${fortune.luckyColor}, 행운 숫자는 ${fortune.luckyNumber}, 행운 방향은 ${fortune.luckyDirection}입니다.`,
  ];
  return parts.join('\n');
}

function buildMonthlyContent(result: SajuResult): string {
  if (!result.monthFortunes?.length) {
    return '월운 데이터가 아직 계산되지 않았습니다.';
  }
  return result.monthFortunes.map(mf =>
    `[${mf.month}월] ${mf.stemKo}${mf.branchKo} (${mf.elementKo})\n${mf.summary}`
  ).join('\n\n');
}

function buildDaeunContent(result: SajuResult, name: string): string {
  if (!result.daeUn?.length) {
    return '대운 데이터가 아직 계산되지 않았습니다.';
  }
  const lines = [`${name}님의 대운 흐름을 살펴보겠습니다.\n`];
  for (const du of result.daeUn) {
    lines.push(`[${du.startYear}~${du.endYear}년, ${du.age}세~] ${du.heavenlyStem}${du.earthlyBranch} (${du.element})`);
    lines.push(`${du.description}\n`);
  }
  return lines.join('\n');
}
