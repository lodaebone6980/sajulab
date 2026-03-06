// 사주 분석 통합 모듈

export { calculateFourPillars, calculateElementDistribution, calculateTenGod, calculateBranchTenGod, determineYongSin, calculateDaeUn } from './calculator';
export { analyzeFortuneComplete } from './fortune';
export { solarToLunar, lunarToSolar } from './calendar';
export { solarToLunarKASI, lunarToSolarKASI, calculateFourPillarsKASI } from './manseryeok-bridge';
export { fetchDailyFortune, fetchYearlyFortune, fetchLifetimeFortune, fetchAllFortunes } from './un7-api';
export { analyzeYearFortune, analyzeYearFortuneRange, analyzeMonthFortune, analyzeMonthFortuneYear, getCurrentFortunePeriod, getYearPillar, getMonthPillar } from './fortune-period';
export { analyzeInteractions, analyzeInteractionsWithLuck, getInteractionSummary } from './interactions';
export { determineYongShinSystem, classifyElement, getYongShinScore } from './yongshin';
export { analyzeCompatibility } from './compatibility';
export { analyzeDailyFortune, analyzeWeeklyFortune, getDayPillar } from './daily-fortune';
export type {
  BirthInfo,
  FourPillars,
  Pillar,
  ElementDistribution,
  FortuneAnalysis,
  SajuResult,
  DaeUn,
  FiveElementKo,
  TenGod,
  ExternalFortuneData,
} from './types';
export type { YearFortune, MonthFortune, CurrentFortunePeriod } from './fortune-period';
export type { Interaction, InteractionType } from './interactions';
export type { YongShinSystem, YongShinPattern } from './yongshin';
export type { CompatibilityResult, CompatibilityDetail } from './compatibility';
export type { DailyFortune } from './daily-fortune';
export {
  HEAVENLY_STEMS, HEAVENLY_STEMS_KO,
  EARTHLY_BRANCHES, EARTHLY_BRANCHES_KO,
  EARTHLY_BRANCH_ANIMALS,
  ELEMENT_COLORS, ELEMENT_DIRECTIONS,
  STEM_ELEMENT_KO,
} from './constants';

import { calculateFourPillars, calculateElementDistribution, calculateTenGod, calculateBranchTenGod, determineYongSin, calculateDaeUn } from './calculator';
import { analyzeFortuneComplete } from './fortune';
import { calculateFourPillarsKASI } from './manseryeok-bridge';
import { fetchAllFortunes } from './un7-api';
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, STEM_ELEMENT_KO, STEM_HANJA_TO_KO } from './constants';
import { analyzeStrength } from './strength';
import { determineYongShinSystem } from './yongshin';
import { calculateTwelveStages } from './twelve-stages';
import { getAllHiddenStems } from './hidden-stems';
import { getAllNayin } from './nayin';
import { analyzeSinsal } from './sinsal';
import { analyzeInteractions } from './interactions';
import { analyzeYearFortune, analyzeMonthFortuneYear } from './fortune-period';
import type { BirthInfo, SajuResult, TenGod, ExternalFortuneData } from './types';

