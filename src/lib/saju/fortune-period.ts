// 년운(歲運) / 월운(月運) 계산기
// 특정 연도·월의 천간지지를 산출하고, 사주 원국과의 관계를 분석
//
// ■ 세운(歲運): 해당 연도의 간지 → 원국과 형충회합·십성·십이운성 분석
// ■ 월운(月運): 해당 월의 간지 → 원국과의 관계 분석
// ■ 대운(大運): 기존 calculator.ts의 calculateDaeUn 활용, 현재 대운 판별

import {
  HEAVENLY_STEMS, HEAVENLY_STEMS_KO,
  EARTHLY_BRANCHES, EARTHLY_BRANCHES_KO,
  STEM_ELEMENT, STEM_ELEMENT_KO,
  BRANCH_ELEMENT, BRANCH_ELEMENT_KO,
  STEM_YINYANG, STEM_YINYANG_KO,
  STEM_HANJA_TO_KO, BRANCH_HANJA_TO_KO,
  YEAR_STEM_TO_MONTH_START,
} from './constants';

import type {
  HeavenlyStem, HeavenlyStemKo,
  EarthlyBranch, EarthlyBranchKo,
  FiveElement, FiveElementKo,
  YinYang, YinYangKo,
  Pillar, FourPillars, BirthInfo,
} from './types';

import { calculateTenGod } from './calculator';
import { getTwelveStageBong } from './twelve-stages';
import { analyzeInteractionsWithLuck, getInteractionSummary, type Interaction } from './interactions';

// ══════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════

export interface YearFortune {
  year: number;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  stemKo: HeavenlyStemKo;
  branchKo: EarthlyBranchKo;
  element: FiveElement;
  elementKo: FiveElementKo;
  yinYang: YinYang;
  yinYangKo: YinYangKo;
  animal: string;               // 띠
  tenGod: string;               // 일간 기준 십성
  twelveStage: string;          // 일간 기준 십이운성
  interactions: Interaction[];   // 원국과의 형충회합
  favorableRating: number;       // 길흉 점수 (-100 ~ +100)
  summary: string;               // 한줄 요약
}

export interface MonthFortune {
  year: number;
  month: number;                 // 1~12 (양력 기준)
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  stemKo: HeavenlyStemKo;
  branchKo: EarthlyBranchKo;
  element: FiveElement;
  elementKo: FiveElementKo;
  tenGod: string;
  twelveStage: string;
  interactions: Interaction[];
  summary: string;
}

export interface CurrentFortunePeriod {
  daeUn: {                       // 현재 대운
    stem: HeavenlyStemKo;
    branch: EarthlyBranchKo;
    element: FiveElementKo;
    startYear: number;
    endYear: number;
    age: number;
  } | null;
  yearFortune: YearFortune;      // 올해 세운
  monthFortune: MonthFortune;    // 이번달 월운
}

// ══════════════════════════════════════════════
// 띠 동물
// ══════════════════════════════════════════════

const BRANCH_ANIMALS: Record<EarthlyBranch, string> = {
  '子': '쥐', '丑': '소', '寅': '호랑이', '卯': '토끼',
  '辰': '용', '巳': '뱀', '午': '말', '未': '양',
  '申': '원숭이', '酉': '닭', '戌': '개', '亥': '돼지',
};

// ══════════════════════════════════════════════
// 년주(歲運) 계산
// ══════════════════════════════════════════════

/**
 * 특정 연도의 천간지지 계산
 * 갑자년 기준: 1984년 = 甲子
 */
export function getYearPillar(year: number): Pillar {
  const stemIndex = ((year - 4) % 10 + 10) % 10;
  const branchIndex = ((year - 4) % 12 + 12) % 12;

  const stem = HEAVENLY_STEMS[stemIndex];
  const branch = EARTHLY_BRANCHES[branchIndex];

  return {
    heavenlyStem: stem,
    earthlyBranch: branch,
    heavenlyStemKo: STEM_HANJA_TO_KO[stem],
    earthlyBranchKo: BRANCH_HANJA_TO_KO[branch],
    element: STEM_ELEMENT[stem],
    elementKo: STEM_ELEMENT_KO[STEM_HANJA_TO_KO[stem]],
    yinYang: STEM_YINYANG[stem],
    yinYangKo: STEM_YINYANG_KO[STEM_HANJA_TO_KO[stem]],
  };
}

// ══════════════════════════════════════════════
// 월주(月運) 계산
// ══════════════════════════════════════════════

/**
 * 특정 연도·월의 천간지지 계산
 * 절기 기반 월(인월=2월 시작)
 */
