// 사주팔자 관련 타입 정의

// 천간 (10 Heavenly Stems)
export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type HeavenlyStemKo = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';

// 지지 (12 Earthly Branches)
export type EarthlyBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
export type EarthlyBranchKo = '자' | '축' | '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해';

// 오행 (Five Elements)
export type FiveElement = '木' | '火' | '土' | '金' | '水';
export type FiveElementKo = '목' | '화' | '토' | '금' | '수';

// 음양
export type YinYang = '陽' | '陰';
export type YinYangKo = '양' | '음';

// 십성 (Ten Gods)
export type TenGod = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';

// 주 (Pillar)
export interface Pillar {
  heavenlyStem: HeavenlyStem;
  earthlyBranch: EarthlyBranch;
  heavenlyStemKo: HeavenlyStemKo;
  earthlyBranchKo: EarthlyBranchKo;
  element: FiveElement;
  elementKo: FiveElementKo;
  yinYang: YinYang;
  yinYangKo: YinYangKo;
}

// 사주 (Four Pillars)
export interface FourPillars {
  year: Pillar;   // 년주
  month: Pillar;  // 월주
  day: Pillar;    // 일주
  hour: Pillar;   // 시주
}

// 오행 분포
export interface ElementDistribution {
  wood: number;   // 목
  fire: number;   // 화
  earth: number;  // 토
  metal: number;  // 금
  water: number;  // 수
}

// 운세 분석 결과
export interface FortuneAnalysis {
  personality: string;
  career: string;
  wealth: string;
  health: string;
  love: string;
  overall: string;
  luckyColor: string;
  luckyNumber: number;
  luckyDirection: string;
}

// 궁합 결과
export interface CompatibilityResult {
  score: number;
  description: string;
  strengths: string[];
  weaknesses: string[];
}

// 대운 정보
export interface DaeUn {
  age: number;
  startYear: number;
  endYear: number;
  heavenlyStem: HeavenlyStemKo;
  earthlyBranch: EarthlyBranchKo;
  element: FiveElementKo;
  description: string;
}

// 입력 정보
export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
  gender: 'male' | 'female';
}

// 외부 운세 API 데이터 (un7.kr 등)
export interface ExternalFortuneData {
  daily?: { items: { title: string; description: string }[]; };
  yearly?: { items: { title: string; description: string }[]; };
  lifetime?: { items: { title: string; description: string; summary?: string; maleDescription?: string; femaleDescription?: string }[]; };
  source?: string;
  error?: string;
}

// 전체 사주 분석 결과
export interface SajuResult {
  birthInfo: BirthInfo;
  fourPillars: FourPillars;
  elementDistribution: ElementDistribution;
  tenGods: {
    year: TenGod;
    month: TenGod;
    hour: TenGod;
    yearBranch?: TenGod;
    monthBranch?: TenGod;
    dayBranch?: TenGod;
    hourBranch?: TenGod;
  };
  fortune: FortuneAnalysis;
  daeUn: DaeUn[];
  yongSin: FiveElementKo;  // 용신 (favorable element)
  giSin: FiveElementKo;    // 기신 (unfavorable element)
  externalFortune?: ExternalFortuneData;  // 외부 운세 API 데이터
  calculationSource?: 'manseryeok-kasi' | 'builtin';  // 계산 엔진 출처

  // ── 확장 분석 결과 (선택적) ──
  /** 강약 판정 */
  strength?: import('./strength').StrengthResult;
  /** 용신 5체계 (용신·희신·기신·구신·한신) */
  yongShinSystem?: import('./yongshin').YongShinSystem;
  /** 십이운성 (봉법·거법) */
  twelveStages?: import('./twelve-stages').TwelveStagesResult;
  /** 지장간 */
  hiddenStems?: import('./hidden-stems').HiddenStemsResult;
  /** 납음오행 */
  nayin?: import('./nayin').NayinResult;
  /** 신살 */
  sinsal?: import('./sinsal').SinsalResult;
  /** 형충회합 */
  interactions?: import('./interactions').Interaction[];
  /** 올해 세운 */
  yearFortune?: import('./fortune-period').YearFortune;
  /** 이달 월운 (12개월) */
  monthFortunes?: import('./fortune-period').MonthFortune[];
}