// 전체 사주 분석 실행 (동기 - 기본 분석만)
export function analyzeSaju(birthInfo: BirthInfo): SajuResult {
  const fourPillars = calculateFourPillars(birthInfo);
  const elementDistribution = calculateElementDistribution(fourPillars);

  const dayStemKo = fourPillars.day.heavenlyStemKo;
  const dayStemElement = STEM_ELEMENT_KO[dayStemKo];
  const dayStemIndex = HEAVENLY_STEMS.indexOf(fourPillars.day.heavenlyStem);

  // 용신/기신 결정
  const { yongSin, giSin } = determineYongSin(elementDistribution, dayStemElement);

  // 십성 계산
  const yearStemIndex = HEAVENLY_STEMS.indexOf(fourPillars.year.heavenlyStem);
  const monthStemIndex = HEAVENLY_STEMS.indexOf(fourPillars.month.heavenlyStem);
  const hourStemIndex = HEAVENLY_STEMS.indexOf(fourPillars.hour.heavenlyStem);

  // 지지 십성 계산
  const yearBranchIndex = EARTHLY_BRANCHES.indexOf(fourPillars.year.earthlyBranch);
  const monthBranchIndex = EARTHLY_BRANCHES.indexOf(fourPillars.month.earthlyBranch);
  const dayBranchIndex = EARTHLY_BRANCHES.indexOf(fourPillars.day.earthlyBranch);
  const hourBranchIndex = EARTHLY_BRANCHES.indexOf(fourPillars.hour.earthlyBranch);

  const tenGods = {
    year: calculateTenGod(dayStemIndex, yearStemIndex) as TenGod,
    month: calculateTenGod(dayStemIndex, monthStemIndex) as TenGod,
    hour: calculateTenGod(dayStemIndex, hourStemIndex) as TenGod,
    yearBranch: calculateBranchTenGod(dayStemIndex, yearBranchIndex) as TenGod,
    monthBranch: calculateBranchTenGod(dayStemIndex, monthBranchIndex) as TenGod,
    dayBranch: calculateBranchTenGod(dayStemIndex, dayBranchIndex) as TenGod,
    hourBranch: calculateBranchTenGod(dayStemIndex, hourBranchIndex) as TenGod,
  };

  // 운세 분석
  const fortune = analyzeFortuneComplete(fourPillars, elementDistribution, yongSin, giSin);

  // 대운 계산
  const daeUnRaw = calculateDaeUn(birthInfo, fourPillars);
  const daeUn = daeUnRaw.map(du => ({
    age: du.age,
    startYear: du.startYear,
    endYear: du.endYear,
    heavenlyStem: du.stem as import('./types').HeavenlyStemKo,
    earthlyBranch: du.branch as import('./types').EarthlyBranchKo,
    element: du.element,
    description: `${du.stem}${du.branch} 대운 (${du.startYear}-${du.endYear})`,
  }));

  // 계산 엔진 출처 확인
  const kasiResult = calculateFourPillarsKASI(birthInfo);
  const calculationSource = kasiResult ? 'manseryeok-kasi' as const : 'builtin' as const;

  // ── 확장 분석 ──
  const { year: yP, month: mP, day: dP, hour: hP } = fourPillars;

  // 강약 판정
  const strength = analyzeStrength(
    dP.heavenlyStem,
    yP.heavenlyStem, mP.heavenlyStem, hP.heavenlyStem,
    yP.earthlyBranch, mP.earthlyBranch, dP.earthlyBranch, hP.earthlyBranch,
  );

  // 용신 5체계 (top-level yongSin/giSin도 5체계에서 통일)
  const yongShinSystem = determineYongShinSystem(
    dayStemElement, elementDistribution, strength, dP.heavenlyStem,
  );
  // 5체계 결과로 top-level 용신/기신 동기화
  const yongSinFinal = yongShinSystem.yongSin;
  const giSinFinal = yongShinSystem.giSin;

  // 십이운성
  const twelveStages = calculateTwelveStages(
    dP.heavenlyStem,
    yP.earthlyBranch, mP.earthlyBranch, dP.earthlyBranch, hP.earthlyBranch,
  );

  // 지장간
  const hiddenStems = getAllHiddenStems(
    yP.earthlyBranch, mP.earthlyBranch, dP.earthlyBranch, hP.earthlyBranch,
  );

  // 납음오행
  const nayin = getAllNayin(
    yP.heavenlyStem, yP.earthlyBranch,
    mP.heavenlyStem, mP.earthlyBranch,
    dP.heavenlyStem, dP.earthlyBranch,
    hP.heavenlyStem, hP.earthlyBranch,
  );

  // 신살
  const sinsal = analyzeSinsal(
    yP.heavenlyStem, yP.earthlyBranch,
    mP.heavenlyStem, mP.earthlyBranch,
    dP.heavenlyStem, dP.earthlyBranch,
    hP.heavenlyStem, hP.earthlyBranch,
  );

  // 형충회합
  const interactions = analyzeInteractions(
    yP.heavenlyStem, yP.earthlyBranch,
    mP.heavenlyStem, mP.earthlyBranch,
    dP.heavenlyStem, dP.earthlyBranch,
    hP.heavenlyStem, hP.earthlyBranch,
  );

  // 세운 (올해) & 월운 (12개월)
  const currentYear = new Date().getFullYear();
  const yearFortune = analyzeYearFortune(currentYear, fourPillars, yongSin, giSin);
  const monthFortunes = analyzeMonthFortuneYear(currentYear, fourPillars, yongSin, giSin);

  return {
    birthInfo,
    fourPillars,
    elementDistribution,
    tenGods,
    fortune,
    daeUn,
    yongSin: yongSinFinal,
    giSin: giSinFinal,
    calculationSource,
    strength,
    yongShinSystem,
    twelveStages,
    hiddenStems,
    nayin,
    sinsal,
    interactions,
    yearFortune,
    monthFortunes,
  };
}

// 전체 사주 분석 + 외부 운세 API (비동기 - 일간/연간/평생 운세 포함)
export async function analyzeSajuWithFortune(birthInfo: BirthInfo): Promise<SajuResult> {
  // 기본 사주 분석 (동기)
  const result = analyzeSaju(birthInfo);

  // un7.kr 외부 운세 데이터 (비동기)
  try {
    const externalData = await fetchAllFortunes({
      birthYear: birthInfo.year,
      birthMonth: birthInfo.month,
      birthDay: birthInfo.day,
      birthHour: birthInfo.hour,
      isLunar: birthInfo.isLunar,
    });

    const externalFortune: ExternalFortuneData = {
      source: 'un7.kr',
    };

    if (externalData.daily) {
      externalFortune.daily = { items: externalData.daily.items };
    }
    if (externalData.yearly) {
      externalFortune.yearly = { items: externalData.yearly.items };
    }
    if (externalData.lifetime) {
      externalFortune.lifetime = { items: externalData.lifetime.items };
    }
    if (externalData.error) {
      externalFortune.error = externalData.error;
    }

    result.externalFortune = externalFortune;
  } catch (e) {
    result.externalFortune = {
      source: 'un7.kr',
      error: `API 호출 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return result;
}
