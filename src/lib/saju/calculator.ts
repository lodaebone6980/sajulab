// 사주팔자 계산 엔진 (핵심 로직)

import {
  HEAVENLY_STEMS, HEAVENLY_STEMS_KO,
  EARTHLY_BRANCHES, EARTHLY_BRANCHES_KO,
  STEM_ELEMENT, STEM_ELEMENT_KO,
  BRANCH_ELEMENT, BRANCH_ELEMENT_KO,
  STEM_YINYANG, STEM_YINYANG_KO,
  BRANCH_YINYANG,
  STEM_HANJA_TO_KO, BRANCH_HANJA_TO_KO,
  YEAR_STEM_TO_MONTH_START,
  DAY_STEM_TO_HOUR_START,
} from './constants';

import { getSajuYear, getSolarTermMonth, solarToLunar, lunarToSolar } from './calendar';
import { calculateFourPillarsKASI } from './manseryeok-bridge';
import type { Pillar, FourPillars, BirthInfo, ElementDistribution, FiveElementKo } from './types';

// 진태양시 보정 (-30분, 한국 표준시 차이)
function adjustTrueSolarTime(hour: number, minute: number): { hour: number; minute: number } {
  let totalMinutes = hour * 60 + minute - 30;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  return {
    hour: Math.floor(totalMinutes / 60) % 24,
    minute: totalMinutes % 60,
  };
}

// 시간 → 지지 인덱스 변환
function hourToBranchIndex(hour: number): number {
  // 자시(23-01), 축시(01-03), 인시(03-05), ...
  return Math.floor(((hour + 1) % 24) / 2);
}