export function getMonthPillar(year: number, month: number): Pillar {
  // 년간 인덱스
  const yearStemIndex = ((year - 4) % 10 + 10) % 10;

  // 월지: 인월(2월)=寅(idx 2), 묘월(3월)=卯(idx 3), ...
  const branchIndex = (month + 0) % 12; // 1월=丑(1), 2월=寅(2), ...

  // 월간: 월건법
  const monthStemStart = YEAR_STEM_TO_MONTH_START[yearStemIndex];
  const monthOffset = (month + 10) % 12; // 인월(2월)부터 offset: 2→0, 3→1, ...
  const stemIndex = (monthStemStart + monthOffset) % 10;

  const stem = HEAVENLY_STEMS[stemIndex];
  const branch = EARTHLY_BRANCHES[branchIndex];

  return {
    heavenlyStem: stem,
    earthlyBranch: branch,
    heavenlyStemKo: STEM_HANJA_TO_KO[stem],
    earthlyBranchKo: BRANCH_HANJA_TO_KO[branch],
    element: STEM_ELEMENT[stem],
    elementKo: STEM_ELEMENT_KO[STEM_HANJA_TO_KO[stem]],
    yinYang: STEM_YINYANG[stem],
    yinYangKo: STEM_YINYANG_KO[STEM_HANJA_TO_KO[stem]],
  };
}

// ══════════════════════════════════════════════
// 길흉 점수 계산
// ══════════════════════════════════════════════

/**
 * 형충회합 + 십성 + 용신 기반 길흉 점수 (-100 ~ +100)
 */
function calculateFavorableRating(
  interactions: Interaction[],
  tenGod: string,
  fortuneElement: FiveElementKo,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
): number {
  let score = 0;

  // 1. 형충회합 기반
  const summary = getInteractionSummary(interactions);
  score += summary.combines * 15;       // 합은 긍정
  score -= summary.clashes * 20;        // 충은 부정
  score -= summary.punishments * 15;    // 형은 부정
  score -= summary.harms * 10;          // 해는 부정
  score -= summary.destructions * 8;    // 파는 약한 부정

  // 2. 용신/기신 기반
  if (fortuneElement === yongSin) {
    score += 25; // 용신 운이면 크게 좋음
  } else if (fortuneElement === giSin) {
    score -= 25; // 기신 운이면 크게 나쁨
  }

  // 3. 십성 기반 가산
  const favorableTenGods = ['정재', '정관', '정인', '식신'];
  const unfavorableTenGods = ['상관', '편관', '겁재'];
  if (favorableTenGods.includes(tenGod)) {
    score += 10;
  } else if (unfavorableTenGods.includes(tenGod)) {
    score -= 10;
  }

  // 범위 제한
  return Math.max(-100, Math.min(100, score));
}

// ══════════════════════════════════════════════
// 세운(歲運) 분석
// ══════════════════════════════════════════════

/**
 * 특정 연도의 세운 분석
 */
export function analyzeYearFortune(
  year: number,
  fourPillars: FourPillars,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
): YearFortune {
  const pillar = getYearPillar(year);
  const dayStemIndex = HEAVENLY_STEMS.indexOf(fourPillars.day.heavenlyStem);
  const fortuneStemIndex = HEAVENLY_STEMS.indexOf(pillar.heavenlyStem);

  // 십성
  const tenGod = calculateTenGod(dayStemIndex, fortuneStemIndex);

  // 십이운성
  const twelveStage = getTwelveStageBong(fourPillars.day.heavenlyStem, pillar.earthlyBranch);

  // 형충회합
  const interactions = analyzeInteractionsWithLuck(
    fourPillars.year.earthlyBranch,
    fourPillars.month.earthlyBranch,
    fourPillars.day.earthlyBranch,
    fourPillars.hour.earthlyBranch,
    pillar.heavenlyStem,
    pillar.earthlyBranch,
    fourPillars.day.heavenlyStem,
  );

  // 길흉 점수
  const favorableRating = calculateFavorableRating(
    interactions, tenGod, pillar.elementKo, yongSin, giSin,
  );

  // 요약 생성
  const summary = generateYearSummary(year, pillar, tenGod, twelveStage, favorableRating, interactions);

  return {
    year,
    stem: pillar.heavenlyStem,
    branch: pillar.earthlyBranch,
    stemKo: pillar.heavenlyStemKo,
    branchKo: pillar.earthlyBranchKo,
    element: pillar.element,
    elementKo: pillar.elementKo,
    yinYang: pillar.yinYang,
    yinYangKo: pillar.yinYangKo,
    animal: BRANCH_ANIMALS[pillar.earthlyBranch],
    tenGod,
    twelveStage,
    interactions,
    favorableRating,
    summary,
  };
}

/**
 * 범위 내 세운 일괄 분석 (예: 2024~2033 10년)
 */
export function analyzeYearFortuneRange(
  startYear: number,
  endYear: number,
  fourPillars: FourPillars,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
): YearFortune[] {
  const results: YearFortune[] = [];
  for (let y = startYear; y <= endYear; y++) {
    results.push(analyzeYearFortune(y, fourPillars, yongSin, giSin));
  }
  return results;
}

