// 형충회합 (刑沖會合) - Branch & Stem Interactions
// 지지 간의 관계(합·충·형·해·파)와 천간 간의 관계(합·충)
//
// ■ 지지 관계:
//   - 육합(六合): 2지지가 합하여 오행 변화
//   - 삼합(三合): 3지지가 합하여 오행국 형성
//   - 방합(方合): 같은 방위의 3지지가 합함
//   - 육충(六沖): 2지지가 정면 충돌
//   - 삼형(三刑): 2~3지지가 형벌 관계
//   - 육해(六害): 2지지가 해침
//   - 육파(六破): 2지지가 깨뜨림
//
// ■ 천간 관계:
//   - 천간합(天干合): 2천간이 합하여 오행 변화
//   - 천간충(天干沖): 2천간이 충돌

import type { HeavenlyStem, EarthlyBranch, FiveElement } from './types';

// ══════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════

export type InteractionType =
  | '천간합' | '천간충'
  | '육합' | '삼합' | '방합'
  | '육충' | '삼형' | '자형' | '육해' | '육파';

export interface Interaction {
  type: InteractionType;
  members: string[];          // 관련 글자들
  positions: string[];        // 위치 (year, month, day, hour 또는 luck)
  resultElement?: FiveElement; // 합의 결과 오행 (합인 경우)
  description: string;
}

// ══════════════════════════════════════════════
// 1. 천간합 (天干合) - 5쌍
// ══════════════════════════════════════════════

const STEM_COMBINE: [HeavenlyStem, HeavenlyStem, FiveElement][] = [
  ['甲', '己', '土'],  // 甲己合土 (중정지합)
  ['乙', '庚', '金'],  // 乙庚合金 (인의지합)
  ['丙', '辛', '水'],  // 丙辛合水 (위엄지합)
  ['丁', '壬', '木'],  // 丁壬合木 (인수지합)
  ['戊', '癸', '火'],  // 戊癸合火 (무정지합)
];

// ══════════════════════════════════════════════
// 2. 천간충 (天干沖) - 5쌍
// ══════════════════════════════════════════════

const STEM_CLASH: [HeavenlyStem, HeavenlyStem][] = [
  ['甲', '庚'], // 木↔金
  ['乙', '辛'], // 木↔金
  ['丙', '壬'], // 火↔水
  ['丁', '癸'], // 火↔水
  ['戊', '甲'], // 土↔木 (일부 학파에서 인정)
];

// ══════════════════════════════════════════════
// 3. 육합 (六合) - 6쌍
// ══════════════════════════════════════════════

const BRANCH_YUKAP: [EarthlyBranch, EarthlyBranch, FiveElement][] = [
  ['子', '丑', '土'],  // 子丑合土
  ['寅', '亥', '木'],  // 寅亥合木
  ['卯', '戌', '火'],  // 卯戌合火
  ['辰', '酉', '金'],  // 辰酉合金
  ['巳', '申', '水'],  // 巳申合水
  ['午', '未', '火'],  // 午未合火 (일설 土)
];

// ══════════════════════════════════════════════
// 4. 삼합 (三合) - 4조
// ══════════════════════════════════════════════

const BRANCH_SAMHAP: [EarthlyBranch, EarthlyBranch, EarthlyBranch, FiveElement][] = [
  ['申', '子', '辰', '水'],  // 申子辰 수국(水局)
  ['寅', '午', '戌', '火'],  // 寅午戌 화국(火局)
  ['巳', '酉', '丑', '金'],  // 巳酉丑 금국(金局)
  ['亥', '卯', '未', '木'],  // 亥卯未 목국(木局)
];

// 반합(半合) 판정용 - 삼합 중 2개만 있는 경우
// 생지+왕지 반합이 왕지+묘지 반합보다 강함

// ══════════════════════════════════════════════
// 5. 방합 (方合) - 4조
// ══════════════════════════════════════════════

