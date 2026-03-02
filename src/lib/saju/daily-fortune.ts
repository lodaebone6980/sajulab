// 오늘의 운세 (日運) - 일진 계산 및 사주 원국 대비 분석
//
// ■ 일진(日辰): 오늘 날짜의 천간지지
// ■ 사주 원국과의 형충회합, 십성, 십이운성, 용신 관계 분석
// ■ 영역별(전체/재물/애정/사업/건강) 길흉 판단

import {
  HEAVENLY_STEMS, HEAVENLY_STEMS_KO,
  EARTHLY_BRANCHES, EARTHLY_BRANCHES_KO,
  STEM_ELEMENT, STEM_ELEMENT_KO,
  BRANCH_ELEMENT, BRANCH_ELEMENT_KO,
  STEM_YINYANG, STEM_YINYANG_KO,
  STEM_HANJA_TO_KO, BRANCH_HANJA_TO_KO,
  ELEMENT_GENERATING, ELEMENT_OVERCOMING,
} from './constants';

import type {
  HeavenlyStem, EarthlyBranch,
  FiveElement, FiveElementKo,
  Pillar, FourPillars,
} from './types';

import { calculateTenGod } from './calculator';
import { getTwelveStageBong } from './twelve-stages';
import { analyzeInteractionsWithLuck, getInteractionSummary, type Interaction } from './interactions';

// ══════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════

export interface DailyFortune {
  date: string;                    // YYYY-MM-DD
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  stemKo: string;
  branchKo: string;
  element: FiveElement;
  elementKo: FiveElementKo;
  animal: string;
  tenGod: string;                  // 일간 기준 십성
  twelveStage: string;             // 일간 기준 십이운성
  interactions: Interaction[];
  overallScore: number;            // 종합 점수 (0-100)
  scores: {
    overall: number;               // 종합 (0-100)
    wealth: number;                // 재물 (0-100)
    love: number;                  // 애정 (0-100)
    career: number;                // 사업 (0-100)
    health: number;                // 건강 (0-100)
  };
  advice: string;                  // 오늘의 조언
  luckyTime: string;               // 길시(吉時)
  cautionTime: string;             // 주의시간
  descriptions: {
    overall: string;
    wealth: string;
    love: string;
    career: string;
    health: string;
  };
}

// ══════════════════════════════════════════════
// 일주(일진) 계산
// ══════════════════════════════════════════════

const BRANCH_ANIMALS: Record<EarthlyBranch, string> = {
  '子': '쥐', '丑': '소', '寅': '호랑이', '卯': '토끼',
  '辰': '용', '巳': '뱀', '午': '말', '未': '양',
  '申': '원숭이', '酉': '닭', '戌': '개', '亥': '돼지',
};

/**
 * 특정 날짜의 일주(천간지지) 계산
 * 기준일: 2000-01-01 = 甲子 (갑자일)
 * 실제 2000-01-01은 갑진일이므로 오프셋 보정
 */
