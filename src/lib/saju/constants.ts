// 사주팔자 상수 데이터

import type { HeavenlyStem, HeavenlyStemKo, EarthlyBranch, EarthlyBranchKo, FiveElement, FiveElementKo, YinYang, YinYangKo } from './types';

// 천간 (10 Heavenly Stems)
export const HEAVENLY_STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const HEAVENLY_STEMS_KO: HeavenlyStemKo[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

// 지지 (12 Earthly Branches)
export const EARTHLY_BRANCHES: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const EARTHLY_BRANCHES_KO: EarthlyBranchKo[] = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

// 지지 동물 (12 Animals)
export const EARTHLY_BRANCH_ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

// 천간 오행 매핑
export const STEM_ELEMENT: Record<HeavenlyStem, FiveElement> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

export const STEM_ELEMENT_KO: Record<HeavenlyStemKo, FiveElementKo> = {
  '갑': '목', '을': '목',
  '병': '화', '정': '화',
  '무': '토', '기': '토',
  '경': '금', '신': '금',
  '임': '수', '계': '수',
};

// 지지 오행 매핑
export const BRANCH_ELEMENT: Record<EarthlyBranch, FiveElement> = {
  '寅': '木', '卯': '木',
  '巳': '火', '午': '火',
  '辰': '土', '未': '土', '戌': '土', '丑': '土',
  '申': '金', '酉': '金',
  '子': '水', '亥': '水',
};

export const BRANCH_ELEMENT_KO: Record<EarthlyBranchKo, FiveElementKo> = {
  '인': '목', '묘': '목',
  '사': '화', '오': '화',
  '진': '토', '미': '토', '술': '토', '축': '토',
  '신': '금', '유': '금',
  '자': '수', '해': '수',
};

// 천간 음양 매핑
export const STEM_YINYANG: Record<HeavenlyStem, YinYang> = {
  '甲': '陽', '乙': '陰',
  '丙': '陽', '丁': '陰',
  '戊': '陽', '己': '陰',
  '庚': '陽', '辛': '陰',
  '壬': '陽', '癸': '陰',
};

export const STEM_YINYANG_KO: Record<HeavenlyStemKo, YinYangKo> = {
  '갑': '양', '을': '음',
  '병': '양', '정': '음',
  '무': '양', '기': '음',
  '경': '양', '신': '음',
  '임': '양', '계': '음',
};

// 지지 음양 매핑
export const BRANCH_YINYANG: Record<EarthlyBranch, YinYang> = {
  '子': '陽', '丑': '陰',
  '寅': '陽', '卯': '陰',
  '辰': '陽', '巳': '陰',
  '午': '陽', '未': '陰',
  '申': '陽', '酉': '陰',
  '戌': '陽', '亥': '陰',
};

// 오행 상생 관계 (생하는 방향)
export const ELEMENT_GENERATING: Record<FiveElement, FiveElement> = {
  '木': '火', // 목생화
  '火': '土', // 화생토
  '土': '金', // 토생금
  '金': '水', // 금생수
  '水': '木', // 수생목
};

// 오행 상극 관계 (극하는 방향)
export const ELEMENT_OVERCOMING: Record<FiveElement, FiveElement> = {
  '木': '土', // 목극토
  '土': '水', // 토극수
  '水': '火', // 수극화
  '火': '金', // 화극금
  '金': '木', // 금극목
};

// 월건 표 (월주 천간 결정) - 년간에 따른 1월(인월) 천간
export const MONTH_STEM_TABLE: Record<number, number> = {
  0: 2,  // 甲/己 년 → 丙寅월 시작
  1: 2,
  2: 4,  // 丙/辛 년 → 戊寅월 시작
  3: 4,
  4: 6,  // 戊/癸 년 → 庚寅월 시작
  5: 6,
  6: 8,  // 庚/乙 년 → 壬寅월 시작
  7: 8,
  8: 0,  // 壬/丁 년 → 甲寅월 시작
  9: 0,
};

// 년간에 따른 인월(1월) 천간 인덱스
export const YEAR_STEM_TO_MONTH_START: number[] = [
  2, // 갑(0) → 병(2)
  4, // 을(1) → 무(4)  -- 실제: 갑기 → 병, 을경 → 무
  6, // 병(2) → 경(6)  -- 병신 → 경
  8, // 정(3) → 임(8)  -- 정임 → 임
  0, // 무(4) → 갑(0)  -- 무계 → 갑
  2, // 기(5) → 병(2)  -- 갑기 → 병
  4, // 경(6) → 무(4)  -- 을경 → 무
  6, // 신(7) → 경(6)  -- 병신 → 경
  8, // 임(8) → 임(8)  -- 정임 → 임
  0, // 계(9) → 갑(0)  -- 무계 → 갑
];

// 시두법 (시주 천간 결정) - 일간에 따른 자시(子時) 천간
export const DAY_STEM_TO_HOUR_START: number[] = [
  0, // 갑(0)/기(5) → 갑자시
  2, // 을(1)/경(6) → 병자시
  4, // 병(2)/신(7) → 무자시
  6, // 정(3)/임(8) → 경자시
  8, // 무(4)/계(9) → 임자시
  0, // 기(5) → 갑자시
  2, // 경(6) → 병자시
  4, // 신(7) → 무자시
  6, // 임(8) → 경자시
  8, // 계(9) → 임자시
];

// 24절기 데이터 (양력 기준 대략적 날짜)
// 월주 결정에 사용 - 절입일 기준
export const SOLAR_TERMS = [
  { name: '소한', month: 1, day: 6 },   // 1월 절기
  { name: '입춘', month: 2, day: 4 },   // 2월 절기 (인월 시작)
  { name: '경칩', month: 3, day: 6 },   // 3월 절기
  { name: '청명', month: 4, day: 5 },   // 4월 절기
  { name: '입하', month: 5, day: 6 },   // 5월 절기
  { name: '망종', month: 6, day: 6 },   // 6월 절기
  { name: '소서', month: 7, day: 7 },   // 7월 절기
  { name: '입추', month: 8, day: 7 },   // 8월 절기
  { name: '백로', month: 9, day: 8 },   // 9월 절기
  { name: '한로', month: 10, day: 8 },  // 10월 절기
  { name: '입동', month: 11, day: 7 },  // 11월 절기
  { name: '대설', month: 12, day: 7 },  // 12월 절기
];

// 천간 한자 ↔ 한글 매핑
export const STEM_HANJA_TO_KO: Record<HeavenlyStem, HeavenlyStemKo> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
};

export const STEM_KO_TO_HANJA: Record<HeavenlyStemKo, HeavenlyStem> = {
  '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
  '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸',
};

// 지지 한자 ↔ 한글 매핑
export const BRANCH_HANJA_TO_KO: Record<EarthlyBranch, EarthlyBranchKo> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해',
};

export const BRANCH_KO_TO_HANJA: Record<EarthlyBranchKo, EarthlyBranch> = {
  '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
  '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥',
};

// 오행 색상 매핑
export const ELEMENT_COLORS: Record<FiveElementKo, string> = {
  '목': '#22c55e', // green
  '화': '#ef4444', // red
  '토': '#eab308', // yellow
  '금': '#ffffff', // white
  '수': '#3b82f6', // blue
};

// 오행 방향 매핑
export const ELEMENT_DIRECTIONS: Record<FiveElementKo, string> = {
  '목': '동쪽',
  '화': '남쪽',
  '토': '중앙',
  '금': '서쪽',
  '수': '북쪽',
};