const BRANCH_BANGHAP: [EarthlyBranch, EarthlyBranch, EarthlyBranch, FiveElement][] = [
  ['寅', '卯', '辰', '木'],  // 동방 목국
  ['巳', '午', '未', '火'],  // 남방 화국
  ['申', '酉', '戌', '金'],  // 서방 금국
  ['亥', '子', '丑', '水'],  // 북방 수국
];

// ══════════════════════════════════════════════
// 6. 육충 (六沖) - 6쌍
// ══════════════════════════════════════════════

const BRANCH_CHUNG: [EarthlyBranch, EarthlyBranch][] = [
  ['子', '午'],  // 자오충
  ['丑', '未'],  // 축미충
  ['寅', '申'],  // 인신충
  ['卯', '酉'],  // 묘유충
  ['辰', '戌'],  // 진술충
  ['巳', '亥'],  // 사해충
];

// ══════════════════════════════════════════════
// 7. 삼형 (三刑) - 형벌 관계
// ══════════════════════════════════════════════

// 무은지형(無恩之刑): 寅→巳→申→寅 (은혜를 배반)
// 지세지형(恃勢之刑): 丑→戌→未→丑 (세력을 믿고 횡포)
// 무례지형(無禮之刑): 子→卯 (예의 없는 관계)
// 자형(自刑): 辰辰, 午午, 酉酉, 亥亥

const BRANCH_HYUNG_PAIRS: [EarthlyBranch, EarthlyBranch, string][] = [
  // 무은지형
  ['寅', '巳', '무은지형'],
  ['巳', '申', '무은지형'],
  ['申', '寅', '무은지형'],
  // 지세지형
  ['丑', '戌', '지세지형'],
  ['戌', '未', '지세지형'],
  ['未', '丑', '지세지형'],
  // 무례지형
  ['子', '卯', '무례지형'],
  ['卯', '子', '무례지형'],
];

const SELF_PUNISHMENT: EarthlyBranch[] = ['辰', '午', '酉', '亥'];

// ══════════════════════════════════════════════
// 8. 육해 (六害) - 6쌍
// ══════════════════════════════════════════════

const BRANCH_HAE: [EarthlyBranch, EarthlyBranch][] = [
  ['子', '未'],  // 자미해
  ['丑', '午'],  // 축오해
  ['寅', '巳'],  // 인사해
  ['卯', '辰'],  // 묘진해
  ['申', '亥'],  // 신해해
  ['酉', '戌'],  // 유술해
];

// ══════════════════════════════════════════════
// 9. 육파 (六破) - 6쌍
// ══════════════════════════════════════════════

const BRANCH_PA: [EarthlyBranch, EarthlyBranch][] = [
  ['子', '酉'],  // 자유파
  ['丑', '辰'],  // 축진파
  ['寅', '亥'],  // 인해파
  ['卯', '午'],  // 묘오파
  ['巳', '申'],  // 사신파
  ['未', '戌'],  // 미술파
];

// ══════════════════════════════════════════════
// 분석 헬퍼 함수
// ══════════════════════════════════════════════

type PillarName = 'year' | 'month' | 'day' | 'hour';

interface PillarData {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  name: PillarName;
}

function findPairMatch<T>(
  pairs: [T, T, ...unknown[]][],
  items: { value: T; name: string }[],
): { pair: typeof pairs[number]; pos1: string; pos2: string }[] {
  const results: { pair: typeof pairs[number]; pos1: string; pos2: string }[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (const pair of pairs) {
        if (
          (items[i].value === pair[0] && items[j].value === pair[1]) ||
          (items[i].value === pair[1] && items[j].value === pair[0])
        ) {
          results.push({ pair, pos1: items[i].name, pos2: items[j].name });
        }
      }
    }
  }
  return results;
}

// ══════════════════════════════════════════════
// 메인 분석 함수
// ══════════════════════════════════════════════

/**
 * 사주 전체의 형충회합 분석
 */
