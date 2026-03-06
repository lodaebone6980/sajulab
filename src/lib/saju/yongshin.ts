// 용신 5체계 (用神五體系)
// 용신·희신·기신·구신·한신을 강약 판정 결과에 기반하여 체계적으로 결정
//
// ■ 용신(用神): 사주를 균형 잡아주는 가장 필요한 오행
// ■ 희신(喜神): 용신을 돕는 오행 (용신을 생하는 오행)
// ■ 기신(忌神): 용신을 해치는 오행 (용신을 극하는 오행)
// ■ 구신(仇神): 기신을 돕는 오행 (기신을 생하는 오행)
// ■ 한신(閑神): 길흉에 큰 영향 없는 나머지 오행
//
// 판정 기준:
//   1. 신강(身强) → 일간을 설기·극하는 오행이 용신
//      - 식상(설기) 우선, 재성(극), 관성 중 사주에 부족한 것
//   2. 신약(身弱) → 일간을 생·비조하는 오행이 용신
//      - 인성(생) 우선, 비겁(비조) 중 사주에 부족한 것
//   3. 종격(從格) 등 특수격은 별도 처리

import type { FiveElementKo, ElementDistribution, FourPillars, Pillar } from './types';
import type { StrengthResult } from './strength';

// ══════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════

export interface YongShinSystem {
  /** 용신 - 가장 필요한 오행 */
  yongSin: FiveElementKo;
  /** 희신 - 용신을 돕는 오행 */
  huiSin: FiveElementKo;
  /** 기신 - 용신을 해치는 오행 */
  giSin: FiveElementKo;
  /** 구신 - 기신을 돕는 오행 */
  guSin: FiveElementKo;
  /** 한신 - 영향 적은 오행 */
  hanSin: FiveElementKo;
  /** 각 신의 음양 (양=true, 음=false) */
  yinYang: {
    yongSin: '양' | '음';
    huiSin: '양' | '음';
    giSin: '양' | '음';
    guSin: '양' | '음';
    hanSin: '양' | '음';
  };
  /** 각 신의 천간 (甲乙丙丁戊己庚辛壬癸) */
  stems: {
    yongSin: string;
    huiSin: string;
    giSin: string;
    guSin: string;
    hanSin: string;
  };
  /** 판정 근거 설명 */
  reason: string;
  /** 격국 유형 */
  pattern: YongShinPattern;
}

export type YongShinPattern =
  | '억부용신'    // 신강 → 억제, 신약 → 부조
  | '통관용신'    // 상극 대립 → 중간 통관
  | '조후용신'    // 계절 편중 → 조후 조절
  | '병약용신'    // 특정 병(과다) 제거
  | '전왕용신';   // 종격 (한 오행으로 쏠림)

// ══════════════════════════════════════════════
// 오행 관계 테이블
// ══════════════════════════════════════════════

/** 나를 생하는 오행 (인성 관계) */
const GENERATES_ME: Record<FiveElementKo, FiveElementKo> = {
  '목': '수', '화': '목', '토': '화', '금': '토', '수': '금',
};

/** 내가 생하는 오행 (식상 관계) */
const I_GENERATE: Record<FiveElementKo, FiveElementKo> = {
  '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
};

/** 나를 극하는 오행 (관성 관계) */
const OVERCOMES_ME: Record<FiveElementKo, FiveElementKo> = {
  '목': '금', '화': '수', '토': '목', '금': '화', '수': '토',
};

/** 내가 극하는 오행 (재성 관계) */
const I_OVERCOME: Record<FiveElementKo, FiveElementKo> = {
  '목': '토', '화': '금', '토': '수', '금': '목', '수': '화',
};

/** 나와 같은 오행 (비겁 관계) = 자신 */
// dayStemElement 자체

// ══════════════════════════════════════════════
// 계절 → 조후용신 매핑
// ══════════════════════════════════════════════

