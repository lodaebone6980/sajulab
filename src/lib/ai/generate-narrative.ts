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
  getPremiumChapterDefinitions,
  getNewYearChapterDefinitions,
  type ChapterDefinition,
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

// ─── 단일 챕터 생성 (병렬 실행용) ───

async function generateSingleChapter(
  client: ReturnType<typeof getOpenAIClient>,
  sajuData: string,
  customerName: string,
  chDef: ChapterDefinition,
): Promise<{ chapter: NarrativeChapter; inputTokens: number; outputTokens: number }> {
  const MIN_CHARS = 8000;

  const chapterPrompt = `다음은 프리미엄 사주 분석서의 한 챕터입니다. 반드시 매우 길고 상세하게 작성하세요.

═══════════════════════════════════════
📋 절대 규칙 (반드시 지켜야 합니다):
═══════════════════════════════════════
1. 분량: 반드시 10000자(한글 기준) 이상 작성. 짧으면 불합격입니다.
2. 호칭: 반드시 "${customerName}님"으로만 호칭. "의뢰자님" 절대 금지.
3. 구조: [소제목1] → 상세 설명 3~5문단 → [소제목2] → 상세 설명 3~5문단 → ... 최소 6개 이상의 소제목 필수.
4. 소제목 형식: 반드시 대괄호 [제목] 형식으로 작성 (## 마크다운 사용 금지).
5. 각 소제목 아래 최소 500자 이상의 본문을 작성하세요.
6. 절대 요약하지 마세요. 원리 → 사례 → 비유 → 실천방안 → 주의사항 순서로 풍부하게 서술하세요.
═══════════════════════════════════════

${sajuData}

챕터: "${chDef.title}"
작성 가이드:
${chDef.guide}

⚠️ 다시 한번 강조: 10000자 이상 필수! 짧은 답변은 절대 불가!
반드시 챕터 본문 텍스트만 출력하세요. JSON 형식이 아닙니다. 챕터 제목은 포함하지 마세요.`;

  let inputTokens = 0;
  let outputTokens = 0;

  try {
    console.log(`[AI] 🚀 챕터 ${chDef.number} "${chDef.title}" 병렬 생성 시작...`);
    const startTime = Date.now();

    const chResp = await client.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: chapterPrompt },
      ],
      temperature: 0.75,
      max_tokens: 16000,
    });

    let content = chResp.choices[0]?.message?.content || '';
    const usage = chResp.usage;
    inputTokens += usage?.prompt_tokens || 0;
    outputTokens += usage?.completion_tokens || 0;

    console.log(`[AI] 챕터 ${chDef.number} 1차 완료 (${content.length}자, ${usage?.completion_tokens} tokens)`);

    // 연속 호출: 글자 수가 부족하면 이어서 작성 요청 (최대 2회)
    let attempts = 0;
    while (content.length < MIN_CHARS && attempts < 2) {
      attempts++;
      console.log(`[AI] 챕터 ${chDef.number} 연속 호출 ${attempts}회 (현재 ${content.length}자 < ${MIN_CHARS}자)`);

      const continuePrompt = `이전에 작성한 "${chDef.title}" 챕터의 내용이 아직 부족합니다. 아래 내용에 이어서 추가 내용을 작성하세요.

═══════════════════════════════════════
📋 절대 규칙:
═══════════════════════════════════════
1. 이전 내용을 반복하지 마세요. 새로운 소제목과 새로운 관점으로 이어서 작성하세요.
2. "${customerName}님"으로만 호칭하세요.
3. 새로운 [소제목]을 4개 이상 추가하고, 각 소제목 아래 500자 이상 작성하세요.
4. 추가로 5000자 이상 작성하세요.
═══════════════════════════════════════

${sajuData}

이전까지 작성된 내용 (마지막 500자):
...${content.slice(-500)}

위 내용에 이어서 "${chDef.title}" 챕터의 나머지를 작성하세요. 새로운 내용만 출력하세요.`;

      try {
        const contResp = await client.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: continuePrompt },
          ],
          temperature: 0.75,
          max_tokens: 16000,
        });

        const addedContent = contResp.choices[0]?.message?.content || '';
        const contUsage = contResp.usage;
        inputTokens += contUsage?.prompt_tokens || 0;
        outputTokens += contUsage?.completion_tokens || 0;

        content += '\n\n' + addedContent;
        console.log(`[AI] 챕터 ${chDef.number} 연속 ${attempts}회 완료 (+${addedContent.length}자, 총 ${content.length}자)`);
      } catch (contErr) {
        console.error(`[AI] 챕터 ${chDef.number} 연속 호출 실패:`, contErr);
        break;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[AI] ✅ 챕터 ${chDef.number} 최종 완료 (${elapsed}ms, ${content.length}자)`);

    return {
      chapter: { number: chDef.number, title: chDef.title, content },
      inputTokens,
      outputTokens,
    };
  } catch (err) {
    console.error(`[AI] ❌ 챕터 ${chDef.number} 생성 실패:`, err);
    return {
      chapter: { number: chDef.number, title: chDef.title, content: `${chDef.title}에 대한 분석 내용이 생성되지 않았습니다.` },
      inputTokens,
      outputTokens,
    };
  }
}

// ─── 최종 검토 단계: 전체 일관성 및 호칭 정리 ───

async function reviewAndRefine(
  client: ReturnType<typeof getOpenAIClient>,
  chapters: NarrativeChapter[],
  customerName: string,
): Promise<NarrativeChapter[]> {
  console.log(`[AI] 🔍 최종 검토 시작 (${chapters.length}개 챕터)...`);
  const startTime = Date.now();

  // 각 챕터의 기본 정제 (LLM 호출 없이 빠르게)
  const refined = chapters.map(ch => {
    let content = ch.content;

    // 1. 호칭 통일: "의뢰자님", "고객님" 등을 customerName으로 교체
    content = content.replace(/의뢰자님/g, `${customerName}님`);
    content = content.replace(/고객님/g, `${customerName}님`);
    content = content.replace(/귀하/g, `${customerName}님`);

    // 2. 불필요한 마크다운 제거
    content = content.replace(/^#{1,6}\s+/gm, (match) => {
      // ## 소제목 → [소제목] 형식으로 변환
      const title = match.replace(/^#{1,6}\s+/, '').trim();
      return `[${title}]`;
    });
    // **굵은체** 제거
    content = content.replace(/\*\*(.*?)\*\*/g, '$1');

    // 3. 연속 빈 줄 정리 (3줄 이상 → 2줄로)
    content = content.replace(/\n{3,}/g, '\n\n');

    // 4. 챕터 제목이 본문 시작에 포함된 경우 제거
    const titlePattern = new RegExp(`^\\[?${ch.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]?\\s*\n`, 'i');
    content = content.replace(titlePattern, '');

    return { ...ch, content };
  });

  const elapsed = Date.now() - startTime;
  console.log(`[AI] ✅ 최종 검토 완료 (${elapsed}ms)`);

  // 검토 결과 요약 로그
  for (const ch of refined) {
    console.log(`[AI]   챕터 ${ch.number}: ${ch.title} (${ch.content.length}자)`);
  }

  return refined;
}

// ─── 병렬 챕터 생성 (Premium and NewYear) ───

async function generateChapterByChapter(
  sajuData: string,
  customerName: string,
  productCode: string,
  onProgress?: (chapterNum: number, totalChapters: number, phase: string) => void,
): Promise<NarrativeResult | null> {
  const client = getOpenAIClient();
  const year = new Date().getFullYear();

  // Get chapter definitions based on product
  const chapterDefs = productCode === 'saju-newyear'
    ? getNewYearChapterDefinitions(customerName, year)
    : getPremiumChapterDefinitions(customerName);

  console.log(`[AI] ⚡ 병렬 생성 모드: 인사말 + ${chapterDefs.length}개 챕터 동시 시작`);
  const totalStartTime = Date.now();

  // ═══════════════════════════════════════
  // 1단계: 인사말 + 모든 챕터를 동시에 병렬 생성
  // ═══════════════════════════════════════

  const greetingPrompt = productCode === 'saju-newyear'
    ? `다음 사주 데이터를 기반으로 ${year}년 신년운세 분석서의 인사말을 작성하세요.\n반드시 "${customerName}님"으로 호칭하세요.\n사주의 특성과 새해 전망을 포함한 따뜻하고 정성스러운 인사말을 800~1200자로 작성하세요.\n\n${sajuData}\n\n반드시 인사말 텍스트만 출력하세요. JSON 형식이 아닙니다.`
    : `다음 사주 데이터를 기반으로 프리미엄 사주 분석서의 인사말을 작성하세요.\n반드시 "${customerName}님"으로 호칭하세요.\n사주의 특성과 운명의 흐름을 포함한 따뜻하고 정성스러운 인사말을 800~1200자로 작성하세요.\n\n${sajuData}\n\n반드시 인사말 텍스트만 출력하세요. JSON 형식이 아닙니다.`;

  // 인사말 Promise
  const greetingPromise = client.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: greetingPrompt },
    ],
    temperature: 0.75,
    max_tokens: 2000,
  }).then(resp => {
    const text = resp.choices[0]?.message?.content || '';
    console.log(`[AI] ✅ 인사말 완료 (${text.length}자)`);
    onProgress?.(0, chapterDefs.length, 'greeting_done');
    return text;
  }).catch(e => {
    console.error('[AI] ❌ 인사말 생성 실패:', e);
    return `${customerName}님, 안녕하세요. 이 분석서가 삶의 좋은 나침반이 되기를 바랍니다.`;
  });

  // 모든 챕터 Promise (병렬 실행!)
  let completedCount = 0;
  const chapterPromises = chapterDefs.map(chDef =>
    generateSingleChapter(client, sajuData, customerName, chDef).then(result => {
      completedCount++;
      onProgress?.(completedCount, chapterDefs.length, 'chapter_done');
      console.log(`[AI] 📊 진행률: ${completedCount}/${chapterDefs.length} 챕터 완료`);
      return result;
    })
  );

  // 인사말 + 모든 챕터를 동시에 실행!
  const [greeting, ...chapterResults] = await Promise.all([
    greetingPromise,
    ...chapterPromises,
  ]);

  // 토큰 집계
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const chapters: NarrativeChapter[] = [];

  for (const result of chapterResults) {
    chapters.push(result.chapter);
    totalInputTokens += result.inputTokens;
    totalOutputTokens += result.outputTokens;
  }

  // 챕터 번호순으로 정렬 (병렬이라 순서 보장 안 됨)
  chapters.sort((a, b) => a.number.localeCompare(b.number));

  const parallelElapsed = Date.now() - totalStartTime;
  console.log(`[AI] ⚡ 병렬 생성 완료 (${parallelElapsed}ms, ${chapters.length}개 챕터)`);

  // ═══════════════════════════════════════
  // 2단계: 최종 검토 (호칭 통일, 마크다운 정리, 일관성 체크)
  // ═══════════════════════════════════════

  const refinedChapters = await reviewAndRefine(client, chapters, customerName);

  const totalElapsed = Date.now() - totalStartTime;
  const totalChars = refinedChapters.reduce((sum, ch) => sum + ch.content.length, 0);
  console.log(`[AI] 🎉 전체 완료: ${totalElapsed}ms (${Math.round(totalElapsed / 1000)}초), 총 ${totalChars}자, ${totalInputTokens + totalOutputTokens} tokens`);

  return {
    greeting,
    chapters: refinedChapters,
    model: 'gpt-4.1',
    tokenUsage: {
      input: totalInputTokens,
      output: totalOutputTokens,
      total: totalInputTokens + totalOutputTokens,
    },
  };
}

// ─── 상품별 내러티브 생성 ───

export async function generateNarrative(
  result: SajuResult,
  customerName: string,
  productCode: string,
  onProgress?: (chapterNum: number, totalChapters: number, phase: string) => void,
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

  // Premium and NewYear: chapter-by-chapter generation for 100+ pages
  if (productCode === 'saju-premium' || productCode === 'saju-newyear') {
    try {
      console.log(`[AI] GPT-4.1로 ${productCode} 챕터별 내러티브 생성 시작...`);
      const startTime = Date.now();
      const narrativeResult = await generateChapterByChapter(sajuData, customerName, productCode, onProgress);
      const elapsed = Date.now() - startTime;
      console.log(`[AI] 전체 내러티브 생성 완료 (${elapsed}ms, ${narrativeResult?.chapters.length}개 챕터)`);
      return narrativeResult;
    } catch (error) {
      console.error('[AI] 챕터별 내러티브 생성 오류:', error);
      return null;
    }
  }

  // Basic: single call
  const userPrompt = getBasicAnalysisPrompt(sajuData, customerName);

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
      temperature: 0.75,
      max_tokens: 8000,
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
