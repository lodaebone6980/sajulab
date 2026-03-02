// manseryeok-js 라이브러리 브릿지 모듈
// KASI(한국천문연구원) 데이터 기반의 정확한 사주팔자 계산

import {
  calculateSaju as manseryeokCalculateSaju,
  solarToLunar as manseryeokSolarToLunar,
  lunarToSolar as manseryeokLunarToSolar,
  getSajuMonth,
  isBeforeLichun,
  type SajuResult as ManseryeokSajuResult,
} from '@fullstackfamily/manseryeok';

import {
  HEAVENLY_STEMS, HEAVENLY_STEMS_KO,
  EARTHLY_BRANCHES, EARTHLY_BRANCHES_KO,
  STEM_ELEMENT, STEM_ELEMENT_KO,
  STEM_YINYANG, STEM_YINYANG_KO,
  STEM_HANJA_TO_KO, BRANCH_HANJA_TO_KO,
  STEM_KO_TO_HANJA, BRANCH_KO_TO_HANJA,
} from './constants';

import type { Pillar, FourPillars, BirthInfo, HeavenlyStemKo, EarthlyBranchKo } from './types';

// 한글 주(柱) 문자열 → Pillar 객체 변환 (예: "갑자" → Pillar)
function parsePillarString(pillarStr: string): Pillar | null {
  if (!pillarStr || pillarStr.length !== 2) return null;

  const stemKo = pillarStr[0] as HeavenlyStemKo;
  const branchKo = pillarStr[1] as EarthlyBranchKo;

  const stem = STEM_KO_TO_HANJA[stemKo];
  const branch = BRANCH_KO_TO_HANJA[branchKo];

  if (!stem || !branch) return null;

  return {
    heavenlyStem: stem,
    earthlyBranch: branch,
    heavenlyStemKo: stemKo,
    earthlyBranchKo: branchKo,
    element: STEM_ELEMENT[stem],
    elementKo: STEM_ELEMENT_KO[stemKo],
    yinYang: STEM_YINYANG[stem],
    yinYangKo: STEM_YINYANG_KO[stemKo],
  };
}

// manseryeok-js 사주 결과 → 우리 FourPillars 형식으로 변환
function convertManseryeokResult(result: ManseryeokSajuResult): FourPillars | null {
  const yearPillar = parsePillarString(result.yearPillar);
  const monthPillar = parsePillarString(result.monthPillar);
  const dayPillar = parsePillarString(result.dayPillar);
  const hourPillar = result.hourPillar ? parsePillarString(result.hourPillar) : null;

  if (!yearPillar || !monthPillar || !dayPillar) return null;

  // 시주가 없으면 기본값 (자시)
  const finalHourPillar = hourPillar || parsePillarString('갑자')!;

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: finalHourPillar,
  };
}

// manseryeok-js를 사용한 사주팔자 계산 (KASI 데이터 기반)
export function calculateFourPillarsKASI(birthInfo: BirthInfo): FourPillars | null {
  try {
    let solarYear = birthInfo.year;
    let solarMonth = birthInfo.month;
    let solarDay = birthInfo.day;

    // 음력인 경우 양력 변환
    if (birthInfo.isLunar) {
      const result = manseryeokLunarToSolar(birthInfo.year, birthInfo.month, birthInfo.day);
      solarYear = result.solar.year;
      solarMonth = result.solar.month;
      solarDay = result.solar.day;
    }

    // manseryeok-js 사주 계산 (서울 경도 기반 진태양시 보정)
    const sajuResult = manseryeokCalculateSaju(
      solarYear, solarMonth, solarDay,
      birthInfo.hour, birthInfo.minute,
      { longitude: 127, applyTimeCorrection: true }
    );

    return convertManseryeokResult(sajuResult);
  } catch (e) {
    console.warn('[manseryeok-js] 계산 실패, fallback 사용:', e);
    return null;
  }
}

// manseryeok-js를 사용한 양력→음력 변환
export function solarToLunarKASI(year: number, month: number, day: number) {
  try {
    const result = manseryeokSolarToLunar(year, month, day);
    return {
      year: result.lunar.year,
      month: result.lunar.month,
      day: result.lunar.day,
      isLeapMonth: result.lunar.isLeapMonth,
    };
  } catch {
    return null;
  }
}

// manseryeok-js를 사용한 음력→양력 변환
export function lunarToSolarKASI(year: number, month: number, day: number, isLeapMonth = false) {
  try {
    const result = manseryeokLunarToSolar(year, month, day, isLeapMonth);
    return {
      year: result.solar.year,
      month: result.solar.month,
      day: result.solar.day,
    };
  } catch {
    return null;
  }
}

// 절기 기준 사주 월 (manseryeok-js)
export function getSajuMonthKASI(month: number, day: number): number | null {
  try {
    return getSajuMonth(month, day);
  } catch {
    return null;
  }
}

// 입춘 이전인지 확인 (manseryeok-js)
export function isBeforeLichunKASI(month: number, day: number): boolean | null {
  try {
    return isBeforeLichun(month, day);
  } catch {
    return null;
  }
}
