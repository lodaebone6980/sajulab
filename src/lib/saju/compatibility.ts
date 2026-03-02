// 궁합 분석 (宮合) - 두 사람의 사주를 비교하여 궁합 점수 산출
//
// 전통 명리학 궁합 판단 기준:
//  1. 일간합(日干合) - 일간끼리 천간합이면 최고 궁합
//  2. 일지합(日支合) - 일지끼리 육합/삼합이면 좋은 궁합
//  3. 오행 보완성   - 서로의 부족한 오행을 보완하는지
//  4. 용신 보완성   - 상대의 일간이 나의 용신 오행인지
//  5. 지지 충/형/해 - 일지끼리 충이면 갈등, 형/해도 감점
//  6. 음양 조화     - 양-음 조합이 양-양, 음-음보다 좋음
//  7. 상생/상극     - 일간 오행끼리 상생이면 +, 상극이면 -
//  8. 띠 궁합       - 전통적 삼합/육합/육충 띠 궁합

import type { FourPillars, ElementDistribution, FiveElementKo, FiveElement, HeavenlyStem, EarthlyBranch, BirthInfo } from './types';
import { STEM_ELEMENT, BRANCH_ELEMENT, STEM_YINYANG, ELEMENT_GENERATING, ELEMENT_OVERCOMING, HEAVENLY_STEMS, BRANCH_HANJA_TO_KO, EARTHLY_BRANCHES, EARTHLY_BRANCH_ANIMALS, STEM_HANJA_TO_KO } from './constants';

// ══════════════════════════════════════════════
// 결과 타입
// ══════════════════════════════════════════════

export interface CompatibilityDetail {
  category: string;       // 판단 항목
  score: number;          // 해당 항목 점수 (양수=좋음, 음수=나쁨)
  maxScore: number;       // 최대 가능 점수
  description: string;    // 설명
  rating: 'excellent' | 'good' | 'neutral' | 'caution' | 'bad';
}

export interface CompatibilityResult {
  totalScore: number;       // 총점 (0-100)
  grade: string;            // 등급 (천생연분/좋은궁합/보통궁합/노력필요/상극궁합)
  summary: string;          // 종합 요약
  details: CompatibilityDetail[];
  strengths: string[];      // 장점
  weaknesses: string[];     // 약점
  advice: string;           // 조언
}

// ══════════════════════════════════════════════
// 천간합 데이터
// ══════════════════════════════════════════════

const STEM_COMBINE_PAIRS: [HeavenlyStem, HeavenlyStem, FiveElement, string][] = [
  ['甲', '己', '土', '중정지합(中正之合) - 성실하고 안정적인 만남'],
  ['乙', '庚', '金', '인의지합(仁義之合) - 서로의 의리를 지키는 인연'],
  ['丙', '辛', '水', '위엄지합(威嚴之合) - 위엄과 부드러움의 조화'],
  ['丁', '壬', '木', '인수지합(仁壽之合) - 지혜와 인자함의 만남'],
  ['戊', '癸', '火', '무정지합(無情之合) - 격정적이나 변화가 많은 인연'],
];

// ══════════════════════════════════════════════
// 지지 육합 데이터
// ══════════════════════════════════════════════

const BRANCH_YUKAP_PAIRS: [EarthlyBranch, EarthlyBranch, FiveElement][] = [
  ['子', '丑', '土'],
  ['寅', '亥', '木'],
  ['卯', '戌', '火'],
  ['辰', '酉', '金'],
  ['巳', '申', '水'],
  ['午', '未', '火'],
];

// 삼합
const BRANCH_SAMHAP_GROUPS: [EarthlyBranch, EarthlyBranch, EarthlyBranch][] = [
  ['申', '子', '辰'],
  ['寅', '午', '戌'],
  ['巳', '酉', '丑'],
  ['亥', '卯', '未'],
];

// 육충
const BRANCH_CHUNG_PAIRS: [EarthlyBranch, EarthlyBranch][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'],
  ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];

// 형
const BRANCH_HYUNG_PAIRS: [EarthlyBranch, EarthlyBranch][] = [
  ['寅', '巳'], ['巳', '申'], ['申', '寅'],
  ['丑', '戌'], ['戌', '未'], ['未', '丑'],
  ['子', '卯'], ['卯', '子'],
];

// 해
const BRANCH_HAE_PAIRS: [EarthlyBranch, EarthlyBranch][] = [
  ['子', '未'], ['丑', '午'], ['寅', '巳'],
  ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
];

