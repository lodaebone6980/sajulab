// 십이운성 (十二運星) - 12 Luck Stages
// 천간이 지지를 만났을 때의 에너지 상태를 나타냄
//
// 봉법(鳳法): 양간은 순행, 음간은 역행 (전통적 방법)
// 거법(車法): 양간/음간 모두 순행 (일부 학파에서 사용)

import type { HeavenlyStem, EarthlyBranch } from './types';

// 십이운성 이름
export const TWELVE_STAGE_NAMES = [
  '장생', '목욕', '관대', '건록', '제왕',
  '쇠', '병', '사', '묘', '절', '태', '양',
] as const;

export type TwelveStage = typeof TWELVE_STAGE_NAMES[number];

/** calculateTwelveStages 반환 타입 */
export interface TwelveStagesResult {
  bong: { year: TwelveStage; month: TwelveStage; day: TwelveStage; hour: TwelveStage };
  geo: { year: TwelveStage; month: TwelveStage; day: TwelveStage; hour: TwelveStage };
}

// 봉법(鳳法) 테이블
// 양간: 장생 → 양 순행
// 음간: 장생 → 양 역행
//
// 행 = 천간 (甲~癸), 열 = 지지 (子~亥)
// 각 천간의 장생지(長生地)를 기준으로 순행/역행

// 각 천간별 장생지 인덱스 (지지 기준)
// 甲: 亥(11)에서 장생 → 순행
// 乙: 午(6)에서 장생 → 역행
// 丙: 寅(2)에서 장생 → 순행
// 丁: 酉(9)에서 장생 → 역행
// 戊: 寅(2)에서 장생 → 순행
// 己: 酉(9)에서 장생 → 역행
// 庚: 巳(5)에서 장생 → 순행
// 辛: 子(0)에서 장생 → 역행
// 壬: 申(8)에서 장생 → 순행
// 癸: 卯(3)에서 장생 → 역행

const BONG_TABLE: Record<HeavenlyStem, TwelveStage[]> = {
  //          子      丑      寅      卯      辰      巳      午      未      申      酉      戌      亥
  // 甲(양목) - 亥에서 장생, 순행
  '甲': ['목욕', '관대', '건록', '제왕', '쇠',   '병',   '사',   '묘',   '절',   '태',   '양',   '장생'],
  // 乙(음목) - 午에서 장생, 역행
  '乙': ['병',   '쇠',   '제왕', '건록', '관대', '목욕', '장생', '양',   '태',   '절',   '묘',   '사'],
  // 丙(양화) - 寅에서 장생, 순행
  '丙': ['태',   '양',   '장생', '목욕', '관대', '건록', '제왕', '쇠',   '병',   '사',   '묘',   '절'],
  // 丁(음화) - 酉에서 장생, 역행
  '丁': ['절',   '묘',   '사',   '병',   '쇠',   '제왕', '건록', '관대', '목욕', '장생', '양',   '태'],
  // 戊(양토) - 寅에서 장생, 순행 (丙과 동일)
  '戊': ['태',   '양',   '장생', '목욕', '관대', '건록', '제왕', '쇠',   '병',   '사',   '묘',   '절'],
  // 己(음토) - 酉에서 장생, 역행 (丁과 동일)
  '己': ['절',   '묘',   '사',   '병',   '쇠',   '제왕', '건록', '관대', '목욕', '장생', '양',   '태'],
  // 庚(양금) - 巳에서 장생, 순행
  '庚': ['사',   '묘',   '절',   '태',   '양',   '장생', '목욕', '관대', '건록', '제왕', '쇠',   '병'],
  // 辛(음금) - 子에서 장생, 역행
  '辛': ['장생', '양',   '태',   '절',   '묘',   '사',   '병',   '쇠',   '제왕', '건록', '관대', '목욕'],
  // 壬(양수) - 申에서 장생, 순행
  '壬': ['제왕', '쇠',   '병',   '사',   '묘',   '절',   '태',   '양',   '장생', '목욕', '관대', '건록'],
  // 癸(음수) - 卯에서 장생, 역행
  '癸': ['건록', '관대', '목욕', '장생', '양',   '태',   '절',   '묘',   '사',   '병',   '쇠',   '제왕'],
};

// 거법(車法) 테이블
// 양간/음간 모두 순행 (음간도 양간과 같은 방향)
// 음간의 장생지가 양간과 동일한 위치에서 시작
//
// 乙: 亥(11)에서 장생, 순행 (甲과 동일)
// 丁: 寅(2)에서 장생, 순행 (丙과 동일)
// 己: 寅(2)에서 장생, 순행 (戊와 동일)
// 辛: 巳(5)에서 장생, 순행 (庚과 동일)
// 癸: 申(8)에서 장생, 순행 (壬과 동일)

