// 신살 (神煞) - Special Stars / Spiritual Characteristics
// 사주 내 특수한 기운을 나타내는 별들
//
// 크게 3종류:
// 1. 천간 기준 신살: 일간(日干) 기준으로 지지에서 찾음
// 2. 지지 기준 신살: 년지/일지 기준으로 다른 지지에서 찾음
// 3. 간지 조합 신살: 특정 천간+지지 조합으로 판정

import type { HeavenlyStem, EarthlyBranch } from './types';

// ──────────────────────────────────────────────
// 신살 타입 정의
// ──────────────────────────────────────────────

export type SinsalCategory = '귀인' | '길신' | '흉살' | '기타';

export interface SinsalInfo {
  name: string;
  category: SinsalCategory;
  pillar: 'year' | 'month' | 'day' | 'hour';
  description: string;
}

/** analyzeSinsal 반환 타입 */
export type SinsalResult = SinsalInfo[];

// ──────────────────────────────────────────────
// 1. 천간 기준 신살 테이블 (일간 → 지지)
// ──────────────────────────────────────────────

/** 천을귀인 (天乙貴人) - 가장 큰 귀인, 어려울 때 도움 */
const CHEONUL_GUIN: Record<HeavenlyStem, EarthlyBranch[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '庚': ['丑', '未'], '辛': ['寅', '午'],
  '壬': ['卯', '巳'], '癸': ['卯', '巳'],
};

/** 문창귀인 (文昌貴人) - 학문, 시험 운 */
const MUNCHANG_GUIN: Record<HeavenlyStem, EarthlyBranch> = {
  '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
  '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
};

/** 학당귀인 (學堂貴人) - 학업 성취 */
const HAKDANG_GUIN: Record<HeavenlyStem, EarthlyBranch> = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
  '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯',
};

/** 양인살 (羊刃殺) - 강렬한 기운, 양날의 검 */
const YANGIN: Record<HeavenlyStem, EarthlyBranch> = {
  '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
  '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥',
};

/** 금여록 (金輿祿) - 배우자 복, 귀한 인연 */
const GEUMYEO: Record<HeavenlyStem, EarthlyBranch> = {
  '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未',
  '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅',
};

// ──────────────────────────────────────────────
// 2. 지지 기준 신살 (년지/일지 → 다른 지지)
// 삼합 기준 그룹: 申子辰, 寅午戌, 巳酉丑, 亥卯未
// ──────────────────────────────────────────────

type BranchGroup = '申子辰' | '寅午戌' | '巳酉丑' | '亥卯未';

const BRANCH_TO_GROUP: Record<EarthlyBranch, BranchGroup> = {
  '申': '申子辰', '子': '申子辰', '辰': '申子辰',
  '寅': '寅午戌', '午': '寅午戌', '戌': '寅午戌',
  '巳': '巳酉丑', '酉': '巳酉丑', '丑': '巳酉丑',
  '亥': '亥卯未', '卯': '亥卯未', '未': '亥卯未',
};

/** 역마살 (驛馬殺) - 이동, 변화, 해외 */
const YEOKMA: Record<BranchGroup, EarthlyBranch> = {
  '申子辰': '寅', '寅午戌': '申', '巳酉丑': '亥', '亥卯未': '巳',
};

/** 도화살 (桃花殺) - 이성운, 매력, 예술성 */
const DOHWA: Record<BranchGroup, EarthlyBranch> = {
  '申子辰': '酉', '寅午戌': '卯', '巳酉丑': '午', '亥卯未': '子',
};

/** 화개살 (華蓋殺) - 종교, 철학, 예술, 고독 */
const HWAGAE: Record<BranchGroup, EarthlyBranch> = {
  '申子辰': '辰', '寅午戌': '戌', '巳酉丑': '丑', '亥卯未': '未',
};

/** 겁살 (劫殺) - 갑작스러운 재난, 사고 주의 */
const GEOBSAL: Record<BranchGroup, EarthlyBranch> = {
  '申子辰': '巳', '寅午戌': '亥', '巳酉丑': '寅', '亥卯未': '申',
};