// ══════════════════════════════════════════════
// 월운(月運) 분석
// ══════════════════════════════════════════════

/**
 * 특정 연도·월의 월운 분석
 */
export function analyzeMonthFortune(
  year: number,
  month: number,
  fourPillars: FourPillars,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
): MonthFortune {
  const pillar = getMonthPillar(year, month);
  const dayStemIndex = HEAVENLY_STEMS.indexOf(fourPillars.day.heavenlyStem);
  const fortuneStemIndex = HEAVENLY_STEMS.indexOf(pillar.heavenlyStem);

  const tenGod = calculateTenGod(dayStemIndex, fortuneStemIndex);
  const twelveStage = getTwelveStageBong(fourPillars.day.heavenlyStem, pillar.earthlyBranch);

  const interactions = analyzeInteractionsWithLuck(
    fourPillars.year.earthlyBranch,
    fourPillars.month.earthlyBranch,
    fourPillars.day.earthlyBranch,
    fourPillars.hour.earthlyBranch,
    pillar.heavenlyStem,
    pillar.earthlyBranch,
    fourPillars.day.heavenlyStem,
  );

  const summary = `${month}월 ${pillar.heavenlyStemKo}${pillar.earthlyBranchKo}(${pillar.elementKo}) - ${tenGod} · ${twelveStage}`;

  return {
    year,
    month,
    stem: pillar.heavenlyStem,
    branch: pillar.earthlyBranch,
    stemKo: pillar.heavenlyStemKo,
    branchKo: pillar.earthlyBranchKo,
    element: pillar.element,
    elementKo: pillar.elementKo,
    tenGod,
    twelveStage,
    interactions,
    summary,
  };
}

/**
 * 1년간 12개월 월운 일괄 분석
 */
export function analyzeMonthFortuneYear(
  year: number,
  fourPillars: FourPillars,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
): MonthFortune[] {
  const results: MonthFortune[] = [];
  for (let m = 1; m <= 12; m++) {
    results.push(analyzeMonthFortune(year, m, fourPillars, yongSin, giSin));
  }
  return results;
}

// ══════════════════════════════════════════════
// 현재 운세 기간 종합
// ══════════════════════════════════════════════

/**
 * 현재 시점의 대운 + 세운 + 월운 종합 분석
 */
export function getCurrentFortunePeriod(
  birthInfo: BirthInfo,
  fourPillars: FourPillars,
  daeUnList: Array<{ stem: string; branch: string; element: FiveElementKo; startYear: number; endYear: number; age: number }>,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
  currentDate?: Date,
): CurrentFortunePeriod {
  const now = currentDate || new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 현재 대운 찾기
  const currentDaeUn = daeUnList.find(
    du => currentYear >= du.startYear && currentYear <= du.endYear,
  ) || null;

  // 세운
  const yearFortune = analyzeYearFortune(currentYear, fourPillars, yongSin, giSin);

  // 월운
  const monthFortune = analyzeMonthFortune(currentYear, currentMonth, fourPillars, yongSin, giSin);

  return {
    daeUn: currentDaeUn ? {
      stem: currentDaeUn.stem as HeavenlyStemKo,
      branch: currentDaeUn.branch as EarthlyBranchKo,
      element: currentDaeUn.element,
      startYear: currentDaeUn.startYear,
      endYear: currentDaeUn.endYear,
      age: currentDaeUn.age,
    } : null,
    yearFortune,
    monthFortune,
  };
}

// ══════════════════════════════════════════════
// 요약 생성 헬퍼
// ══════════════════════════════════════════════

function generateYearSummary(
  year: number,
  pillar: Pillar,
  tenGod: string,
  twelveStage: string,
  rating: number,
  interactions: Interaction[],
): string {
  const animal = BRANCH_ANIMALS[pillar.earthlyBranch];
  const base = `${year}년 ${pillar.heavenlyStemKo}${pillar.earthlyBranchKo}(${animal}띠해)`;

  // 길흉 수준
  let level: string;
  if (rating >= 30) level = '길(吉)';
  else if (rating >= 10) level = '소길(小吉)';
  else if (rating >= -10) level = '평(平)';
  else if (rating >= -30) level = '소흉(小凶)';
  else level = '흉(凶)';

  // 주요 관계
  const clashes = interactions.filter(i => ['육충', '천간충'].includes(i.type));
  const combines = interactions.filter(i => ['육합', '삼합', '천간합'].includes(i.type));

  let detail = `${tenGod} · ${twelveStage}`;
  if (clashes.length > 0) {
    detail += ` | 충: ${clashes.map(c => c.members.join('')).join(', ')}`;
  }
  if (combines.length > 0) {
    detail += ` | 합: ${combines.map(c => c.members.join('')).join(', ')}`;
  }

  return `${base} - ${level} (${detail})`;
}