const GEO_TABLE: Record<HeavenlyStem, TwelveStage[]> = {
  // 양간 = 봉법과 동일
  '甲': BONG_TABLE['甲'],
  '丙': BONG_TABLE['丙'],
  '戊': BONG_TABLE['戊'],
  '庚': BONG_TABLE['庚'],
  '壬': BONG_TABLE['壬'],
  // 음간 = 같은 오행의 양간과 동일
  '乙': BONG_TABLE['甲'], // 목 → 甲과 동일
  '丁': BONG_TABLE['丙'], // 화 → 丙과 동일
  '己': BONG_TABLE['戊'], // 토 → 戊와 동일
  '辛': BONG_TABLE['庚'], // 금 → 庚과 동일
  '癸': BONG_TABLE['壬'], // 수 → 壬과 동일
};

// 지지 인덱스 매핑
const BRANCH_INDEX: Record<EarthlyBranch, number> = {
  '子': 0, '丑': 1, '寅': 2, '卯': 3, '辰': 4, '巳': 5,
  '午': 6, '未': 7, '申': 8, '酉': 9, '戌': 10, '亥': 11,
};

/**
 * 십이운성 계산 - 봉법(鳳法)
 * @param stem 천간 (한자)
 * @param branch 지지 (한자)
 * @returns 십이운성 이름
 */
export function getTwelveStageBong(stem: HeavenlyStem, branch: EarthlyBranch): TwelveStage {
  return BONG_TABLE[stem][BRANCH_INDEX[branch]];
}

/**
 * 십이운성 계산 - 거법(車法)
 * @param stem 천간 (한자)
 * @param branch 지지 (한자)
 * @returns 십이운성 이름
 */
export function getTwelveStageGeo(stem: HeavenlyStem, branch: EarthlyBranch): TwelveStage {
  return GEO_TABLE[stem][BRANCH_INDEX[branch]];
}

/**
 * 사주 전체의 십이운성 계산 (봉법 + 거법)
 * 일간(日干) 기준으로 년지, 월지, 일지, 시지에 대해 각각 계산
 */
export function calculateTwelveStages(
  dayStem: HeavenlyStem,
  yearBranch: EarthlyBranch,
  monthBranch: EarthlyBranch,
  dayBranch: EarthlyBranch,
  hourBranch: EarthlyBranch,
): TwelveStagesResult {
  return {
    bong: {
      year: getTwelveStageBong(dayStem, yearBranch),
      month: getTwelveStageBong(dayStem, monthBranch),
      day: getTwelveStageBong(dayStem, dayBranch),
      hour: getTwelveStageBong(dayStem, hourBranch),
    },
    geo: {
      year: getTwelveStageGeo(dayStem, yearBranch),
      month: getTwelveStageGeo(dayStem, monthBranch),
      day: getTwelveStageGeo(dayStem, dayBranch),
      hour: getTwelveStageGeo(dayStem, hourBranch),
    },
  };
}

/**
 * 특정 천간에 대한 십이운성 계산 (대운/년운/월운용)
 * 임의의 천간 기준으로 지지에 대해 계산
 */
export function getTwelveStageForStem(
  stem: HeavenlyStem,
  branch: EarthlyBranch,
): { bong: TwelveStage; geo: TwelveStage } {
  return {
    bong: getTwelveStageBong(stem, branch),
    geo: getTwelveStageGeo(stem, branch),
  };
}

// 십이운성별 의미 설명
export const TWELVE_STAGE_MEANINGS: Record<TwelveStage, string> = {
  '장생': '새로운 시작, 탄생의 기운. 희망과 성장의 에너지가 충만한 시기',
  '목욕': '정화와 변화의 시기. 시행착오를 겪으며 성장하는 단계',
  '관대': '성인이 되어 관을 쓰는 시기. 자신감과 능력이 갖추어지는 단계',
  '건록': '가장 안정적인 시기. 녹봉을 받으며 일이 순조로운 단계',
  '제왕': '최고의 전성기. 에너지가 극에 달하나 쇠퇴의 기운도 내포',
  '쇠': '서서히 기운이 약해지는 시기. 내면의 성숙과 지혜가 쌓이는 단계',
  '병': '기운이 쇠약해지는 시기. 건강과 활력에 주의가 필요한 단계',
  '사': '기운이 다하는 시기. 한 주기의 마무리와 전환점',
  '묘': '수장(收藏)의 시기. 에너지가 저장되고 보존되는 단계',
  '절': '단절과 새로운 시작 준비. 이전 주기가 완전히 끝나는 지점',
  '태': '새 생명이 잉태되는 시기. 새로운 가능성이 품어지는 단계',
  '양': '양육과 준비의 시기. 태동한 기운이 서서히 자라나는 단계',
};