/** 봄(목왕)·여름(화왕)·가을(금왕)·겨울(수왕)에 필요한 조후 오행 */
const SEASON_JOHU: Record<string, FiveElementKo> = {
  '왕': '수',     // 봄(목왕) → 수(水)로 조절 (실제로는 일간별 다름)
  '상': '금',     // 여름(화왕) → 금(金) 또는 수(水)
  '휴': '화',     // 가을(금왕) → 화(火)
  '수': '목',     // 겨울(수왕) → 목(木) 또는 화(火)
  '사': '토',     // 토왕 → 토(土) 자체
};

// ══════════════════════════════════════════════
// 오행 분포 → 점수 배열 변환
// ══════════════════════════════════════════════

const ELEMENT_ORDER: FiveElementKo[] = ['목', '화', '토', '금', '수'];

// 천간 음양 매핑: 오행 + 음양 → 천간
const ELEMENT_TO_STEM: Record<FiveElementKo, { yang: string; yin: string }> = {
  '목': { yang: '甲', yin: '乙' },
  '화': { yang: '丙', yin: '丁' },
  '토': { yang: '戊', yin: '己' },
  '금': { yang: '庚', yin: '辛' },
  '수': { yang: '壬', yin: '癸' },
};

// 양 천간
const YANG_STEMS = ['甲', '丙', '戊', '庚', '壬'];

function distToArray(dist: ElementDistribution): number[] {
  return [dist.wood, dist.fire, dist.earth, dist.metal, dist.water];
}

function getElementCount(dist: ElementDistribution, el: FiveElementKo): number {
  const map: Record<FiveElementKo, number> = {
    '목': dist.wood, '화': dist.fire, '토': dist.earth,
    '금': dist.metal, '수': dist.water,
  };
  return map[el];
}

// ══════════════════════════════════════════════
// 메인 판정 함수
// ══════════════════════════════════════════════

/**
 * 용신 5체계 종합 판정
 *
 * @param dayStemElement 일간 오행 (한글)
 * @param dist 오행 분포
 * @param strength 강약 판정 결과
 * @param monthBranchSeason 월지 계절 상태 (왕/상/휴/수/사)
 */
export function determineYongShinSystem(
  dayStemElement: FiveElementKo,
  dist: ElementDistribution,
  strength: StrengthResult,
  dayStem?: string, // 일간 천간 (甲~癸)
): YongShinSystem {
  // 1. 종격 판정 (한 오행이 6개 이상이면 전왕격)
  const values = distToArray(dist);
  const total = values.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(...values);
  const maxIndex = values.indexOf(maxVal);

  // 일간의 음양 판별
  const isDayStemYang = dayStem ? YANG_STEMS.includes(dayStem) : true;

  if (maxVal >= 6 && maxVal >= total * 0.7) {
    return determineJeonWang(dayStemElement, dist, ELEMENT_ORDER[maxIndex], isDayStemYang);
  }

  // 2. 통관용신 판정 (두 오행이 강하게 대립)
  const tongGwan = checkTongGwan(dayStemElement, dist, isDayStemYang);
  if (tongGwan) return tongGwan;

  // 3. 조후용신 판정 (계절 편중이 극심)
  const johu = checkJohu(dayStemElement, dist, strength, isDayStemYang);
  if (johu) return johu;

  // 4. 기본: 억부용신 (신강/신약 기반)
  return determineEokBu(dayStemElement, dist, strength, isDayStemYang);
}

// ══════════════════════════════════════════════
// 억부용신 (抑扶用神) - 기본 판정
// ══════════════════════════════════════════════