// 년주 계산
function calculateYearPillar(year: number): Pillar {
  // 갑자년 기준: 1984년이 甲子년
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;

  const positiveStemIndex = ((stemIndex % 10) + 10) % 10;
  const positiveBranchIndex = ((branchIndex % 12) + 12) % 12;

  const stem = HEAVENLY_STEMS[positiveStemIndex];
  const branch = EARTHLY_BRANCHES[positiveBranchIndex];

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

// 월주 계산
function calculateMonthPillar(yearStemIndex: number, solarTermMonth: number): Pillar {
  // 절기 기준 월 → 지지 인덱스 (인월=0, 묘월=1, ...)
  // 양력 2월=인월(寅), 3월=묘월(卯), ...
  const branchOffset = (solarTermMonth + 10) % 12; // 2월→0(인), 3월→1(묘), ...
  const branchIndex = (branchOffset + 2) % 12; // 인(2)부터 시작

  // 월건법: 년간에 따라 월천간 결정
  const monthStemStart = YEAR_STEM_TO_MONTH_START[yearStemIndex];
  const monthOffset = (solarTermMonth + 10) % 12; // 인월부터의 offset
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

// 일주 계산 (일진 계산)
function calculateDayPillar(year: number, month: number, day: number): Pillar {
  // 기준일: 2000년 1월 1일 = 甲辰일 (stem:0, branch:4)
  // 실제 기준: 1900년 1월 1일 = 甲戌일 → 갑(0), 술(10)
  const baseDate = new Date(1900, 0, 1);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);

  // 1900년 1월 1일: 갑술(甲戌)일 → stem:0, branch:10
  const stemIndex = ((diffDays % 10) + 10) % 10;
  const branchIndex = ((diffDays + 10) % 12 + 12) % 12; // 술(10)에서 시작

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

// 시주 계산
function calculateHourPillar(dayStemIndex: number, hour: number): Pillar {
  const branchIndex = hourToBranchIndex(hour);

  // 시두법: 일간에 따라 시천간 결정
  const hourStemStart = DAY_STEM_TO_HOUR_START[dayStemIndex];
  const stemIndex = (hourStemStart + branchIndex) % 10;

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

// 사주 계산 메인 함수 (manseryeok-js KASI 데이터 우선, fallback으로 자체 엔진)
export function calculateFourPillars(birthInfo: BirthInfo): FourPillars {
  // 1차: manseryeok-js (KASI 데이터 기반, 정확한 절기/진태양시)
  const kasiResult = calculateFourPillarsKASI(birthInfo);
  if (kasiResult) {
    return kasiResult;
  }

  // 2차: 자체 엔진 (fallback)
  console.warn('[saju] manseryeok-js 실패, 자체 엔진 사용');
  let { year, month, day, hour, minute } = birthInfo;

  // 음력인 경우 양력으로 변환
  if (birthInfo.isLunar) {
    const solar = lunarToSolar(year, month, day);
    year = solar.year;
    month = solar.month;
    day = solar.day;
  }

  // 진태양시 보정
  const adjusted = adjustTrueSolarTime(hour, minute);
  const adjustedHour = adjusted.hour;

  // 자시(23시~01시) 처리: 23시 이후면 다음날로
  let adjustedDay = day;
  let adjustedMonth = month;
  let adjustedYear = year;
  if (hour >= 23) {
    const nextDate = new Date(year, month - 1, day + 1);
    adjustedDay = nextDate.getDate();
    adjustedMonth = nextDate.getMonth() + 1;
    adjustedYear = nextDate.getFullYear();
  }

  // 사주 연도 (입춘 기준)
  const sajuYear = getSajuYear(adjustedYear, adjustedMonth, adjustedDay);

  // 절기 기준 월
  const solarTermMonth = getSolarTermMonth(adjustedYear, adjustedMonth, adjustedDay);

  // 년주 계산
  const yearPillar = calculateYearPillar(sajuYear);
  const yearStemIndex = HEAVENLY_STEMS.indexOf(yearPillar.heavenlyStem);

  // 월주 계산
  const monthPillar = calculateMonthPillar(yearStemIndex, solarTermMonth);

  // 일주 계산
  const dayPillar = calculateDayPillar(adjustedYear, adjustedMonth, adjustedDay);
  const dayStemIndex = HEAVENLY_STEMS.indexOf(dayPillar.heavenlyStem);

  // 시주 계산
  const hourPillar = calculateHourPillar(dayStemIndex, adjustedHour);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };
}

// 오행 분포 계산
export function calculateElementDistribution(fourPillars: FourPillars): ElementDistribution {
  const dist: ElementDistribution = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  const elementMap: Record<string, keyof ElementDistribution> = {
    '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water',
  };

  const pillars = [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour];

  for (const pillar of pillars) {
    // 천간 오행
    const stemElement = STEM_ELEMENT[pillar.heavenlyStem];
    dist[elementMap[stemElement]]++;

    // 지지 오행
    const branchElement = BRANCH_ELEMENT[pillar.earthlyBranch];
    dist[elementMap[branchElement]]++;
  }

  return dist;
}

// 지지의 정기(본기) → 천간 매핑
// 각 지지마다 그 기본이 되는 천간 인덱스를 반환
function getBranchMainStemIndex(branchIndex: number): number {
  // EARTHLY_BRANCHES 순서: 子丑寅卯辰巳午未申酉戌亥 (0-11)
  // HEAVENLY_STEMS 순서: 甲乙丙丁戊己庚辛壬癸 (0-9)
  const branchMainStem = [
    9,  // 子 → 癸 (index 9)
    5,  // 丑 → 己 (index 5)
    0,  // 寅 → 甲 (index 0)
    1,  // 卯 → 乙 (index 1)
    4,  // 辰 → 戊 (index 4)
    2,  // 巳 → 丙 (index 2)
    3,  // 午 → 丁 (index 3)
    5,  // 未 → 己 (index 5)
    6,  // 申 → 庚 (index 6)
    7,  // 酉 → 辛 (index 7)
    4,  // 戌 → 戊 (index 4)
    8,  // 亥 → 壬 (index 8)
  ];
  return branchMainStem[branchIndex];
}

// 십성 계산 (일간 기준)
export function calculateTenGod(dayStem: number, targetStem: number): string {
  const diff = ((targetStem - dayStem) % 10 + 10) % 10;
  const tenGods = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  return tenGods[diff];
}

// 지지 십성 계산 (지지의 정기를 이용)
// dayStemIndex: 일간 인덱스, branchIndex: 지지 인덱스
export function calculateBranchTenGod(dayStemIndex: number, branchIndex: number): string {
  const branchMainStemIndex = getBranchMainStemIndex(branchIndex);
  return calculateTenGod(dayStemIndex, branchMainStemIndex);
}

// 용신 결정 (간략화 - 오행 균형 기반)
export function determineYongSin(dist: ElementDistribution, dayStemElement: FiveElementKo): {
  yongSin: FiveElementKo;
  giSin: FiveElementKo;
} {
  const elementKeys: FiveElementKo[] = ['목', '화', '토', '금', '수'];
  const elementValues = [dist.wood, dist.fire, dist.earth, dist.metal, dist.water];

  // 일간 오행이 강한지 약한지 판단
  const dayElementIndex = elementKeys.indexOf(dayStemElement);
  const dayElementStrength = elementValues[dayElementIndex];

  // 총합
  const total = elementValues.reduce((a, b) => a + b, 0);
  const average = total / 5;

  // 가장 부족한 오행 = 용신
  let minIndex = 0;
  let minValue = Infinity;
  let maxIndex = 0;
  let maxValue = -Infinity;

  for (let i = 0; i < 5; i++) {
    if (i === dayElementIndex) continue;
    if (elementValues[i] < minValue) {
      minValue = elementValues[i];
      minIndex = i;
    }
    if (elementValues[i] > maxValue) {
      maxValue = elementValues[i];
      maxIndex = i;
    }
  }

  // 일간이 강하면: 일간을 설기하는 오행이 용신
  // 일간이 약하면: 일간을 생해주는 오행이 용신
  const generatingMap: Record<FiveElementKo, FiveElementKo> = {
    '목': '수', '화': '목', '토': '화', '금': '토', '수': '금',
  };
  const drainingMap: Record<FiveElementKo, FiveElementKo> = {
    '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
  };
  const overcomingMap: Record<FiveElementKo, FiveElementKo> = {
    '목': '금', '화': '수', '토': '목', '금': '화', '수': '토',
  };

  if (dayElementStrength >= average) {
    // 일간이 강하면 → 설기하는 오행(식상)이 용신, 인성이 기신
    return {
      yongSin: drainingMap[dayStemElement],
      giSin: generatingMap[dayStemElement],
    };
  } else {
    // 일간이 약하면 → 생해주는 오행(인성)이 용신, 극하는 오행이 기신
    return {
      yongSin: generatingMap[dayStemElement],
      giSin: overcomingMap[dayStemElement],
    };
  }
}

// 대운 계산
export function calculateDaeUn(
  birthInfo: BirthInfo,
  fourPillars: FourPillars,
): Array<{
  age: number;
  startYear: number;
  endYear: number;
  stem: string;
  branch: string;
  element: FiveElementKo;
}> {
  const { gender } = birthInfo;
  const yearStem = fourPillars.year.heavenlyStem;
  const yearYinYang = STEM_YINYANG[yearStem];

  // 양남음녀: 순행, 음남양녀: 역행
  const isForward = (gender === 'male' && yearYinYang === '陽') ||
                    (gender === 'female' && yearYinYang === '陰');

  const monthStemIndex = HEAVENLY_STEMS.indexOf(fourPillars.month.heavenlyStem);
  const monthBranchIndex = EARTHLY_BRANCHES.indexOf(fourPillars.month.earthlyBranch);

  const daeUnList = [];

  // 대운 시작 나이 (간략화: 3세)
  const startAge = 3;

  for (let i = 1; i <= 10; i++) {
    const direction = isForward ? i : -i;
    const stemIdx = ((monthStemIndex + direction) % 10 + 10) % 10;
    const branchIdx = ((monthBranchIndex + direction) % 12 + 12) % 12;

    const stem = HEAVENLY_STEMS_KO[stemIdx];
    const branch = EARTHLY_BRANCHES_KO[branchIdx];

    const age = startAge + (i - 1) * 10;

    daeUnList.push({
      age,
      startYear: birthInfo.year + age,
      endYear: birthInfo.year + age + 9,
      stem,
      branch,
      element: STEM_ELEMENT_KO[HEAVENLY_STEMS_KO[stemIdx]],
    });
  }

  return daeUnList;
}