// ══════════════════════════════════════════════
// 헬퍼 함수
// ══════════════════════════════════════════════

function isStemCombine(s1: HeavenlyStem, s2: HeavenlyStem): { match: boolean; desc: string } {
  for (const [a, b, , desc] of STEM_COMBINE_PAIRS) {
    if ((s1 === a && s2 === b) || (s1 === b && s2 === a)) {
      return { match: true, desc };
    }
  }
  return { match: false, desc: '' };
}

function isBranchYukap(b1: EarthlyBranch, b2: EarthlyBranch): boolean {
  return BRANCH_YUKAP_PAIRS.some(([a, b]) =>
    (b1 === a && b2 === b) || (b1 === b && b2 === a)
  );
}

function isBranchSamhap(b1: EarthlyBranch, b2: EarthlyBranch): boolean {
  return BRANCH_SAMHAP_GROUPS.some(([a, b, c]) => {
    const set = new Set([a, b, c]);
    return set.has(b1) && set.has(b2);
  });
}

function isBranchChung(b1: EarthlyBranch, b2: EarthlyBranch): boolean {
  return BRANCH_CHUNG_PAIRS.some(([a, b]) =>
    (b1 === a && b2 === b) || (b1 === b && b2 === a)
  );
}

function isBranchHyung(b1: EarthlyBranch, b2: EarthlyBranch): boolean {
  return BRANCH_HYUNG_PAIRS.some(([a, b]) =>
    (b1 === a && b2 === b) || (b1 === b && b2 === a)
  );
}

function isBranchHae(b1: EarthlyBranch, b2: EarthlyBranch): boolean {
  return BRANCH_HAE_PAIRS.some(([a, b]) =>
    (b1 === a && b2 === b) || (b1 === b && b2 === a)
  );
}

function elementKoOf(el: FiveElement): FiveElementKo {
  const m: Record<FiveElement, FiveElementKo> = { '木': '목', '火': '화', '土': '토', '金': '금', '水': '수' };
  return m[el];
}

function isGenerating(from: FiveElement, to: FiveElement): boolean {
  return ELEMENT_GENERATING[from] === to;
}

function isOvercoming(from: FiveElement, to: FiveElement): boolean {
  return ELEMENT_OVERCOMING[from] === to;
}

function getAnimal(branch: EarthlyBranch): string {
  const idx = EARTHLY_BRANCHES.indexOf(branch);
  return EARTHLY_BRANCH_ANIMALS[idx] || '';
}

// ══════════════════════════════════════════════
// 메인 궁합 분석 함수
// ══════════════════════════════════════════════

