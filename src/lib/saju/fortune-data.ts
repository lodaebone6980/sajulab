// SajuResult → sajulab.kr 10섹션 데이터 변환
// sajulab.kr의 "데이터" 모달과 동일한 구조

import type { SajuResult, BirthInfo, FourPillars, Pillar } from './types';

// ──────────────────────────────────────────────
// 10섹션 타입 정의
// ──────────────────────────────────────────────

export interface FortuneDataSections {
  info: InfoSection;
  pillar: PillarSection;
  yongsin: YongsinSection;
  yinyang: YinyangSection;
  shinsal: ShinsalSection;
  hyungchung: HyungchungSection;
  daeun: DaeunSection;
  nyunun: NyununSection;
  wolun: WolunSection;
  wolun2: WolunSection;
}

export interface InfoSection {
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  calendarType: string;
  solarDate: string;
  calculationSource: string;
}

export interface PillarSection {
  year: PillarData;
  month: PillarData;
  day: PillarData;
  hour: PillarData;
  tenGods: { year: string; month: string; hour: string };
  hiddenStems?: {
    year: { 余: string | null; 中: string | null; 正: string };
    month: { 余: string | null; 中: string | null; 正: string };
    day: { 余: string | null; 中: string | null; 正: string };
    hour: { 余: string | null; 中: string | null; 正: string };
  };
  twelveStages?: {
    bong: { year: string; month: string; day: string; hour: string };
    geo: { year: string; month: string; day: string; hour: string };
  };
  nayin?: {
    year: { name: string; element: string };
    month: { name: string; element: string };
    day: { name: string; element: string };
    hour: { name: string; element: string };
  };
}

export interface PillarData {
  stem: string;
  branch: string;
  stemKo: string;
  branchKo: string;
  element: string;
  elementKo: string;
  yinYang: string;
  yinYangKo: string;
}

export interface YongsinSection {
  yongSin: string;
  giSin: string;
  system?: {
    yongSin: string;
    huiSin: string;
    giSin: string;
    guSin: string;
    hanSin: string;
    reason: string;
    pattern: string;
  };
  strength?: {
    result: string;
    totalScore: number;
    deukryeong: { score: number; season: string; gained: boolean };
    deukji: { score: number; count: number; gained: boolean };
    deukse: { score: number; helpCount: number; hinderCount: number; gained: boolean };
  };
}

export interface YinyangSection {
  distribution: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  dominant: string;
  weak: string;
  yinCount: number;
  yangCount: number;
}

export interface ShinsalSection {
  items: { name: string; category: string; pillar: string; description: string }[];
  summary: { 귀인: string[]; 길신: string[]; 흉살: string[]; 기타: string[] };
}

export interface HyungchungSection {
  interactions: { type: string; members: string[]; positions: string[]; resultElement?: string; description: string }[];
  summary: string[];
}

export interface DaeunSection {
  items: {
    age: number;
    startYear: number;
    endYear: number;
    stem: string;
    branch: string;
    element: string;
    description: string;
  }[];
}

export interface NyununSection {
  year: number;
  stem: string;
  branch: string;
  stemKo: string;
  branchKo: string;
  element: string;
  elementKo: string;
  animal: string;
  tenGod: string;
  twelveStage: string;
  summary: string;
}

export interface WolunSection {
  months: {
    year: number;
    month: number;
    stem: string;
    branch: string;
    stemKo: string;
    branchKo: string;
    element: string;
    elementKo: string;
    tenGod: string;
    twelveStage: string;
    summary: string;
  }[];
}

// ──────────────────────────────────────────────
// 변환 함수
// ──────────────────────────────────────────────

function pillarToData(p: Pillar): PillarData {
  return {
    stem: p.heavenlyStem,
    branch: p.earthlyBranch,
    stemKo: p.heavenlyStemKo,
    branchKo: p.earthlyBranchKo,
    element: p.element,
    elementKo: p.elementKo,
    yinYang: p.yinYang,
    yinYangKo: p.yinYangKo,
  };
}

