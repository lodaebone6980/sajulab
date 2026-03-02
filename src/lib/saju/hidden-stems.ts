// 지장간 (地藏干) - Hidden Heavenly Stems within Earthly Branches
// 각 지지 안에 숨겨져 있는 천간들
//
// 구조: [여기(餘氣), 중기(中氣), 정기(正氣)]
//   - 여기(餘氣): 이전 지지에서 넘어온 잔여 기운 (일부 지지에는 없음)
//   - 중기(中氣): 중간 기운 (일부 지지에는 없음)
//   - 정기(正氣): 해당 지지의 본 기운 (모든 지지에 있음)
//
// 지장간은 통근(通根) 판단, 용신 선정, 격국 분석 등에 핵심적으로 사용됨

import type { HeavenlyStem, EarthlyBranch } from './types';

/** getAllHiddenStems 반환 타입 */
export interface HiddenStemsResult {
  year: HiddenStem;
  month: HiddenStem;
  day: HiddenStem;
  hour: HiddenStem;
}

export interface HiddenStem {
  /** 여기(餘氣) - 잔여 기운, 없을 수 있음 */
  余: HeavenlyStem | null;
  /** 중기(中氣) - 중간 기운, 없을 수 있음 */
  中: HeavenlyStem | null;
  /** 정기(正氣) - 본 기운, 항상 존재 */
  正: HeavenlyStem;
}

// 지장간 테이블 (12지지 × 최대 3천간)
//
// 子: 壬(여), 癸(정)            - 수(水) 기운
// 丑: 癸(여), 辛(중), 己(정)    - 토(土) 기운 (금·수 포함)
// 寅: 戊(여), 丙(중), 甲(정)    - 목(木) 기운 (화·토 포함)
// 卯: 甲(여), 乙(정)            - 목(木) 기운
// 辰: 乙(여), 癸(중), 戊(정)    - 토(土) 기운 (목·수 포함)
// 巳: 戊(여), 庚(중), 丙(정)    - 화(火) 기운 (토·금 포함)
// 午: 丙(여), 己(중), 丁(정)    - 화(Fire) 기운 (토 포함)
// 未: 丁(여), 乙(중), 己(정)    - 토(土) 기운 (화·목 포함)
// 申: 己(여), 壬(중), 庚(정)    - 금(金) 기운 (토·수 포함)
// 酉: 庚(여), 辛(정)            - 금(金) 기운
// 戌: 辛(여), 丁(중), 戊(정)    - 토(土) 기운 (금·화 포함)
// 亥: 戊(여), 甲(중), 壬(정)    - 수(水) 기운 (토·목 포함)

const HIDDEN_STEMS_TABLE: Record<EarthlyBranch, HiddenStem> = {
  '子': { 余: '壬',  中: null, 正: '癸' },
  '丑': { 余: '癸',  中: '辛', 正: '己' },
  '寅': { 余: '戊',  中: '丙', 正: '甲' },
  '卯': { 余: '甲',  中: null, 正: '乙' },
  '辰': { 余: '乙',  中: '癸', 正: '戊' },
  '巳': { 余: '戊',  中: '庚', 正: '丙' },
  '午': { 余: '丙',  中: '己', 正: '丁' },
  '未': { 余: '丁',  中: '乙', 正: '己' },
  '申': { 余: '己',  中: '壬', 正: '庚' },
  '酉': { 余: '庚',  中: null, 正: '辛' },
  '戌': { 余: '辛',  中: '丁', 正: '戊' },
  '亥': { 余: '戊',  中: '甲', 正: '壬' },
};

/**
 * 특정 지지의 지장간 조회
 */
export function getHiddenStems(branch: EarthlyBranch): HiddenStem {
  return HIDDEN_STEMS_TABLE[branch];
}

/**
 * 특정 지지의 지장간을 배열로 반환 (null 제외)
 * 순서: [여기, 중기, 정기] (존재하는 것만)
 */