function determineEokBu(
  dayStemElement: FiveElementKo,
  dist: ElementDistribution,
  strength: StrengthResult,
  isDayStemYang: boolean = true,
): YongShinSystem {
  let yongSin: FiveElementKo;
  let reason: string;

  if (strength.result === '신강') {
    // 신강 → 설기(식상) 또는 극(관성/재성)으로 억제
    const sikSang = I_GENERATE[dayStemElement];   // 식상
    const jaeSung = I_OVERCOME[dayStemElement];    // 재성
    const gwanSung = OVERCOMES_ME[dayStemElement]; // 관성

    // 식상·재성·관성 중 사주에 가장 부족한 것이 용신
    const candidates: [FiveElementKo, number][] = [
      [sikSang, getElementCount(dist, sikSang)],
      [jaeSung, getElementCount(dist, jaeSung)],
      [gwanSung, getElementCount(dist, gwanSung)],
    ];
    candidates.sort((a, b) => a[1] - b[1]); // 적은 순
    yongSin = candidates[0][0];
    reason = `신강(${strength.totalScore > 0 ? '+' : ''}${strength.totalScore}점) → ${yongSin}(${getRelationName(dayStemElement, yongSin)})으로 억제`;

  } else if (strength.result === '신약') {
    // 신약 → 생(인성) 또는 비조(비겁)로 부조
    const inSung = GENERATES_ME[dayStemElement];    // 인성
    const biGeop = dayStemElement;                   // 비겁

    const candidates: [FiveElementKo, number][] = [
      [inSung, getElementCount(dist, inSung)],
      [biGeop, getElementCount(dist, biGeop)],
    ];
    candidates.sort((a, b) => a[1] - b[1]);
    yongSin = candidates[0][0];
    reason = `신약(${strength.totalScore}점) → ${yongSin}(${getRelationName(dayStemElement, yongSin)})으로 부조`;

  } else {
    // 중화 → 사주에서 가장 부족한 오행이 용신
    let minEl: FiveElementKo = '목';
    let minVal = Infinity;
    for (const el of ELEMENT_ORDER) {
      const cnt = getElementCount(dist, el);
      if (cnt < minVal) {
        minVal = cnt;
        minEl = el;
      }
    }
    yongSin = minEl;
    reason = `중화 → ${yongSin}(가장 부족한 오행)으로 균형 보완`;
  }

  return buildSystem(dayStemElement, yongSin, '억부용신', reason, isDayStemYang);
}

// ══════════════════════════════════════════════
// 통관용신 (通關用神)
// ══════════════════════════════════════════════

function checkTongGwan(
  dayStemElement: FiveElementKo,
  dist: ElementDistribution,
  isDayStemYang: boolean = true,
): YongShinSystem | null {
  const values = distToArray(dist);
  const total = values.reduce((a, b) => a + b, 0);

  // 두 오행이 각각 3개 이상이고 상극 관계이면 통관
  for (let i = 0; i < 5; i++) {
    for (let j = i + 1; j < 5; j++) {
      if (values[i] >= 3 && values[j] >= 3) {
        const el1 = ELEMENT_ORDER[i];
        const el2 = ELEMENT_ORDER[j];

        // el1이 el2를 극하는지 확인
        if (I_OVERCOME[el1] === el2 || I_OVERCOME[el2] === el1) {
          // 통관 오행: 극하는 쪽이 생하는 오행
          let tongGwanEl: FiveElementKo;
          if (I_OVERCOME[el1] === el2) {
            // el1 극 el2 → el1이 생하는 오행이 통관 (el1→통관→el2)
            tongGwanEl = I_GENERATE[el1];
            // 검증: 통관 오행이 el2를 생하는지
            if (I_GENERATE[tongGwanEl] !== el2) {
              tongGwanEl = GENERATES_ME[el2];
            }
          } else {
            tongGwanEl = I_GENERATE[el2];
            if (I_GENERATE[tongGwanEl] !== el1) {
              tongGwanEl = GENERATES_ME[el1];
            }
          }

          // 통관 오행이 사주에 부족해야 의미 있음
          if (getElementCount(dist, tongGwanEl) <= 1) {
            return buildSystem(
              dayStemElement, tongGwanEl, '통관용신',
              `${el1}(${values[i]}개)↔${el2}(${values[j]}개) 대립 → ${tongGwanEl}으로 통관`,
              isDayStemYang,
            );
          }
        }
      }
    }
  }
  return null;
}

// ══════════════════════════════════════════════
// 조후용신 (調候用神)
// ══════════════════════════════════════════════

