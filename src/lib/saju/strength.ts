// 강약 판정 (强弱判定) - Day Master Strength Analysis
// 일간(日干)의 강약을 득령·득지·득세 3가지 기준으로 종합 판정
//
// 1. 득령(得令): 월지(月支)가 일간을 생하거나 같은 오행인지
// 2. 득지(得地): 4지지의 지장간에 일간이 통근(뿌리)하는지
// 3. 득세(得勢): 천간·지장간에서 일간을 돕는 세력이 많은지

import type { HeavenlyStem, EarthlyBranch, FiveElement } from './types';
import { STEM_ELEMENT, BRANCH_ELEMENT } from './constants';
import { getHiddenStemList, checkTonggeun } from './hidden-stems';
import { getTwelveStageBong, type TwelveStage } from './twelve-stages';

// ──────────────────────────────────────────────
// 오행 관계 테이블
// ──────────────────────────────────────────────

/** 오행 상생: A가 B를 생함 (木→火→土→金→水→木) */
const GENERATES: Record<FiveElement, FiveElement> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

/** 오행 상극: A가 B를 극함 (木→土→水→火→金→木) */
const OVERCOMES: Record<FiveElement, FiveElement> = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};

/** 나를 생하는 오행 (인성 관계) */
const GENERATED_BY: Record<FiveElement, FiveElement> = {
  '木': '水', '火': '木', '土': '火', '金': '土', '水': '金',
};

// 천간 → 음양
const STEM_YINYANG: Record<HeavenlyStem, '양' | '음'> = {
  '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
  '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음',
};

// ──────────────────────────────────────────────
// 월령 왕상표 (月令旺相表)
// 각 월지(계절)에서 각 오행의 상태
// ──────────────────────────────────────────────

type SeasonalState = '왕' | '상' | '휴' | '수' | '사';

// 월지별 계절 매핑
const BRANCH_TO_SEASON: Record<EarthlyBranch, '봄' | '여름' | '환절기' | '가을' | '겨울'> = {
  '寅': '봄', '卯': '봄', '辰': '환절기',
  '巳': '여름', '午': '여름', '未': '환절기',
  '申': '가을', '酉': '가을', '戌': '환절기',
  '亥': '겨울', '子': '겨울', '丑': '환절기',
};

// 계절별 오행 왕상휴수사
// 왕(旺)=가장 강함, 상(相)=강함, 휴(休)=보통, 수(囚)=약함, 사(死)=가장 약함
const SEASONAL_STRENGTH: Record<string, Record<FiveElement, SeasonalState>> = {
  '봄':    { '木': '왕', '火': '상', '土': '사', '金': '수', '水': '휴' },
  '여름':  { '木': '휴', '火': '왕', '土': '상', '金': '사', '水': '수' },
  '환절기': { '木': '수', '火': '휴', '土': '왕', '金': '상', '水': '사' },
  '가을':  { '木': '사', '火': '수', '土': '휴', '金': '왕', '水': '상' },
  '겨울':  { '木': '상', '火': '사', '土': '수', '金': '휴', '水': '왕' },
};

// 왕상휴수사 점수 (강약 판정 시 가중치)
const SEASONAL_STATE_SCORE: Record<SeasonalState, number> = {
  '왕': 3, '상': 2, '휴': 1, '수': -1, '사': -2,
};

// ──────────────────────────────────────────────
// 십이운성 강약 점수
// ──────────────────────────────────────────────

const TWELVE_STAGE_SCORE: Record<TwelveStage, number> = {
  '장생': 2,  '목욕': 1,  '관대': 2,  '건록': 3,  '제왕': 3,
  '쇠': 0,    '병': -1,   '사': -2,   '묘': -1,   '절': -2,
  '태': 0,    '양': 1,
};

// ──────────────────────────────────────────────
// 강약 판정 결과 타입
// ──────────────────────────────────────────────