export function convertSajuResultToSections(
  result: SajuResult,
  customerName: string,
  gender: string,
  calendarType: string = 'solar'
): FortuneDataSections {
  const bi = result.birthInfo;

  // ── 1. info ──
  const info: InfoSection = {
    name: customerName,
    gender: gender === 'male' ? '남' : '여',
    birthDate: `${bi.year}년 ${bi.month}월 ${bi.day}일`,
    birthTime: bi.hour >= 0 ? `${bi.hour}시 ${bi.minute}분` : '시간 미상',
    calendarType: calendarType === 'solar' ? '양력' : calendarType === 'lunar' ? '음력' : '윤달',
    solarDate: `${bi.year}-${String(bi.month).padStart(2, '0')}-${String(bi.day).padStart(2, '0')}`,
    calculationSource: result.calculationSource || 'manseryeok-kasi',
  };

  // ── 2. pillar ──
  const pillar: PillarSection = {
    year: pillarToData(result.fourPillars.year),
    month: pillarToData(result.fourPillars.month),
    day: pillarToData(result.fourPillars.day),
    hour: pillarToData(result.fourPillars.hour),
    tenGods: result.tenGods,
  };
  if (result.hiddenStems) {
    pillar.hiddenStems = result.hiddenStems as PillarSection['hiddenStems'];
  }
  if (result.twelveStages) {
    pillar.twelveStages = result.twelveStages as PillarSection['twelveStages'];
  }
  if (result.nayin) {
    pillar.nayin = {
      year: { name: result.nayin.year.name, element: result.nayin.year.element },
      month: { name: result.nayin.month.name, element: result.nayin.month.element },
      day: { name: result.nayin.day.name, element: result.nayin.day.element },
      hour: { name: result.nayin.hour.name, element: result.nayin.hour.element },
    };
  }

  // ── 3. yongsin ──
  const yongsin: YongsinSection = {
    yongSin: result.yongSin,
    giSin: result.giSin,
  };
  if (result.yongShinSystem) {
    const sys = result.yongShinSystem;
    yongsin.system = {
      yongSin: sys.yongSin,
      huiSin: sys.huiSin,
      giSin: sys.giSin,
      guSin: sys.guSin,
      hanSin: sys.hanSin,
      reason: sys.reason,
      pattern: sys.pattern,
    };
  }
  if (result.strength) {
    const s = result.strength;
    yongsin.strength = {
      result: s.result,
      totalScore: s.totalScore,
      deukryeong: { score: s.deukryeong.score, season: s.deukryeong.season, gained: s.deukryeong.gained },
      deukji: { score: s.deukji.score, count: s.deukji.tonggeunCount, gained: s.deukji.gained },
      deukse: { score: s.deukse.score, helpCount: s.deukse.supportCount, hinderCount: s.deukse.opposeCount, gained: s.deukse.gained },
    };
  }

  // ── 4. yinyang ──
  const dist = result.elementDistribution;
  const elements = [
    { name: '목', val: dist.wood },
    { name: '화', val: dist.fire },
    { name: '토', val: dist.earth },
    { name: '금', val: dist.metal },
    { name: '수', val: dist.water },
  ];
  const sorted = [...elements].sort((a, b) => b.val - a.val);
  const weakSorted = [...elements].sort((a, b) => a.val - b.val);

  // 음양 카운트: 천간+지지 8자 중 양/음 개수
  let yangCount = 0;
  let yinCount = 0;
  for (const p of [result.fourPillars.year, result.fourPillars.month, result.fourPillars.day, result.fourPillars.hour]) {
    if (p.yinYangKo === '양') yangCount += 2; // stem + branch 단순 근사
    else yinCount += 2;
    // 좀 더 정확하게: 천간과 지지 별도
  }
  // 실제로는 천간4 + 지지4 = 8글자이므로 더 정밀하게
  yangCount = 0;
  yinCount = 0;
  for (const p of [result.fourPillars.year, result.fourPillars.month, result.fourPillars.day, result.fourPillars.hour]) {
    // 천간 음양
    if (p.yinYang === '陽') yangCount++; else yinCount++;
    // 지지 음양 (양: 子寅辰午申戌, 음: 丑卯巳未酉亥)
    const yangBranches = ['子', '寅', '辰', '午', '申', '戌'];
    if (yangBranches.includes(p.earthlyBranch)) yangCount++; else yinCount++;
  }

  const yinyang: YinyangSection = {
    distribution: dist,
    dominant: sorted[0].name,
    weak: weakSorted[0].val === 0 ? weakSorted[0].name : weakSorted[0].name,
    yinCount,
    yangCount,
  };

  // ── 5. shinsal ──
  const shinsal: ShinsalSection = {
    items: [],
    summary: { 귀인: [], 길신: [], 흉살: [], 기타: [] },
  };
  if (result.sinsal?.length) {
    shinsal.items = result.sinsal.map(s => ({
      name: s.name,
      category: s.category,
      pillar: s.pillar,
      description: s.description,
    }));
    for (const s of result.sinsal) {
      if (shinsal.summary[s.category as keyof typeof shinsal.summary]) {
        shinsal.summary[s.category as keyof typeof shinsal.summary].push(s.name);
      }
    }
    // 중복 제거
    for (const key of Object.keys(shinsal.summary) as Array<keyof typeof shinsal.summary>) {
      shinsal.summary[key] = [...new Set(shinsal.summary[key])];
    }
  }

  // ── 6. hyungchung ──
  const hyungchung: HyungchungSection = {
    interactions: [],
    summary: [],
  };
  if (result.interactions?.length) {
    hyungchung.interactions = result.interactions.map(i => ({
      type: i.type,
      members: i.members,
      positions: i.positions,
      resultElement: i.resultElement,
      description: i.description,
    }));
    hyungchung.summary = result.interactions.map(i => `${i.type}: ${i.members.join('·')} (${i.description})`);
  }

  // ── 7. daeun ──
  const daeun: DaeunSection = {
    items: result.daeUn.map(d => ({
      age: d.age,
      startYear: d.startYear,
      endYear: d.endYear,
      stem: d.heavenlyStem,
      branch: d.earthlyBranch,
      element: d.element,
      description: d.description,
    })),
  };

  // ── 8. nyunun ──
  const nyunun: NyununSection = result.yearFortune ? {
    year: result.yearFortune.year,
    stem: result.yearFortune.stem,
    branch: result.yearFortune.branch,
    stemKo: result.yearFortune.stemKo,
    branchKo: result.yearFortune.branchKo,
    element: result.yearFortune.element,
    elementKo: result.yearFortune.elementKo,
    animal: result.yearFortune.animal,
    tenGod: result.yearFortune.tenGod,
    twelveStage: result.yearFortune.twelveStage,
    summary: result.yearFortune.summary,
  } : {
    year: new Date().getFullYear(),
    stem: '', branch: '', stemKo: '', branchKo: '',
    element: '', elementKo: '', animal: '', tenGod: '', twelveStage: '', summary: '',
  };

  // ── 9 & 10. wolun / wolun2 (1~6월 / 7~12월) ──
  const allMonths = (result.monthFortunes || []).map(m => ({
    year: m.year,
    month: m.month,
    stem: m.stem,
    branch: m.branch,
    stemKo: m.stemKo,
    branchKo: m.branchKo,
    element: m.element,
    elementKo: m.elementKo,
    tenGod: m.tenGod,
    twelveStage: m.twelveStage,
    summary: m.summary,
  }));

  const wolun: WolunSection = {
    months: allMonths.filter(m => m.month <= 6),
  };
  const wolun2: WolunSection = {
    months: allMonths.filter(m => m.month > 6),
  };

  return { info, pillar, yongsin, yinyang, shinsal, hyungchung, daeun, nyunun, wolun, wolun2 };
}

/** 전체 라인 수 계산 (sajulab.kr 스타일 ~1300줄) */
export function countTotalLines(sections: FortuneDataSections): number {
  let total = 0;
  for (const value of Object.values(sections)) {
    total += JSON.stringify(value, null, 2).split('\n').length;
  }
  return total;
}