export function analyzeInteractions(
  yearStem: HeavenlyStem, yearBranch: EarthlyBranch,
  monthStem: HeavenlyStem, monthBranch: EarthlyBranch,
  dayStem: HeavenlyStem, dayBranch: EarthlyBranch,
  hourStem: HeavenlyStem, hourBranch: EarthlyBranch,
): Interaction[] {
  const results: Interaction[] = [];

  const pillars: PillarData[] = [
    { stem: yearStem, branch: yearBranch, name: 'year' },
    { stem: monthStem, branch: monthBranch, name: 'month' },
    { stem: dayStem, branch: dayBranch, name: 'day' },
    { stem: hourStem, branch: hourBranch, name: 'hour' },
  ];

  const stemItems = pillars.map(p => ({ value: p.stem, name: p.name }));
  const branchItems = pillars.map(p => ({ value: p.branch, name: p.name }));

  // ── 천간합 ──
  for (const match of findPairMatch(STEM_COMBINE, stemItems)) {
    const [s1, s2, element] = match.pair;
    results.push({
      type: '천간합',
      members: [s1, s2],
      positions: [match.pos1, match.pos2],
      resultElement: element as FiveElement,
      description: `${s1}${s2}합${element} - 두 천간이 합하여 ${element}의 기운으로 변화`,
    });
  }

  // ── 천간충 ──
  for (const match of findPairMatch(STEM_CLASH, stemItems)) {
    const [s1, s2] = match.pair;
    results.push({
      type: '천간충',
      members: [s1, s2],
      positions: [match.pos1, match.pos2],
      description: `${s1}${s2}충 - 두 천간이 충돌하여 기운이 흩어짐`,
    });
  }

  // ── 육합 ──
  for (const match of findPairMatch(BRANCH_YUKAP, branchItems)) {
    const [b1, b2, element] = match.pair;
    results.push({
      type: '육합',
      members: [b1, b2],
      positions: [match.pos1, match.pos2],
      resultElement: element as FiveElement,
      description: `${b1}${b2}합${element} - 두 지지가 합하여 ${element}의 기운 생성`,
    });
  }

  // ── 삼합 ──
  const branchSet = new Set(pillars.map(p => p.branch));
  for (const [b1, b2, b3, element] of BRANCH_SAMHAP) {
    const has1 = pillars.find(p => p.branch === b1);
    const has2 = pillars.find(p => p.branch === b2);
    const has3 = pillars.find(p => p.branch === b3);

    if (has1 && has2 && has3) {
      // 완전 삼합
      results.push({
        type: '삼합',
        members: [b1, b2, b3],
        positions: [has1.name, has2.name, has3.name],
        resultElement: element,
        description: `${b1}${b2}${b3} 삼합${element}국 - 세 지지가 합하여 강력한 ${element}의 기운 형성`,
      });
    } else if (has1 && has2) {
      // 반합 (생지+왕지)
      results.push({
        type: '삼합',
        members: [b1, b2],
        positions: [has1.name, has2.name],
        resultElement: element,
        description: `${b1}${b2} 반합(생왕) - ${element}국의 반합으로 ${element} 기운 일부 생성`,
      });
    } else if (has2 && has3) {
      // 반합 (왕지+묘지)
      results.push({
        type: '삼합',
        members: [b2, b3],
        positions: [has2.name, has3.name],
        resultElement: element,
        description: `${b2}${b3} 반합(왕묘) - ${element}국의 반합으로 ${element} 기운 일부 저장`,
      });
    }
  }

  // ── 방합 ──
  for (const [b1, b2, b3, element] of BRANCH_BANGHAP) {
    const has1 = pillars.find(p => p.branch === b1);
    const has2 = pillars.find(p => p.branch === b2);
    const has3 = pillars.find(p => p.branch === b3);

    if (has1 && has2 && has3) {
      results.push({
        type: '방합',
        members: [b1, b2, b3],
        positions: [has1.name, has2.name, has3.name],
        resultElement: element,
        description: `${b1}${b2}${b3} 방합 - 같은 방위의 세 지지가 합하여 ${element}의 기운 극대화`,
      });
    }
  }

  // ── 육충 ──
  for (const match of findPairMatch(BRANCH_CHUNG, branchItems)) {
    const [b1, b2] = match.pair;
    results.push({
      type: '육충',
      members: [b1, b2],
      positions: [match.pos1, match.pos2],
      description: `${b1}${b2}충 - 정면 충돌로 변동·갈등·이별의 기운`,
    });
  }

  // ── 삼형 ──
  // 무은지형 3개 모두 있는지 확인
  const hasYin = pillars.find(p => p.branch === '寅');
  const hasSa = pillars.find(p => p.branch === '巳');
  const hasSin = pillars.find(p => p.branch === '申');
  if (hasYin && hasSa && hasSin) {
    results.push({
      type: '삼형',
      members: ['寅', '巳', '申'],
      positions: [hasYin.name, hasSa.name, hasSin.name],
      description: '寅巳申 무은지형(無恩之刑) - 은혜를 저버리는 형. 배신·소송 주의',
    });
  }

  // 지세지형 3개 모두 있는지 확인
  const hasChuk = pillars.find(p => p.branch === '丑');
  const hasSul = pillars.find(p => p.branch === '戌');
  const hasMi = pillars.find(p => p.branch === '未');
  if (hasChuk && hasSul && hasMi) {
    results.push({
      type: '삼형',
      members: ['丑', '戌', '未'],
      positions: [hasChuk.name, hasSul.name, hasMi.name],
      description: '丑戌未 지세지형(恃勢之刑) - 세력을 믿고 무리함. 관재·시비 주의',
    });
  }

  // 2개 형살 (삼형 완성 안 된 경우만)
  for (const match of findPairMatch(BRANCH_HYUNG_PAIRS, branchItems)) {
    const [b1, b2, hyungType] = match.pair;
    // 삼형 완성된 경우 2개 형은 스킵
    if (hyungType === '무은지형' && hasYin && hasSa && hasSin) continue;
    if (hyungType === '지세지형' && hasChuk && hasSul && hasMi) continue;

    results.push({
      type: '삼형',
      members: [b1 as string, b2 as string],
      positions: [match.pos1, match.pos2],
      description: `${b1}${b2} ${hyungType} - 형벌의 기운으로 갈등·장애 발생`,
    });
  }

  // 자형
  for (const branch of SELF_PUNISHMENT) {
    const matches = pillars.filter(p => p.branch === branch);
    if (matches.length >= 2) {
      results.push({
        type: '자형',
        members: [branch, branch],
        positions: matches.map(m => m.name),
        description: `${branch}${branch} 자형(自刑) - 스스로를 해치는 기운. 자기 파괴적 경향 주의`,
      });
    }
  }

  // ── 육해 ──
  for (const match of findPairMatch(BRANCH_HAE, branchItems)) {
    const [b1, b2] = match.pair;
    results.push({
      type: '육해',
      members: [b1, b2],
      positions: [match.pos1, match.pos2],
      description: `${b1}${b2}해 - 서로 해치는 관계. 가까운 사이의 상처·배반`,
    });
  }

  // ── 육파 ──
  for (const match of findPairMatch(BRANCH_PA, branchItems)) {
    const [b1, b2] = match.pair;
    results.push({
      type: '육파',
      members: [b1, b2],
      positions: [match.pos1, match.pos2],
      description: `${b1}${b2}파 - 깨뜨리는 관계. 계획이 무산되거나 일이 파탄`,
    });
  }

  return results;
}