export interface StrengthResult {
  /** 최종 판정: 신강/신약/중화 */
  result: '신강' | '신약' | '중화';
  /** 총 점수 (양수=강, 음수=약) */
  totalScore: number;
  /** 득령 점수 및 상세 */
  deukryeong: {
    score: number;
    season: string;
    state: SeasonalState;
    gained: boolean;
  };
  /** 득지 점수 및 상세 */
  deukji: {
    score: number;
    tonggeunCount: number;
    details: { branch: EarthlyBranch; position: '余' | '中' | '正' | null; stage: TwelveStage; stageScore: number }[];
    gained: boolean;
  };
  /** 득세 점수 및 상세 */
  deukse: {
    score: number;
    supportCount: number;
    opposeCount: number;
    gained: boolean;
  };
  /** 5가지 판정 (3가지 중 2가지 이상 true면 신강) */
  summary: string;
}

// ──────────────────────────────────────────────
// 핵심 함수들
// ──────────────────────────────────────────────

/**
 * 득령(得令) 판정
 * 월지의 계절이 일간 오행에 유리한지 확인
 */
function evaluateDeukryeong(
  dayStem: HeavenlyStem,
  monthBranch: EarthlyBranch,
): StrengthResult['deukryeong'] {
  const dayElement = STEM_ELEMENT[dayStem];
  const season = BRANCH_TO_SEASON[monthBranch];
  const state = SEASONAL_STRENGTH[season][dayElement];
  const score = SEASONAL_STATE_SCORE[state];
  const gained = state === '왕' || state === '상';

  return { score, season, state, gained };
}

/**
 * 득지(得地) 판정
 * 4지지에서 일간이 통근(뿌리)하는지 + 십이운성 강도
 */
function evaluateDeukji(
  dayStem: HeavenlyStem,
  branches: EarthlyBranch[],
): StrengthResult['deukji'] {
  let score = 0;
  let tonggeunCount = 0;
  const details: StrengthResult['deukji']['details'] = [];

  for (const branch of branches) {
    const position = checkTonggeun(dayStem, branch);
    const stage = getTwelveStageBong(dayStem, branch);
    const stageScore = TWELVE_STAGE_SCORE[stage];

    if (position) {
      tonggeunCount++;
      // 정기 통근이 가장 강함
      const positionWeight = position === '正' ? 1.5 : position === '中' ? 1.0 : 0.5;
      score += stageScore * positionWeight;
    } else {
      // 통근 없어도 십이운성이 강하면 약간의 점수
      if (stageScore > 0) {
        score += stageScore * 0.3;
      }
    }

    details.push({ branch, position, stage, stageScore });
  }

  const gained = tonggeunCount >= 2 || (tonggeunCount >= 1 && score >= 2);

  return { score: Math.round(score * 10) / 10, tonggeunCount, details, gained };
}

/**
 * 득세(得勢) 판정
 * 사주 내 천간·지장간에서 일간을 돕는 세력 vs 억제하는 세력
 */
function evaluateDeukse(
  dayStem: HeavenlyStem,
  allStems: HeavenlyStem[],
  allBranches: EarthlyBranch[],
): StrengthResult['deukse'] {
  const dayElement = STEM_ELEMENT[dayStem];
  const myGenerator = GENERATED_BY[dayElement]; // 나를 생하는 오행 (인성)

  let supportCount = 0;
  let opposeCount = 0;
  let score = 0;

  // 천간 분석 (일간 본인 제외)
  for (const stem of allStems) {
    if (stem === dayStem) continue; // 일간 자신은 제외
    const element = STEM_ELEMENT[stem];
    if (element === dayElement) {
      // 비겁: 같은 오행 → 도움
      supportCount++;
      score += 1.5;
    } else if (element === myGenerator) {
      // 인성: 나를 생하는 오행 → 도움
      supportCount++;
      score += 1.5;
    } else if (OVERCOMES[element] === dayElement) {
      // 관살: 나를 극하는 오행 → 억제
      opposeCount++;
      score -= 1.5;
    } else if (GENERATES[dayElement] === element) {
      // 식상: 내가 생하는 오행 → 설기
      opposeCount++;
      score -= 1.0;
    } else if (dayElement === OVERCOMES[element] ? false : OVERCOMES[dayElement] === element) {
      // 재성: 내가 극하는 오행 → 소모
      opposeCount++;
      score -= 0.5;
    }
  }

  // 지장간 분석
  for (const branch of allBranches) {
    const hiddenStems = getHiddenStemList(branch);
    for (const hs of hiddenStems) {
      const element = STEM_ELEMENT[hs];
      if (element === dayElement || element === myGenerator) {
        supportCount++;
        score += 0.5;
      } else if (OVERCOMES[element] === dayElement) {
        opposeCount++;
        score -= 0.5;
      }
    }
  }

  const gained = supportCount > opposeCount;

  return { score: Math.round(score * 10) / 10, supportCount, opposeCount, gained };
}