export function analyzeCompatibility(
  person1: { fourPillars: FourPillars; elementDistribution: ElementDistribution; yongSin: FiveElementKo; giSin: FiveElementKo; birthInfo: BirthInfo },
  person2: { fourPillars: FourPillars; elementDistribution: ElementDistribution; yongSin: FiveElementKo; giSin: FiveElementKo; birthInfo: BirthInfo },
): CompatibilityResult {
  const details: CompatibilityDetail[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const fp1 = person1.fourPillars;
  const fp2 = person2.fourPillars;

  const dayStem1 = fp1.day.heavenlyStem;
  const dayStem2 = fp2.day.heavenlyStem;
  const dayBranch1 = fp1.day.earthlyBranch;
  const dayBranch2 = fp2.day.earthlyBranch;
  const dayEl1 = STEM_ELEMENT[dayStem1];
  const dayEl2 = STEM_ELEMENT[dayStem2];

  // ── 1. 일간합 (天干合) - 최대 20점 ──
  const stemCombine = isStemCombine(dayStem1, dayStem2);
  if (stemCombine.match) {
    details.push({
      category: '일간합 (日干合)',
      score: 20,
      maxScore: 20,
      description: `${STEM_HANJA_TO_KO[dayStem1]}(${dayStem1})와 ${STEM_HANJA_TO_KO[dayStem2]}(${dayStem2})가 천간합! ${stemCombine.desc}`,
      rating: 'excellent',
    });
    strengths.push('일간끼리 천간합으로 가장 이상적인 궁합입니다');
  } else {
    details.push({
      category: '일간합 (日干合)',
      score: 0,
      maxScore: 20,
      description: `${STEM_HANJA_TO_KO[dayStem1]}(${dayStem1})와 ${STEM_HANJA_TO_KO[dayStem2]}(${dayStem2}) - 천간합이 아닙니다`,
      rating: 'neutral',
    });
  }

  // ── 2. 일지합/충 (日支) - 최대 15점 ──
  if (isBranchYukap(dayBranch1, dayBranch2)) {
    details.push({
      category: '일지 궁합 (日支)',
      score: 15,
      maxScore: 15,
      description: `${BRANCH_HANJA_TO_KO[dayBranch1]}(${dayBranch1})와 ${BRANCH_HANJA_TO_KO[dayBranch2]}(${dayBranch2}) - 일지 육합! 가정이 화목합니다`,
      rating: 'excellent',
    });
    strengths.push('일지가 육합으로 결혼 후 가정이 안정적입니다');
  } else if (isBranchSamhap(dayBranch1, dayBranch2)) {
    details.push({
      category: '일지 궁합 (日支)',
      score: 10,
      maxScore: 15,
      description: `${BRANCH_HANJA_TO_KO[dayBranch1]}(${dayBranch1})와 ${BRANCH_HANJA_TO_KO[dayBranch2]}(${dayBranch2}) - 일지 삼합 관계. 서로 통하는 면이 있습니다`,
      rating: 'good',
    });
    strengths.push('일지가 삼합 관계로 정서적 교감이 좋습니다');
  } else if (isBranchChung(dayBranch1, dayBranch2)) {
    details.push({
      category: '일지 궁합 (日支)',
      score: -10,
      maxScore: 15,
      description: `${BRANCH_HANJA_TO_KO[dayBranch1]}(${dayBranch1})와 ${BRANCH_HANJA_TO_KO[dayBranch2]}(${dayBranch2}) - 일지 충! 갈등이 잦을 수 있습니다`,
      rating: 'bad',
    });
    weaknesses.push('일지가 육충으로 부부 갈등에 주의가 필요합니다');
  } else if (isBranchHyung(dayBranch1, dayBranch2)) {
    details.push({
      category: '일지 궁합 (日支)',
      score: -5,
      maxScore: 15,
      description: `${BRANCH_HANJA_TO_KO[dayBranch1]}(${dayBranch1})와 ${BRANCH_HANJA_TO_KO[dayBranch2]}(${dayBranch2}) - 일지 형. 서로 상처를 줄 수 있습니다`,
      rating: 'caution',
    });
    weaknesses.push('일지가 형으로 감정적 갈등에 주의하세요');
  } else if (isBranchHae(dayBranch1, dayBranch2)) {
    details.push({
      category: '일지 궁합 (日支)',
      score: -3,
      maxScore: 15,
      description: `${BRANCH_HANJA_TO_KO[dayBranch1]}(${dayBranch1})와 ${BRANCH_HANJA_TO_KO[dayBranch2]}(${dayBranch2}) - 일지 해. 미묘한 불편함이 있을 수 있습니다`,
      rating: 'caution',
    });
  } else {
    details.push({
      category: '일지 궁합 (日支)',
      score: 3,
      maxScore: 15,
      description: `${BRANCH_HANJA_TO_KO[dayBranch1]}(${dayBranch1})와 ${BRANCH_HANJA_TO_KO[dayBranch2]}(${dayBranch2}) - 특별한 합/충 없이 무난합니다`,
      rating: 'neutral',
    });
  }

  // ── 3. 오행 상생/상극 (일간 기준) - 최대 15점 ──
  if (isGenerating(dayEl1, dayEl2) || isGenerating(dayEl2, dayEl1)) {
    const from = isGenerating(dayEl1, dayEl2) ? dayEl1 : dayEl2;
    const to = isGenerating(dayEl1, dayEl2) ? dayEl2 : dayEl1;
    details.push({
      category: '오행 상생 (五行)',
      score: 15,
      maxScore: 15,
      description: `${elementKoOf(from)}생${elementKoOf(to)} - 서로의 기운을 살려주는 상생 관계입니다`,
      rating: 'excellent',
    });
    strengths.push(`${elementKoOf(from)}이 ${elementKoOf(to)}을 생해주는 상생 관계로 서로 돕습니다`);
  } else if (dayEl1 === dayEl2) {
    details.push({
      category: '오행 상생 (五行)',
      score: 8,
      maxScore: 15,
      description: `같은 ${elementKoOf(dayEl1)} 오행 - 동질감이 있지만 경쟁이 될 수 있습니다`,
      rating: 'good',
    });
    strengths.push('같은 오행으로 서로의 마음을 잘 이해합니다');
  } else if (isOvercoming(dayEl1, dayEl2) || isOvercoming(dayEl2, dayEl1)) {
    const from = isOvercoming(dayEl1, dayEl2) ? dayEl1 : dayEl2;
    const to = isOvercoming(dayEl1, dayEl2) ? dayEl2 : dayEl1;
    details.push({
      category: '오행 상생 (五行)',
      score: -5,
      maxScore: 15,
      description: `${elementKoOf(from)}극${elementKoOf(to)} - 한쪽이 다른 쪽을 억압하는 상극 관계입니다`,
      rating: 'caution',
    });
    weaknesses.push(`${elementKoOf(from)}이 ${elementKoOf(to)}를 극하므로 힘의 불균형에 주의하세요`);
  } else {
    details.push({
      category: '오행 상생 (五行)',
      score: 5,
      maxScore: 15,
      description: `${elementKoOf(dayEl1)}와 ${elementKoOf(dayEl2)} - 직접적 상생/상극이 아닌 무난한 관계`,
      rating: 'neutral',
    });
  }

  // ── 4. 용신 보완성 - 최대 15점 ──
  const elKoMap: Record<FiveElement, FiveElementKo> = { '木': '목', '火': '화', '土': '토', '金': '금', '水': '수' };
  const dayElKo1 = elKoMap[dayEl1];
  const dayElKo2 = elKoMap[dayEl2];

  let yongsinScore = 0;
  const yongsinNotes: string[] = [];

  if (dayElKo2 === person1.yongSin) {
    yongsinScore += 8;
    yongsinNotes.push(`상대방의 일간(${dayElKo2})이 나의 용신과 같습니다`);
  }
  if (dayElKo1 === person2.yongSin) {
    yongsinScore += 7;
    yongsinNotes.push(`나의 일간(${dayElKo1})이 상대방의 용신과 같습니다`);
  }
  if (dayElKo2 === person1.giSin) {
    yongsinScore -= 5;
    yongsinNotes.push(`상대방의 일간이 나의 기신이라 부담이 될 수 있습니다`);
  }
  if (dayElKo1 === person2.giSin) {
    yongsinScore -= 4;
    yongsinNotes.push(`나의 일간이 상대방의 기신이라 부담을 줄 수 있습니다`);
  }

  yongsinScore = Math.max(-5, Math.min(15, yongsinScore));

  if (yongsinScore > 0) {
    details.push({
      category: '용신 보완 (用神)',
      score: yongsinScore,
      maxScore: 15,
      description: yongsinNotes.join('. ') || '서로의 용신 오행을 보완합니다',
      rating: yongsinScore >= 10 ? 'excellent' : 'good',
    });
    if (yongsinScore >= 10) strengths.push('서로의 용신 오행을 보완하여 큰 도움이 됩니다');
  } else if (yongsinScore < 0) {
    details.push({
      category: '용신 보완 (用神)',
      score: yongsinScore,
      maxScore: 15,
      description: yongsinNotes.join('. ') || '용신 관계가 좋지 않습니다',
      rating: 'caution',
    });
    weaknesses.push('기신 관계가 있어 서로에게 스트레스가 될 수 있습니다');
  } else {
    details.push({
      category: '용신 보완 (用神)',
      score: 3,
      maxScore: 15,
      description: '용신/기신 관계에서 특별한 영향이 없습니다',
      rating: 'neutral',
    });
  }

  // ── 5. 오행 보완도 - 최대 10점 ──
  const ed1 = person1.elementDistribution;
  const ed2 = person2.elementDistribution;

  const weakElements1 = findWeakElements(ed1);
  const weakElements2 = findWeakElements(ed2);
  const strongElements1 = findStrongElements(ed1);
  const strongElements2 = findStrongElements(ed2);

  let complementScore = 0;
  const complementNotes: string[] = [];

  for (const weak of weakElements1) {
    if (strongElements2.includes(weak)) {
      complementScore += 3;
      complementNotes.push(`나의 부족한 ${weak}을 상대가 보완`);
    }
  }
  for (const weak of weakElements2) {
    if (strongElements1.includes(weak)) {
      complementScore += 2;
      complementNotes.push(`상대의 부족한 ${weak}을 내가 보완`);
    }
  }

  complementScore = Math.min(10, complementScore);

  details.push({
    category: '오행 보완도',
    score: complementScore,
    maxScore: 10,
    description: complementNotes.length > 0
      ? complementNotes.join(', ')
      : '오행 보완 관계가 특별하지 않습니다',
    rating: complementScore >= 7 ? 'excellent' : complementScore >= 4 ? 'good' : 'neutral',
  });
  if (complementScore >= 7) strengths.push('서로의 부족한 오행을 잘 보완해줍니다');

  // ── 6. 음양 조화 - 최대 10점 ──
  const yy1 = STEM_YINYANG[dayStem1];
  const yy2 = STEM_YINYANG[dayStem2];

  if (yy1 !== yy2) {
    details.push({
      category: '음양 조화 (陰陽)',
      score: 10,
      maxScore: 10,
      description: `${yy1 === '陽' ? '양' : '음'}(${STEM_HANJA_TO_KO[dayStem1]})과 ${yy2 === '陽' ? '양' : '음'}(${STEM_HANJA_TO_KO[dayStem2]}) - 음양이 조화롭습니다`,
      rating: 'excellent',
    });
    strengths.push('음양이 조화로워 서로를 보완합니다');
  } else {
    details.push({
      category: '음양 조화 (陰陽)',
      score: 4,
      maxScore: 10,
      description: `둘 다 ${yy1 === '陽' ? '양' : '음'} - 동질적이나 대립할 수 있습니다`,
      rating: 'neutral',
    });
  }

  // ── 7. 띠 궁합 (년지) - 최대 10점 ──
  const yearBranch1 = fp1.year.earthlyBranch;
  const yearBranch2 = fp2.year.earthlyBranch;
  const animal1 = getAnimal(yearBranch1);
  const animal2 = getAnimal(yearBranch2);

  if (isBranchYukap(yearBranch1, yearBranch2)) {
    details.push({
      category: '띠 궁합',
      score: 10,
      maxScore: 10,
      description: `${animal1}띠와 ${animal2}띠 - 육합! 전통적으로 최고의 띠 궁합입니다`,
      rating: 'excellent',
    });
    strengths.push(`${animal1}띠와 ${animal2}띠는 전통적 최고 궁합입니다`);
  } else if (isBranchSamhap(yearBranch1, yearBranch2)) {
    details.push({
      category: '띠 궁합',
      score: 8,
      maxScore: 10,
      description: `${animal1}띠와 ${animal2}띠 - 삼합 관계로 좋은 궁합입니다`,
      rating: 'good',
    });
    strengths.push(`${animal1}띠와 ${animal2}띠는 삼합 관계로 잘 맞습니다`);
  } else if (isBranchChung(yearBranch1, yearBranch2)) {
    details.push({
      category: '띠 궁합',
      score: -5,
      maxScore: 10,
      description: `${animal1}띠와 ${animal2}띠 - 육충 관계로 충돌이 있을 수 있습니다`,
      rating: 'bad',
    });
    weaknesses.push(`${animal1}띠와 ${animal2}띠는 충 관계로 성격 차이가 있습니다`);
  } else {
    details.push({
      category: '띠 궁합',
      score: 3,
      maxScore: 10,
      description: `${animal1}띠와 ${animal2}띠 - 특별한 합/충 없이 무난합니다`,
      rating: 'neutral',
    });
  }

  // ── 8. 사주 전체 합/충 교차 분석 - 최대 5점 ──
  let crossScore = 0;
  const crossNotes: string[] = [];

  // 나의 년지 vs 상대 일지, 나의 월지 vs 상대 일지 등
  const branches1 = [fp1.year.earthlyBranch, fp1.month.earthlyBranch, fp1.day.earthlyBranch, fp1.hour.earthlyBranch];
  const branches2 = [fp2.year.earthlyBranch, fp2.month.earthlyBranch, fp2.day.earthlyBranch, fp2.hour.earthlyBranch];

  let crossCombines = 0;
  let crossClashes = 0;
  for (const b1 of branches1) {
    for (const b2 of branches2) {
      if (isBranchYukap(b1, b2)) crossCombines++;
      if (isBranchChung(b1, b2)) crossClashes++;
    }
  }

  crossScore = Math.min(5, crossCombines * 2) - Math.min(3, crossClashes);
  crossScore = Math.max(-3, Math.min(5, crossScore));

  if (crossCombines > 0) crossNotes.push(`지지 합 ${crossCombines}개`);
  if (crossClashes > 0) crossNotes.push(`지지 충 ${crossClashes}개`);

  details.push({
    category: '사주 교차 분석',
    score: crossScore,
    maxScore: 5,
    description: crossNotes.length > 0
      ? `전체 사주 교차 비교: ${crossNotes.join(', ')}`
      : '전체 사주 교차에서 특별한 관계가 없습니다',
    rating: crossScore >= 3 ? 'good' : crossScore <= -2 ? 'caution' : 'neutral',
  });

  // ══════════════════════════════════════════════
  // 최종 점수 계산
  // ══════════════════════════════════════════════

  const rawTotal = details.reduce((sum, d) => sum + d.score, 0);
  const maxTotal = details.reduce((sum, d) => sum + d.maxScore, 0);

  // 0-100 스케일로 변환 (음수 허용한 뒤 0-100 범위로 clamp)
  const totalScore = Math.round(Math.max(0, Math.min(100, (rawTotal / maxTotal) * 100)));

  // 등급 결정
  let grade: string;
  let summary: string;
  let advice: string;

  if (totalScore >= 85) {
    grade = '천생연분 (天生緣分)';
    summary = '매우 뛰어난 궁합입니다! 서로의 사주가 자연스럽게 조화를 이루며, 함께할 때 더욱 빛나는 인연입니다.';
    advice = '이미 좋은 궁합이지만, 서로에 대한 감사를 잊지 말고 표현하세요. 좋은 인연도 노력 없이는 유지되지 않습니다.';
  } else if (totalScore >= 70) {
    grade = '좋은 궁합 (佳緣)';
    summary = '좋은 궁합입니다. 서로 보완하는 부분이 많고, 안정적인 관계를 유지할 수 있습니다.';
    advice = '작은 갈등에 너무 예민하지 마세요. 대화와 이해를 통해 더욱 깊은 관계로 발전할 수 있습니다.';
  } else if (totalScore >= 50) {
    grade = '보통 궁합 (平緣)';
    summary = '보통 수준의 궁합입니다. 특별히 좋거나 나쁜 점이 없으며, 서로의 노력에 따라 관계가 달라집니다.';
    advice = '서로의 차이를 인정하고 존중하세요. 각자의 장점을 살리면 충분히 좋은 관계를 만들 수 있습니다.';
  } else if (totalScore >= 30) {
    grade = '노력 필요 (需努力)';
    summary = '다소 어려운 궁합이지만 불가능하지는 않습니다. 서로의 차이를 이해하고 노력하면 극복할 수 있습니다.';
    advice = '충돌하는 부분을 미리 알고 대비하세요. 인내와 양보가 관계를 지키는 열쇠입니다. 전문가 상담도 고려해보세요.';
  } else {
    grade = '상극 궁합 (相克)';
    summary = '상극의 기운이 강한 궁합입니다. 갈등이 잦을 수 있으며, 관계 유지에 많은 노력이 필요합니다.';
    advice = '서로를 변화시키려 하기보다 있는 그대로 받아들이는 것이 중요합니다. 각자의 공간과 시간을 존중하세요.';
  }

  return {
    totalScore,
    grade,
    summary,
    details,
    strengths: strengths.length > 0 ? strengths : ['특별히 두드러지는 장점은 없으나 무난한 관계입니다'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['특별히 큰 약점은 없습니다'],
    advice,
  };
}

// ══════════════════════════════════════════════
// 내부 헬퍼
// ══════════════════════════════════════════════

function findWeakElements(ed: ElementDistribution): FiveElementKo[] {
  const total = ed.wood + ed.fire + ed.earth + ed.metal + ed.water;
  if (total === 0) return [];
  const threshold = total * 0.1;
  const result: FiveElementKo[] = [];
  if (ed.wood <= threshold) result.push('목');
  if (ed.fire <= threshold) result.push('화');
  if (ed.earth <= threshold) result.push('토');
  if (ed.metal <= threshold) result.push('금');
  if (ed.water <= threshold) result.push('수');
  return result;
}

function findStrongElements(ed: ElementDistribution): FiveElementKo[] {
  const total = ed.wood + ed.fire + ed.earth + ed.metal + ed.water;
  if (total === 0) return [];
  const threshold = total * 0.3;
  const result: FiveElementKo[] = [];
  if (ed.wood >= threshold) result.push('목');
  if (ed.fire >= threshold) result.push('화');
  if (ed.earth >= threshold) result.push('토');
  if (ed.metal >= threshold) result.push('금');
  if (ed.water >= threshold) result.push('수');
  return result;
}