function checkJohu(
  dayStemElement: FiveElementKo,
  dist: ElementDistribution,
  strength: StrengthResult,
  isDayStemYang: boolean = true,
): YongShinSystem | null {
  const season = strength.deukryeong.state; // '왕' | '상' | '휴' | '수' | '사'

  // 극단적 계절 편향 (왕 또는 상이면서 해당 오행이 4개 이상)
  if ((season === '왕' || season === '상') && strength.deukryeong.score >= 25) {
    // 여름(화왕) → 수 필요, 겨울(수왕) → 화 필요
    // 월지 오행이 과다한 경우 조후용신 적용
    const monthElement = getSeasonElement(season, dayStemElement);
    if (monthElement && getElementCount(dist, monthElement) <= 1) {
      return buildSystem(
        dayStemElement, monthElement, '조후용신',
        `${season} 계절 편향(득령 ${strength.deukryeong.score}점) → ${monthElement}으로 조후 조절`,
        isDayStemYang,
      );
    }
  }
  return null;
}

function getSeasonElement(season: string, dayStemElement: FiveElementKo): FiveElementKo | null {
  // 일간이 화이고 여름이면 → 수 필요 (조후)
  // 일간이 수이고 겨울이면 → 화 필요
  // 일반적으로 계절 기운을 제어하는 오행
  if (season === '왕') {
    // 일간과 같은 계절 → 설기하는 오행 필요
    return I_GENERATE[dayStemElement];
  }
  if (season === '상') {
    // 계절의 생을 받음 → 극하는 오행 필요
    return OVERCOMES_ME[dayStemElement];
  }
  return null;
}

// ══════════════════════════════════════════════
// 전왕용신 (專旺用神) - 종격
// ══════════════════════════════════════════════

function determineJeonWang(
  dayStemElement: FiveElementKo,
  dist: ElementDistribution,
  dominantElement: FiveElementKo,
  isDayStemYang: boolean = true,
): YongShinSystem {
  // 종격: 압도적으로 강한 오행을 따라감
  // 용신 = 가장 강한 오행 자체 (거스르지 않음)
  const yongSin = dominantElement;

  return buildSystem(
    dayStemElement, yongSin, '전왕용신',
    `${dominantElement}이(가) ${getElementCount(dist, dominantElement)}개로 압도적 → 종${dominantElement}격, 순응`,
    isDayStemYang,
  );
}

// ══════════════════════════════════════════════
// 5체계 빌드 헬퍼
// ══════════════════════════════════════════════