/** 망신살 (亡神殺) - 명예 손상, 구설 */
const MANGSIN: Record<BranchGroup, EarthlyBranch> = {
  '申子辰': '亥', '寅午戌': '巳', '巳酉丑': '申', '亥卯未': '寅',
};

/** 원진살 (怨嗔殺) - 원한, 갈등 관계 */
const WONJIN: Record<EarthlyBranch, EarthlyBranch> = {
  '子': '未', '丑': '午', '寅': '巳', '卯': '辰', '辰': '卯', '巳': '寅',
  '午': '丑', '未': '子', '申': '亥', '酉': '戌', '戌': '酉', '亥': '申',
};

// ──────────────────────────────────────────────
// 3. 월지 기준 귀인
// ──────────────────────────────────────────────

/** 천덕귀인 (天德貴人) - 하늘의 덕, 재난 해소 */
const CHEONDUK: Record<EarthlyBranch, HeavenlyStem | EarthlyBranch> = {
  '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
  '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
  '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
};

/** 월덕귀인 (月德貴人) - 달의 덕, 재앙 면함 */
const WOLDUK: Record<EarthlyBranch, HeavenlyStem> = {
  '寅': '丙', '午': '丙', '戌': '丙',
  '申': '壬', '子': '壬', '辰': '壬',
  '亥': '甲', '卯': '甲', '未': '甲',
  '巳': '庚', '酉': '庚', '丑': '庚',
};

// ──────────────────────────────────────────────
// 4. 간지 조합 신살
// ──────────────────────────────────────────────

/** 괴강살 (魁罡殺) - 극단적 기운, 강한 카리스마 */
const GOEGANG_PAIRS: string[] = ['庚辰', '壬辰', '庚戌', '壬戌'];