/**
 * 대운/년운 지지가 사주와 맺는 형충회합 분석
 */
export function analyzeInteractionsWithLuck(
  yearBranch: EarthlyBranch,
  monthBranch: EarthlyBranch,
  dayBranch: EarthlyBranch,
  hourBranch: EarthlyBranch,
  luckStem: HeavenlyStem,
  luckBranch: EarthlyBranch,
  dayStem: HeavenlyStem,
): Interaction[] {
  const results: Interaction[] = [];

  const sajuBranches: { branch: EarthlyBranch; name: string }[] = [
    { branch: yearBranch, name: 'year' },
    { branch: monthBranch, name: 'month' },
    { branch: dayBranch, name: 'day' },
    { branch: hourBranch, name: 'hour' },
  ];

  // 천간합/충 (일간 vs 운의 천간)
  for (const [s1, s2, element] of STEM_COMBINE) {
    if ((dayStem === s1 && luckStem === s2) || (dayStem === s2 && luckStem === s1)) {
      results.push({
        type: '천간합',
        members: [dayStem, luckStem],
        positions: ['day', 'luck'],
        resultElement: element,
        description: `${dayStem}${luckStem}합${element} - 운에서 합이 들어와 ${element} 기운 강화`,
      });
    }
  }

  for (const [s1, s2] of STEM_CLASH) {
    if ((dayStem === s1 && luckStem === s2) || (dayStem === s2 && luckStem === s1)) {
      results.push({
        type: '천간충',
        members: [dayStem, luckStem],
        positions: ['day', 'luck'],
        description: `${dayStem}${luckStem}충 - 운에서 충이 들어와 변동 발생`,
      });
    }
  }

  // 지지 관계 (사주 각 지지 vs 운의 지지)
  for (const saju of sajuBranches) {
    // 육합
    for (const [b1, b2, element] of BRANCH_YUKAP) {
      if ((saju.branch === b1 && luckBranch === b2) || (saju.branch === b2 && luckBranch === b1)) {
        results.push({
          type: '육합',
          members: [saju.branch, luckBranch],
          positions: [saju.name, 'luck'],
          resultElement: element,
          description: `${saju.branch}${luckBranch}합${element} - 운에서 합이 들어옴`,
        });
      }
    }

    // 육충
    for (const [b1, b2] of BRANCH_CHUNG) {
      if ((saju.branch === b1 && luckBranch === b2) || (saju.branch === b2 && luckBranch === b1)) {
        results.push({
          type: '육충',
          members: [saju.branch, luckBranch],
          positions: [saju.name, 'luck'],
          description: `${saju.branch}${luckBranch}충 - 운에서 충이 들어와 해당 기둥에 변동`,
        });
      }
    }

    // 형
    for (const [b1, b2, hyungType] of BRANCH_HYUNG_PAIRS) {
      if ((saju.branch === b1 && luckBranch === b2) || (saju.branch === b2 && luckBranch === b1)) {
        results.push({
          type: '삼형',
          members: [saju.branch, luckBranch],
          positions: [saju.name, 'luck'],
          description: `${saju.branch}${luckBranch} ${hyungType} - 운에서 형이 들어옴`,
        });
      }
    }

    // 해
    for (const [b1, b2] of BRANCH_HAE) {
      if ((saju.branch === b1 && luckBranch === b2) || (saju.branch === b2 && luckBranch === b1)) {
        results.push({
          type: '육해',
          members: [saju.branch, luckBranch],
          positions: [saju.name, 'luck'],
          description: `${saju.branch}${luckBranch}해 - 운에서 해가 들어옴`,
        });
      }
    }

    // 파
    for (const [b1, b2] of BRANCH_PA) {
      if ((saju.branch === b1 && luckBranch === b2) || (saju.branch === b2 && luckBranch === b1)) {
        results.push({
          type: '육파',
          members: [saju.branch, luckBranch],
          positions: [saju.name, 'luck'],
          description: `${saju.branch}${luckBranch}파 - 운에서 파가 들어옴`,
        });
      }
    }
  }

  return results;
}

/**
 * 형충회합 요약 - 합과 충의 개수만 간단히 반환
 */
export function getInteractionSummary(interactions: Interaction[]): {
  combines: number;
  clashes: number;
  punishments: number;
  harms: number;
  destructions: number;
  favorable: boolean;
} {
  const combines = interactions.filter(i =>
    ['천간합', '육합', '삼합', '방합'].includes(i.type),
  ).length;
  const clashes = interactions.filter(i =>
    ['천간충', '육충'].includes(i.type),
  ).length;
  const punishments = interactions.filter(i =>
    ['삼형', '자형'].includes(i.type),
  ).length;
  const harms = interactions.filter(i => i.type === '육해').length;
  const destructions = interactions.filter(i => i.type === '육파').length;

  return {
    combines,
    clashes,
    punishments,
    harms,
    destructions,
    favorable: combines > (clashes + punishments + harms),
  };
}