export function getDayPillar(date: Date): Pillar {
  // 기준일: 1900-01-01 = 庚子일 (경자)
  // 庚 = index 6, 子 = index 0
  const baseDate = new Date(1900, 0, 1); // 1900-01-01
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  // 1900-01-01은 경자일 → 60갑자에서 stem=6(庚), branch=0(子)
  // 60갑자에서의 순번: (stem*6 + branch) 대신 단순히 stem과 branch를 각각 mod
  const stemIndex = ((6 + diffDays) % 10 + 10) % 10;
  const branchIndex = ((0 + diffDays) % 12 + 12) % 12;

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

// ══════════════════════════════════════════════
// 십성별 운세 해석 데이터
// ══════════════════════════════════════════════

const TEN_GOD_FORTUNE: Record<string, {
  overall: string;
  wealth: string;
  love: string;
  career: string;
  health: string;
  advice: string;
}> = {
  '비견': {
    overall: '자기 주장이 강해지는 날입니다. 경쟁심이 올라와 좋은 결과를 낼 수 있지만, 과도한 고집은 삼가세요.',
    wealth: '동업이나 공동 투자 제안에 신중하세요. 재물이 분산될 수 있는 날입니다.',
    love: '연인과 의견 충돌이 있을 수 있습니다. 서로의 독립성을 존중해주세요.',
    career: '팀 내 경쟁이 치열할 수 있습니다. 협력을 통해 시너지를 만들어보세요.',
    health: '과로와 스트레스에 주의하세요. 적절한 운동이 도움이 됩니다.',
    advice: '남과 비교하지 말고 자신만의 속도로 나아가세요.',
  },
  '겁재': {
    overall: '예상치 못한 지출이 있을 수 있는 날입니다. 충동적인 결정은 피하세요.',
    wealth: '돈을 빌려주거나 보증에 각별히 주의하세요. 재물 손실 가능성이 있습니다.',
    love: '삼각관계나 애정의 방해가 있을 수 있습니다. 상대방을 믿어주세요.',
    career: '동료와의 갈등이 있을 수 있습니다. 양보할 줄 아는 지혜가 필요합니다.',
    health: '사고에 주의하세요. 위험한 활동은 삼가는 것이 좋습니다.',
    advice: '지키는 것이 버는 것입니다. 오늘은 절약의 미덕을 실천하세요.',
  },
  '식신': {
    overall: '창의력이 넘치고 여유로운 하루입니다. 먹거리 운도 좋습니다.',
    wealth: '안정적인 수입이 예상됩니다. 장기 투자에 유리한 날입니다.',
    love: '따뜻한 감정 교류가 있는 날입니다. 함께 맛있는 식사를 즐겨보세요.',
    career: '아이디어가 샘솟는 날입니다. 기획이나 창작 활동에 좋습니다.',
    health: '과식에 주의하세요. 소화기 건강을 챙겨야 합니다.',
    advice: '여유를 즐기되, 게으름에 빠지지 않도록 하세요.',
  },
  '상관': {
    overall: '말이 많아지고 비판적인 시각이 강해지는 날입니다. 언어 표현에 신경 쓰세요.',
    wealth: '투기성 투자에 주의하세요. 큰 수익을 노리다 손실이 있을 수 있습니다.',
    love: '상대방에 대한 불만이 표출될 수 있습니다. 말 한마디에 신중하세요.',
    career: '상사와 마찰이 생길 수 있습니다. 의견 제시는 부드럽게 하세요.',
    health: '신경성 질환에 주의하세요. 마음을 편히 가지세요.',
    advice: '날카로운 말보다 따뜻한 한마디가 세상을 바꿉니다.',
  },
  '편재': {
    overall: '뜻밖의 재물운이 있는 날입니다. 활동적으로 움직이면 좋은 기회를 잡을 수 있습니다.',
    wealth: '예상치 못한 수입이 있을 수 있습니다. 하지만 큰 도박은 삼가세요.',
    love: '새로운 만남이 있을 수 있습니다. 매력이 빛나는 날입니다.',
    career: '영업이나 대외 활동에서 좋은 성과를 낼 수 있습니다.',
    health: '과로에 주의하세요. 무리한 활동은 피하는 것이 좋습니다.',
    advice: '기회가 왔을 때 망설이지 마세요. 하지만 무리는 금물입니다.',
  },
  '정재': {
    overall: '안정적이고 계획적인 하루입니다. 재무 관리에 좋은 날입니다.',
    wealth: '정기 수입이 안정적입니다. 저축이나 보험 가입에 좋은 날입니다.',
    love: '안정적이고 신뢰감 있는 관계가 됩니다. 진솔한 대화를 나눠보세요.',
    career: '꾸준한 노력이 결실을 맺는 날입니다. 꼼꼼한 업무 처리가 빛납니다.',
    health: '규칙적인 생활이 건강을 지켜줍니다.',
    advice: '작은 것부터 하나씩, 성실함이 최고의 전략입니다.',
  },
  '편관': {
    overall: '압박감이 있지만 도전적인 하루입니다. 리더십을 발휘할 기회가 있습니다.',
    wealth: '재물보다는 명예에 관심이 가는 날입니다. 무리한 투자는 삼가세요.',
    love: '상대방에게 다소 부담을 줄 수 있습니다. 배려의 마음을 가지세요.',
    career: '책임감 있는 업무가 맡겨질 수 있습니다. 자신감을 가지고 임하세요.',
    health: '긴장으로 인한 두통이나 불면에 주의하세요.',
    advice: '어려움 속에서 성장의 기회를 찾으세요.',
  },
  '정관': {
    overall: '질서정연하고 규범적인 하루입니다. 공식적인 활동에 좋습니다.',
    wealth: '정당한 수입이 기대됩니다. 세금이나 공과금 처리에 좋은 날입니다.',
    love: '예의 바르고 품위 있는 만남이 기대됩니다. 격식 있는 자리가 좋습니다.',
    career: '승진이나 인정을 받을 수 있는 날입니다. 규정을 잘 지키세요.',
    health: '과로하지 말고 충분한 휴식을 취하세요.',
    advice: '정도를 걸으세요. 정직과 성실이 가장 큰 무기입니다.',
  },
  '편인': {
    overall: '학문과 연구에 좋은 날입니다. 새로운 지식을 배우기에 최적입니다.',
    wealth: '재물보다는 자기계발에 투자하세요. 장기적으로 더 큰 수확이 있습니다.',
    love: '혼자만의 시간이 필요할 수 있습니다. 상대방의 개인 공간을 존중하세요.',
    career: '창의적인 아이디어가 떠오를 수 있습니다. 기록해두세요.',
    health: '정신적 피로에 주의하세요. 명상이나 독서가 도움이 됩니다.',
    advice: '고요한 마음으로 내면의 소리에 귀 기울이세요.',
  },
  '정인': {
    overall: '지혜롭고 안정적인 하루입니다. 학업이나 자격증 시험에 유리합니다.',
    wealth: '무리 없이 안정적인 재물 흐름입니다. 부모님이나 어른의 도움이 있을 수 있습니다.',
    love: '따뜻하고 모성적인 사랑이 오가는 날입니다. 가족과의 시간을 소중히 하세요.',
    career: '상사나 멘토의 인정을 받을 수 있습니다. 배움의 자세를 유지하세요.',
    health: '충분한 영양 섭취와 휴식이 건강의 비결입니다.',
    advice: '감사하는 마음으로 하루를 시작하세요.',
  },
};

// ══════════════════════════════════════════════
// 길시/흉시 계산
// ══════════════════════════════════════════════

const TIME_LABELS: string[] = [
  '자시(23-01)', '축시(01-03)', '인시(03-05)', '묘시(05-07)',
  '진시(07-09)', '사시(09-11)', '오시(11-13)', '미시(13-15)',
  '신시(15-17)', '유시(17-19)', '술시(19-21)', '해시(21-23)',
];

function getLuckyTime(dayBranch: EarthlyBranch, yongSin: FiveElementKo): string {
  // 용신 오행에 해당하는 시간대
  const elementToBranches: Record<FiveElementKo, number[]> = {
    '목': [2, 3],   // 인시, 묘시
    '화': [5, 6],   // 사시, 오시
    '토': [4, 7],   // 진시, 미시
    '금': [8, 9],   // 신시, 유시
    '수': [0, 11],  // 자시, 해시
  };
  const luckyIndices = elementToBranches[yongSin] || [6];
  return luckyIndices.map(i => TIME_LABELS[i]).join(', ');
}

function getCautionTime(dayBranch: EarthlyBranch, giSin: FiveElementKo): string {
  const elementToBranches: Record<FiveElementKo, number[]> = {
    '목': [2, 3],
    '화': [5, 6],
    '토': [4, 7],
    '금': [8, 9],
    '수': [0, 11],
  };
  const cautionIndices = elementToBranches[giSin] || [0];
  return cautionIndices.map(i => TIME_LABELS[i]).join(', ');
}

// ══════════════════════════════════════════════
// 영역별 점수 계산
// ══════════════════════════════════════════════

function calculateAreaScores(
  tenGod: string,
  fortuneElement: FiveElementKo,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
  interactions: Interaction[],
): { overall: number; wealth: number; love: number; career: number; health: number } {
  const summary = getInteractionSummary(interactions);

  // 기본 점수 (50점)
  let base = 50;

  // 합/충 영향
  base += summary.combines * 8;
  base -= summary.clashes * 12;
  base -= summary.punishments * 8;
  base -= summary.harms * 5;

  // 용신/기신
  if (fortuneElement === yongSin) base += 20;
  else if (fortuneElement === giSin) base -= 15;

  // 십성별 영역 가중치
  const weights: Record<string, { overall: number; wealth: number; love: number; career: number; health: number }> = {
    '비견':  { overall: 0, wealth: -5, love: -3, career: 5, health: 3 },
    '겁재':  { overall: -5, wealth: -10, love: -5, career: 0, health: -5 },
    '식신':  { overall: 8, wealth: 5, love: 8, career: 5, health: -3 },
    '상관':  { overall: -3, wealth: -5, love: -8, career: -5, health: -5 },
    '편재':  { overall: 8, wealth: 12, love: 8, career: 8, health: -3 },
    '정재':  { overall: 5, wealth: 10, love: 5, career: 5, health: 3 },
    '편관':  { overall: -3, wealth: -3, love: -5, career: 5, health: -5 },
    '정관':  { overall: 5, wealth: 3, love: 5, career: 10, health: 3 },
    '편인':  { overall: 3, wealth: -3, love: -3, career: 5, health: 3 },
    '정인':  { overall: 8, wealth: 3, love: 5, career: 8, health: 8 },
  };

  const w = weights[tenGod] || { overall: 0, wealth: 0, love: 0, career: 0, health: 0 };

  const clamp = (v: number) => Math.max(5, Math.min(95, v));

  return {
    overall: clamp(base + w.overall),
    wealth: clamp(base + w.wealth),
    love: clamp(base + w.love),
    career: clamp(base + w.career),
    health: clamp(base + w.health),
  };
}

// ══════════════════════════════════════════════
// 메인 함수
// ══════════════════════════════════════════════

/**
 * 오늘의 운세 분석
 */
export function analyzeDailyFortune(
  date: Date,
  fourPillars: FourPillars,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
): DailyFortune {
  const dayPillar = getDayPillar(date);
  const { year: yP, month: mP, day: dP, hour: hP } = fourPillars;

  // 십성 (일간 기준)
  const dayStemIdx = HEAVENLY_STEMS.indexOf(dP.heavenlyStem);
  const todayStemIdx = HEAVENLY_STEMS.indexOf(dayPillar.heavenlyStem);
  const tenGod = calculateTenGod(dayStemIdx, todayStemIdx);

  // 십이운성
  const twelveStage = getTwelveStageBong(dP.heavenlyStem, dayPillar.earthlyBranch);

  // 형충회합 (사주 원국 vs 오늘의 일진)
  const interactions = analyzeInteractionsWithLuck(
    yP.earthlyBranch, mP.earthlyBranch, dP.earthlyBranch, hP.earthlyBranch,
    dayPillar.heavenlyStem, dayPillar.earthlyBranch,
    dP.heavenlyStem,
  );

  // 영역별 점수
  const scores = calculateAreaScores(tenGod, dayPillar.elementKo, yongSin, giSin, interactions);

  // 십성별 해석
  const fortune = TEN_GOD_FORTUNE[tenGod] || TEN_GOD_FORTUNE['비견'];

  // 날짜 포맷
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    date: dateStr,
    stem: dayPillar.heavenlyStem,
    branch: dayPillar.earthlyBranch,
    stemKo: dayPillar.heavenlyStemKo,
    branchKo: dayPillar.earthlyBranchKo,
    element: dayPillar.element,
    elementKo: dayPillar.elementKo,
    animal: BRANCH_ANIMALS[dayPillar.earthlyBranch],
    tenGod,
    twelveStage,
    interactions,
    overallScore: scores.overall,
    scores,
    advice: fortune.advice,
    luckyTime: getLuckyTime(dayPillar.earthlyBranch, yongSin),
    cautionTime: getCautionTime(dayPillar.earthlyBranch, giSin),
    descriptions: {
      overall: fortune.overall,
      wealth: fortune.wealth,
      love: fortune.love,
      career: fortune.career,
      health: fortune.health,
    },
  };
}

/**
 * 주간 운세 (7일)
 */
export function analyzeWeeklyFortune(
  startDate: Date,
  fourPillars: FourPillars,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
): DailyFortune[] {
  const results: DailyFortune[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    results.push(analyzeDailyFortune(d, fourPillars, yongSin, giSin));
  }
  return results;
}