/** 백호살 (白虎殺) - 혈광, 사고 주의 (일지 기준) */
const BAEKHO: Record<EarthlyBranch, EarthlyBranch> = {
  '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
  '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};

// ──────────────────────────────────────────────
// 5. 공망 (空亡)
// ──────────────────────────────────────────────

const STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 공망 계산 - 일주의 순(旬)에서 빠진 2개 지지
 * 10천간에 12지지를 배당하면 2개가 남음 = 공망
 */
export function getGongmang(dayStem: HeavenlyStem, dayBranch: EarthlyBranch): [EarthlyBranch, EarthlyBranch] {
  const stemIdx = STEMS.indexOf(dayStem);
  const branchIdx = BRANCHES.indexOf(dayBranch);

  // 순(旬)의 시작 지지 인덱스: 현재 지지에서 천간 인덱스만큼 뒤로
  const startBranchIdx = ((branchIdx - stemIdx) % 12 + 12) % 12;

  // 공망 = 순의 시작 지지에서 10, 11번째 (0-indexed)
  const gm1 = BRANCHES[(startBranchIdx + 10) % 12];
  const gm2 = BRANCHES[(startBranchIdx + 11) % 12];

  return [gm1, gm2];
}

// ──────────────────────────────────────────────
// 메인 분석 함수
// ──────────────────────────────────────────────

/**
 * 사주 전체의 신살 분석
 */
export function analyzeSinsal(
  yearStem: HeavenlyStem, yearBranch: EarthlyBranch,
  monthStem: HeavenlyStem, monthBranch: EarthlyBranch,
  dayStem: HeavenlyStem, dayBranch: EarthlyBranch,
  hourStem: HeavenlyStem, hourBranch: EarthlyBranch,
): SinsalInfo[] {
  const results: SinsalInfo[] = [];
  const pillars = [
    { stem: yearStem, branch: yearBranch, name: 'year' as const },
    { stem: monthStem, branch: monthBranch, name: 'month' as const },
    { stem: dayStem, branch: dayBranch, name: 'day' as const },
    { stem: hourStem, branch: hourBranch, name: 'hour' as const },
  ];
  const allBranches = pillars.map(p => p.branch);

  // ── 천간 기준 신살 (일간 기준) ──

  for (const pillar of pillars) {
    // 천을귀인
    if (CHEONUL_GUIN[dayStem].includes(pillar.branch)) {
      results.push({
        name: '천을귀인',
        category: '귀인',
        pillar: pillar.name,
        description: '어려운 상황에서 귀인의 도움을 받음. 위기를 기회로 전환하는 힘',
      });
    }

    // 문창귀인
    if (MUNCHANG_GUIN[dayStem] === pillar.branch) {
      results.push({
        name: '문창귀인',
        category: '귀인',
        pillar: pillar.name,
        description: '학문과 시험에 강함. 문서·계약 관련 일이 잘 풀림',
      });
    }

    // 학당귀인
    if (HAKDANG_GUIN[dayStem] === pillar.branch) {
      results.push({
        name: '학당귀인',
        category: '귀인',
        pillar: pillar.name,
        description: '학업 성취력이 뛰어남. 배움에 대한 깊은 열정',
      });
    }

    // 양인살
    if (YANGIN[dayStem] === pillar.branch) {
      results.push({
        name: '양인살',
        category: '흉살',
        pillar: pillar.name,
        description: '강렬한 추진력이나 과격함 주의. 군인·경찰·외과의사에 유리',
      });
    }

    // 금여록
    if (GEUMYEO[dayStem] === pillar.branch) {
      results.push({
        name: '금여록',
        category: '길신',
        pillar: pillar.name,
        description: '배우자 복이 있음. 귀한 인연과 아름다운 만남',
      });
    }
  }

  // ── 지지 기준 신살 (년지·일지 기준) ──

  const refBranches = [
    { branch: yearBranch, refName: 'year' as const },
    { branch: dayBranch, refName: 'day' as const },
  ];

  for (const ref of refBranches) {
    const group = BRANCH_TO_GROUP[ref.branch];

    for (const pillar of pillars) {
      if (pillar.branch === ref.branch) continue;

      // 역마살
      if (YEOKMA[group] === pillar.branch) {
        results.push({
          name: '역마살',
          category: '기타',
          pillar: pillar.name,
          description: '이동과 변화가 많음. 해외·여행·이사와 인연. 활동적 직업에 유리',
        });
      }

      // 도화살
      if (DOHWA[group] === pillar.branch) {
        results.push({
          name: '도화살',
          category: '기타',
          pillar: pillar.name,
          description: '이성에게 매력적. 예술적 재능. 과하면 색정 문제 주의',
        });
      }

      // 화개살
      if (HWAGAE[group] === pillar.branch) {
        results.push({
          name: '화개살',
          category: '기타',
          pillar: pillar.name,
          description: '종교·철학·예술에 심취. 고독을 즐기며 깊은 사색력',
        });
      }

      // 겁살
      if (GEOBSAL[group] === pillar.branch) {
        results.push({
          name: '겁살',
          category: '흉살',
          pillar: pillar.name,
          description: '갑작스러운 재난·사고 주의. 대담한 행동력의 양면성',
        });
      }

      // 망신살
      if (MANGSIN[group] === pillar.branch) {
        results.push({
          name: '망신살',
          category: '흉살',
          pillar: pillar.name,
          description: '명예 실추·구설수 주의. 체면에 손상이 올 수 있음',
        });
      }
    }
  }

  // ── 월지 기준 귀인 ──

  for (const pillar of pillars) {
    // 천덕귀인 (월지 기준, 천간·지지에서 찾음)
    const cheondukTarget = CHEONDUK[monthBranch];
    if (pillar.stem === cheondukTarget || pillar.branch === cheondukTarget) {
      results.push({
        name: '천덕귀인',
        category: '귀인',
        pillar: pillar.name,
        description: '하늘의 덕으로 재난을 면함. 자연스러운 복록이 따름',
      });
    }

    // 월덕귀인
    if (pillar.stem === WOLDUK[monthBranch]) {
      results.push({
        name: '월덕귀인',
        category: '귀인',
        pillar: pillar.name,
        description: '달의 덕으로 재앙을 면함. 인덕이 있어 주변의 도움을 받음',
      });
    }
  }

  // ── 원진살 (년지↔일지) ──

  if (WONJIN[yearBranch] === dayBranch) {
    results.push({
      name: '원진살',
      category: '흉살',
      pillar: 'day',
      description: '가까운 사이에 원한·갈등이 생기기 쉬움. 관계 관리에 주의',
    });
  }

  // ── 괴강살 (일주 조합) ──

  if (GOEGANG_PAIRS.includes(`${dayStem}${dayBranch}`)) {
    results.push({
      name: '괴강살',
      category: '기타',
      pillar: 'day',
      description: '극도로 강한 카리스마. 리더십과 결단력이 뛰어나나 고집이 셀 수 있음',
    });
  }

  // ── 공망 ──

  const [gm1, gm2] = getGongmang(dayStem, dayBranch);
  for (const pillar of pillars) {
    if (pillar.name === 'day') continue; // 일주 자신은 제외
    if (pillar.branch === gm1 || pillar.branch === gm2) {
      results.push({
        name: '공망',
        category: '기타',
        pillar: pillar.name,
        description: `공망(${gm1}${gm2}). 해당 기둥의 기운이 허함. 좋은 것은 약화, 나쁜 것도 약화`,
      });
    }
  }

  // 중복 제거 (같은 이름 + 같은 기둥)
  const unique = results.filter((item, index, self) =>
    index === self.findIndex(t => t.name === item.name && t.pillar === item.pillar),
  );

  return unique;
}

/**
 * 특정 지지가 공망에 해당하는지 확인
 */
export function isGongmang(
  dayStem: HeavenlyStem,
  dayBranch: EarthlyBranch,
  targetBranch: EarthlyBranch,
): boolean {
  const [gm1, gm2] = getGongmang(dayStem, dayBranch);
  return targetBranch === gm1 || targetBranch === gm2;
}

/**
 * 대운/년운에서의 신살 판정 (일간 + 운의 지지 기준)
 */
export function getSinsalForLuck(
  dayStem: HeavenlyStem,
  dayBranch: EarthlyBranch,
  yearBranch: EarthlyBranch,
  luckBranch: EarthlyBranch,
): SinsalInfo[] {
  const results: SinsalInfo[] = [];

  // 천간 기준 신살
  if (CHEONUL_GUIN[dayStem].includes(luckBranch)) {
    results.push({ name: '천을귀인', category: '귀인', pillar: 'year', description: '귀인의 도움으로 좋은 운이 찾아옴' });
  }
  if (MUNCHANG_GUIN[dayStem] === luckBranch) {
    results.push({ name: '문창귀인', category: '귀인', pillar: 'year', description: '학업·시험·자격증에 유리한 시기' });
  }
  if (YANGIN[dayStem] === luckBranch) {
    results.push({ name: '양인살', category: '흉살', pillar: 'year', description: '강한 에너지가 흐름. 과격한 행동 주의' });
  }

  // 지지 기준 신살 (년지·일지 기준)
  for (const refBranch of [yearBranch, dayBranch]) {
    const group = BRANCH_TO_GROUP[refBranch];
    if (YEOKMA[group] === luckBranch) {
      results.push({ name: '역마살', category: '기타', pillar: 'year', description: '이동·변화가 생기는 시기' });
    }
    if (DOHWA[group] === luckBranch) {
      results.push({ name: '도화살', category: '기타', pillar: 'year', description: '이성 인연이 찾아오는 시기' });
    }
    if (HWAGAE[group] === luckBranch) {
      results.push({ name: '화개살', category: '기타', pillar: 'year', description: '내면 수양·학문에 몰입하게 되는 시기' });
    }
  }

  // 공망
  if (isGongmang(dayStem, dayBranch, luckBranch)) {
    results.push({ name: '공망', category: '기타', pillar: 'year', description: '운의 기운이 허함. 기대보다 실속이 적을 수 있음' });
  }

  // 중복 제거
  return results.filter((item, index, self) =>
    index === self.findIndex(t => t.name === item.name),
  );
}