function buildSystem(
  dayStemElement: FiveElementKo,
  yongSin: FiveElementKo,
  pattern: YongShinPattern,
  reason: string,
  isDayStemYang: boolean = true,
): YongShinSystem {
  // 희신: 용신을 생하는 오행
  const huiSin = GENERATES_ME[yongSin];

  // 기신: 용신을 극하는 오행
  const giSin = OVERCOMES_ME[yongSin];

  // 구신: 기신을 생하는 오행 (용신과 같을 수 없음)
  let guSin = GENERATES_ME[giSin];

  // ─── 검증: 용신·희신·기신·구신은 모두 달라야 함 ───
  // 오행 상생상극 순환 특성상 겹칠 수 없으나, 안전장치 적용
  if (guSin === yongSin) {
    // 구신이 용신과 같으면 → 기신이 극하는 오행으로 대체
    guSin = I_OVERCOME[giSin];
  }
  if (guSin === huiSin) {
    // 구신이 희신과 같으면 → 다른 오행 선택
    guSin = I_GENERATE[giSin];
  }

  // 한신: 나머지 오행 (용신·희신·기신·구신에 속하지 않는 오행)
  const used = new Set([yongSin, huiSin, giSin, guSin]);
  let hanSin: FiveElementKo = '토'; // fallback
  for (const el of ELEMENT_ORDER) {
    if (!used.has(el)) {
      hanSin = el;
      break;
    }
  }

  // ─── 최종 검증: 5신이 모두 서로 다른 오행인지 확인 ───
  const allFive = [yongSin, huiSin, giSin, guSin, hanSin];
  const uniqueSet = new Set(allFive);
  if (uniqueSet.size < 5) {
    console.warn(`[용신] ⚠ 5신 중복 감지: ${allFive.join(',')} — 자동 보정`);
    // 누락된 오행을 한신에 할당
    for (const el of ELEMENT_ORDER) {
      if (!new Set([yongSin, huiSin, giSin, guSin]).has(el)) {
        hanSin = el;
        break;
      }
    }
  }

  // ─── 음양 결정: 일간 음양 기준으로 각 신의 음양 배정 ───
  // 전통 사주학: 용신은 일간과 반대 음양 (정(正) 관계 = 보완)
  // 기신은 일간과 같은 음양 (편(偏) 관계 = 충돌)
  // 구신은 기신을 돕는 쪽이므로 기신과 반대 음양
  // 희신은 용신을 돕는 쪽이므로 용신과 반대 음양
  // 한신은 남은 조합
  const yongYY: '양' | '음' = isDayStemYang ? '음' : '양'; // 용신: 일간 반대 음양 (정 관계)
  const huiYY: '양' | '음' = isDayStemYang ? '양' : '음';  // 희신: 일간과 같은 음양
  const giYY: '양' | '음' = isDayStemYang ? '양' : '음';   // 기신: 일간과 같은 음양 (편 관계)
  const guYY: '양' | '음' = isDayStemYang ? '음' : '양';   // 구신: 일간 반대 음양
  const hanYY: '양' | '음' = isDayStemYang ? '양' : '음';  // 한신: 일간과 같은 음양

  const yinYang = { yongSin: yongYY, huiSin: huiYY, giSin: giYY, guSin: guYY, hanSin: hanYY };
  const stems = {
    yongSin: ELEMENT_TO_STEM[yongSin][yongYY === '양' ? 'yang' : 'yin'],
    huiSin: ELEMENT_TO_STEM[huiSin][huiYY === '양' ? 'yang' : 'yin'],
    giSin: ELEMENT_TO_STEM[giSin][giYY === '양' ? 'yang' : 'yin'],
    guSin: ELEMENT_TO_STEM[guSin][guYY === '양' ? 'yang' : 'yin'],
    hanSin: ELEMENT_TO_STEM[hanSin][hanYY === '양' ? 'yang' : 'yin'],
  };

  return { yongSin, huiSin, giSin, guSin, hanSin, yinYang, stems, reason, pattern };
}

// ══════════════════════════════════════════════
// 관계명 헬퍼
// ══════════════════════════════════════════════

function getRelationName(me: FiveElementKo, target: FiveElementKo): string {
  if (target === me) return '비겁';
  if (I_GENERATE[me] === target) return '식상';
  if (I_OVERCOME[me] === target) return '재성';
  if (OVERCOMES_ME[me] === target) return '관성';
  if (GENERATES_ME[me] === target) return '인성';
  return '?';
}

// ══════════════════════════════════════════════
// 용신 적합도 판정 (운에서 들어오는 오행 평가)
// ══════════════════════════════════════════════

/**
 * 특정 오행이 용신 5체계에서 어떤 역할인지 판정
 * @returns 'yongSin' | 'huiSin' | 'giSin' | 'guSin' | 'hanSin'
 */
export function classifyElement(
  element: FiveElementKo,
  system: YongShinSystem,
): 'yongSin' | 'huiSin' | 'giSin' | 'guSin' | 'hanSin' {
  if (element === system.yongSin) return 'yongSin';
  if (element === system.huiSin) return 'huiSin';
  if (element === system.giSin) return 'giSin';
  if (element === system.guSin) return 'guSin';
  return 'hanSin';
}

/**
 * 용신 5체계 기반 점수 (-50 ~ +50)
 */
export function getYongShinScore(
  element: FiveElementKo,
  system: YongShinSystem,
): number {
  const role = classifyElement(element, system);
  switch (role) {
    case 'yongSin': return 50;
    case 'huiSin': return 30;
    case 'hanSin': return 0;
    case 'guSin': return -30;
    case 'giSin': return -50;
  }
}
