// 음력 ↔ 양력 변환 및 절기 계산

// 한국천문연구원(KASI) 기반 음력 데이터 테이블 (1900-2100)
// 각 연도별 음력 데이터: 윤달 위치(0=없음) + 12/13개월 대소월(29/30일) 정보
const LUNAR_DATA: number[] = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x1a6c4, 0x0aae0, // 2050-2059
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252, // 2090-2099
  0x0d520, // 2100
];

// 해당 연도의 윤달 위치 반환 (0이면 윤달 없음)
function leapMonth(year: number): number {
  return LUNAR_DATA[year - 1900] & 0xf;
}

// 해당 연도의 윤달 일수 반환
function leapDays(year: number): number {
  if (leapMonth(year)) {
    return (LUNAR_DATA[year - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}

// 해당 연도 음력의 총 일수
function lunarYearDays(year: number): number {
  let sum = 348; // 12 * 29
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_DATA[year - 1900] & i) ? 1 : 0;
  }
  return sum + leapDays(year);
}

// 해당 연도 특정 음력 월의 일수
function lunarMonthDays(year: number, month: number): number {
  return (LUNAR_DATA[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

// 양력 → 음력 변환
export function solarToLunar(sYear: number, sMonth: number, sDay: number): {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
} {
  // 1900년 1월 31일 = 음력 1900년 1월 1일
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(sYear, sMonth - 1, sDay);
  let offset = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);

  let lunarYear = 1900;
  let temp = 0;

  // 연도 결정
  for (let i = 1900; i < 2101 && offset > 0; i++) {
    temp = lunarYearDays(i);
    offset -= temp;
    lunarYear++;
  }

  if (offset < 0) {
    offset += temp;
    lunarYear--;
  }

  // 윤달 정보
  const leap = leapMonth(lunarYear);
  let isLeapMonth = false;
  let lunarMonth = 1;

  for (let i = 1; i < 13 && offset > 0; i++) {
    // 윤달 처리
    if (leap > 0 && i === (leap + 1) && !isLeapMonth) {
      --i;
      isLeapMonth = true;
      temp = leapDays(lunarYear);
    } else {
      temp = lunarMonthDays(lunarYear, i);
    }

    if (isLeapMonth && i === (leap + 1)) {
      isLeapMonth = false;
    }

    offset -= temp;
    if (!isLeapMonth) {
      lunarMonth++;
    }
  }

  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeapMonth) {
      isLeapMonth = false;
    } else {
      isLeapMonth = true;
      --lunarMonth;
    }
  }

  if (offset < 0) {
    offset += temp;
    --lunarMonth;
  }

  const lunarDay = offset + 1;

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeapMonth,
  };
}

// 음력 → 양력 변환
export function lunarToSolar(lYear: number, lMonth: number, lDay: number, isLeapMonth = false): {
  year: number;
  month: number;
  day: number;
} {
  const baseDate = new Date(1900, 0, 31); // 음력 1900년 1월 1일

  let offset = 0;

  // 연도별 일수 합산
  for (let i = 1900; i < lYear; i++) {
    offset += lunarYearDays(i);
  }

  // 월별 일수 합산
  const leap = leapMonth(lYear);
  let isAdd = false;

  for (let i = 1; i < lMonth; i++) {
    if (!isAdd && leap > 0 && i === leap) {
      isAdd = true;
      --i; // 윤달 반복
      offset += leapDays(lYear);
    } else {
      offset += lunarMonthDays(lYear, i);
    }
    if (isAdd && i === leap) {
      isAdd = false;
    }
  }

  if (isLeapMonth) {
    offset += lunarMonthDays(lYear, lMonth);
  }

  offset += lDay - 1;

  const resultDate = new Date(baseDate.getTime() + offset * 86400000);

  return {
    year: resultDate.getFullYear(),
    month: resultDate.getMonth() + 1,
    day: resultDate.getDate(),
  };
}

// 절기 기준 월 결정 (절입일 기준)
// 사주에서 월주는 절기를 기준으로 결정됨
export function getSolarTermMonth(year: number, month: number, day: number): number {
  // 24절기 중 "절(節)" 기준 - 각 월의 시작점
  // 절입일은 대략적으로 고정 (정확한 계산은 천문력 필요)
  const solarTermDays: Record<number, number> = {
    1: 6,   // 소한 (1월 6일경)
    2: 4,   // 입춘 (2월 4일경) → 인월(寅月) 시작
    3: 6,   // 경칩 (3월 6일경)
    4: 5,   // 청명 (4월 5일경)
    5: 6,   // 입하 (5월 6일경)
    6: 6,   // 망종 (6월 6일경)
    7: 7,   // 소서 (7월 7일경)
    8: 7,   // 입추 (8월 7일경)
    9: 8,   // 백로 (9월 8일경)
    10: 8,  // 한로 (10월 8일경)
    11: 7,  // 입동 (11월 7일경)
    12: 7,  // 대설 (12월 7일경)
  };

  const termDay = solarTermDays[month] || 6;

  // 절기 이전이면 이전 월
  if (day < termDay) {
    return month === 1 ? 12 : month - 1;
  }
  return month;
}

// 절기 기준 연도 결정 (입춘 기준)
// 사주에서 년주는 입춘을 기준으로 바뀜
export function getSajuYear(year: number, month: number, day: number): number {
  // 입춘: 약 2월 4일
  if (month < 2 || (month === 2 && day < 4)) {
    return year - 1;
  }
  return year;
}