// ──────────────────────────────────────────────
// 메인 강약 판정 함수
// ──────────────────────────────────────────────

/**
 * 일간(日干)의 강약을 종합 판정
 * @param dayStem 일간 천간
 * @param yearStem 년간
 * @param monthStem 월간
 * @param hourStem 시간
 * @param yearBranch 년지
 * @param monthBranch 월지
 * @param dayBranch 일지
 * @param hourBranch 시지
 */
export function analyzeStrength(
  dayStem: HeavenlyStem,
  yearStem: HeavenlyStem,
  monthStem: HeavenlyStem,
  hourStem: HeavenlyStem,
  yearBranch: EarthlyBranch,
  monthBranch: EarthlyBranch,
  dayBranch: EarthlyBranch,
  hourBranch: EarthlyBranch,
): StrengthResult {
  const allStems = [yearStem, monthStem, dayStem, hourStem];
  const allBranches = [yearBranch, monthBranch, dayBranch, hourBranch];

  // 3가지 판정
  const deukryeong = evaluateDeukryeong(dayStem, monthBranch);
  const deukji = evaluateDeukji(dayStem, allBranches);
  const deukse = evaluateDeukse(dayStem, allStems, allBranches);

  // 총점 계산 (가중치: 득령 40%, 득지 30%, 득세 30%)
  const totalScore = Math.round(
    (deukryeong.score * 4 + deukji.score * 3 + deukse.score * 3) * 10,
  ) / 10;

  // 3가지 중 2가지 이상 득(得)하면 신강
  const gainedCount = [deukryeong.gained, deukji.gained, deukse.gained]
    .filter(Boolean).length;

  let result: StrengthResult['result'];
  if (gainedCount >= 2) {
    result = '신강';
  } else if (gainedCount === 1 && Math.abs(totalScore) <= 2) {
    result = '중화';
  } else {
    result = '신약';
  }

  // 요약 설명
  const parts: string[] = [];
  parts.push(`득령(${deukryeong.gained ? 'O' : 'X'}): ${deukryeong.season}절 ${deukryeong.state}`);
  parts.push(`득지(${deukji.gained ? 'O' : 'X'}): 통근 ${deukji.tonggeunCount}개`);
  parts.push(`득세(${deukse.gained ? 'O' : 'X'}): 지원${deukse.supportCount}/억제${deukse.opposeCount}`);

  return {
    result,
    totalScore,
    deukryeong,
    deukji,
    deukse,
    summary: `[${result}] ${parts.join(' | ')}`,
  };
}

/**
 * 간단 강약 판정 (신강/신약만 반환)
 */
export function isStrong(
  dayStem: HeavenlyStem,
  yearStem: HeavenlyStem,
  monthStem: HeavenlyStem,
  hourStem: HeavenlyStem,
  yearBranch: EarthlyBranch,
  monthBranch: EarthlyBranch,
  dayBranch: EarthlyBranch,
  hourBranch: EarthlyBranch,
): boolean {
  const analysis = analyzeStrength(
    dayStem, yearStem, monthStem, hourStem,
    yearBranch, monthBranch, dayBranch, hourBranch,
  );
  return analysis.result === '신강' || analysis.result === '중화';
}