export function getHiddenStemList(branch: EarthlyBranch): HeavenlyStem[] {
  const hs = HIDDEN_STEMS_TABLE[branch];
  const result: HeavenlyStem[] = [];
  if (hs.余) result.push(hs.余);
  if (hs.中) result.push(hs.中);
  result.push(hs.正);
  return result;
}

/**
 * 특정 지지의 정기(正氣) 조회
 * 해당 지지의 본 기운을 대표하는 천간
 */
export function getMainHiddenStem(branch: EarthlyBranch): HeavenlyStem {
  return HIDDEN_STEMS_TABLE[branch].正;
}

/**
 * 통근(通根) 판단
 * 특정 천간이 특정 지지의 지장간에 포함되어 있는지 확인
 * @returns 포함 시 해당 위치('余'|'中'|'正'), 미포함 시 null
 */
export function checkTonggeun(
  stem: HeavenlyStem,
  branch: EarthlyBranch,
): '余' | '中' | '正' | null {
  const hs = HIDDEN_STEMS_TABLE[branch];
  if (hs.正 === stem) return '正';
  if (hs.中 === stem) return '中';
  if (hs.余 === stem) return '余';
  return null;
}

/**
 * 투출(透出) 판단
 * 사주 천간 중 특정 지지의 지장간에 해당하는 천간이 있는지 확인
 */
export function checkTouchul(
  stems: HeavenlyStem[],
  branch: EarthlyBranch,
): { stem: HeavenlyStem; position: '余' | '中' | '正' }[] {
  const results: { stem: HeavenlyStem; position: '余' | '中' | '正' }[] = [];
  for (const stem of stems) {
    const pos = checkTonggeun(stem, branch);
    if (pos) {
      results.push({ stem, position: pos });
    }
  }
  return results;
}

// 지장간 분야율(分野率) - 각 지장간의 에너지 비율 (일수 기준)
// 한 달(30일) 기준으로 여기·중기·정기가 차지하는 일수
const HIDDEN_STEM_RATIOS: Record<EarthlyBranch, number[]> = {
  '子': [10, 0, 20],       // 壬 10일, 癸 20일
  '丑': [9, 3, 18],        // 癸 9일, 辛 3일, 己 18일
  '寅': [7, 7, 16],        // 戊 7일, 丙 7일, 甲 16일
  '卯': [10, 0, 20],       // 甲 10일, 乙 20일
  '辰': [9, 3, 18],        // 乙 9일, 癸 3일, 戊 18일
  '巳': [7, 7, 16],        // 戊 7일, 庚 7일, 丙 16일
  '午': [10, 9, 11],       // 丙 10일, 己 9일, 丁 11일
  '未': [9, 3, 18],        // 丁 9일, 乙 3일, 己 18일
  '申': [7, 7, 16],        // 己 7일, 壬 7일, 庚 16일
  '酉': [10, 0, 20],       // 庚 10일, 辛 20일
  '戌': [9, 3, 18],        // 辛 9일, 丁 3일, 戊 18일
  '亥': [7, 5, 18],        // 戊 7일, 甲 5일, 壬 18일
};

/**
 * 지장간 분야율(에너지 비율) 조회
 * @returns 각 지장간의 일수 비율 배열 [여기일수, 중기일수, 정기일수]
 */
export function getHiddenStemRatios(branch: EarthlyBranch): {
  stems: HiddenStem;
  ratios: number[];
} {
  return {
    stems: HIDDEN_STEMS_TABLE[branch],
    ratios: HIDDEN_STEM_RATIOS[branch],
  };
}

/**
 * 사주 4기둥의 지장간 일괄 조회
 */
export function getAllHiddenStems(
  yearBranch: EarthlyBranch,
  monthBranch: EarthlyBranch,
  dayBranch: EarthlyBranch,
  hourBranch: EarthlyBranch,
): HiddenStemsResult {
  return {
    year: HIDDEN_STEMS_TABLE[yearBranch],
    month: HIDDEN_STEMS_TABLE[monthBranch],
    day: HIDDEN_STEMS_TABLE[dayBranch],
    hour: HIDDEN_STEMS_TABLE[hourBranch],
  };
}
