// un7.kr 운세 API 클라이언트
// API 문서: https://www.un7.kr/doc/

const UN7_BASE_URL = 'https://api.un7.kr/api/v1';

function getApiKey(): string {
  return process.env.UN7_API_KEY || '943156c8f56a4c88fad1ba1379e3bf00';
}

// ============ 타입 정의 ============

export interface Un7FortuneItem {
  title: string;
  description: string;
  summary?: string;
  maleDescription?: string;
  femaleDescription?: string;
}

export interface Un7DailyFortune {
  [key: string]: Un7FortuneItem;
}

export interface Un7YearlyFortune {
  [key: string]: Un7FortuneItem;
}

export interface Un7LifetimeFortune {
  [key: string]: Un7FortuneItem;
}

export interface Un7ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 통합 운세 결과 (뷰용)
export interface Un7FortuneResult {
  daily?: { items: Un7FortuneItem[]; raw: Un7DailyFortune };
  yearly?: { items: Un7FortuneItem[]; raw: Un7YearlyFortune };
  lifetime?: { items: Un7FortuneItem[]; raw: Un7LifetimeFortune };
  error?: string;
}

// ============ API 호출 함수 ============

// 일간 운세 조회
export async function fetchDailyFortune(params: {
  targetYear: number; targetMonth: number; targetDay: number;
  birthYear: number; birthMonth: number; birthDay: number; birthHour: number;
  isLunar?: boolean;
}): Promise<Un7ApiResponse<Un7DailyFortune> | null> {
  try {
    const query = new URLSearchParams({
      targetYear: String(params.targetYear),
      targetMonth: String(params.targetMonth),
      targetDay: String(params.targetDay),
      birthYear: String(params.birthYear),
      birthMonth: String(params.birthMonth),
      birthDay: String(params.birthDay),
      birthHour: String(params.birthHour),
      isLunar: String(params.isLunar ?? false),
      'api-key': getApiKey(),
    });

    const res = await fetch(`${UN7_BASE_URL}/day?${query}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[un7.kr] 일간 운세 API 실패:', e);
    return null;
  }
}

// 연간 운세 조회
export async function fetchYearlyFortune(params: {
  targetYear: number;
  birthYear: number; birthMonth: number; birthDay: number; birthHour: number;
  isLunar?: boolean;
}): Promise<Un7ApiResponse<Un7YearlyFortune> | null> {
  try {
    const query = new URLSearchParams({
      targetYear: String(params.targetYear),
      birthYear: String(params.birthYear),
      birthMonth: String(params.birthMonth),
      birthDay: String(params.birthDay),
      birthHour: String(params.birthHour),
      isLunar: String(params.isLunar ?? false),
      'api-key': getApiKey(),
    });

    const res = await fetch(`${UN7_BASE_URL}/year?${query}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[un7.kr] 연간 운세 API 실패:', e);
    return null;
  }
}

// 평생 운세 조회
export async function fetchLifetimeFortune(params: {
  birthYear: number; birthMonth: number; birthDay: number; birthHour: number;
  isLunar?: boolean;
}): Promise<Un7ApiResponse<Un7LifetimeFortune> | null> {
  try {
    const query = new URLSearchParams({
      birthYear: String(params.birthYear),
      birthMonth: String(params.birthMonth),
      birthDay: String(params.birthDay),
      birthHour: String(params.birthHour),
      isLunar: String(params.isLunar ?? false),
      'api-key': getApiKey(),
    });

    const res = await fetch(`${UN7_BASE_URL}/life?${query}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[un7.kr] 평생 운세 API 실패:', e);
    return null;
  }
}

// ============ 통합 운세 조회 ============

// 전체 운세 한번에 조회 (일간 + 연간 + 평생)
export async function fetchAllFortunes(params: {
  birthYear: number; birthMonth: number; birthDay: number; birthHour: number;
  isLunar?: boolean;
  targetYear?: number; targetMonth?: number; targetDay?: number;
}): Promise<Un7FortuneResult> {
  const now = new Date();
  const targetYear = params.targetYear ?? now.getFullYear();
  const targetMonth = params.targetMonth ?? (now.getMonth() + 1);
  const targetDay = params.targetDay ?? now.getDate();

  const result: Un7FortuneResult = {};

  // 병렬로 3가지 운세 조회
  const [daily, yearly, lifetime] = await Promise.all([
    fetchDailyFortune({
      ...params,
      targetYear, targetMonth, targetDay,
    }),
    fetchYearlyFortune({
      ...params,
      targetYear,
    }),
    fetchLifetimeFortune(params),
  ]);

  if (daily?.data) {
    const items = Object.values(daily.data).filter(v => v && typeof v === 'object' && 'title' in v) as Un7FortuneItem[];
    result.daily = { items, raw: daily.data };
  }

  if (yearly?.data) {
    const items = Object.values(yearly.data).filter(v => v && typeof v === 'object' && 'title' in v) as Un7FortuneItem[];
    result.yearly = { items, raw: yearly.data };
  }

  if (lifetime?.data) {
    const items = Object.values(lifetime.data).filter(v => v && typeof v === 'object' && 'title' in v) as Un7FortuneItem[];
    result.lifetime = { items, raw: lifetime.data };
  }

  if (!daily && !yearly && !lifetime) {
    result.error = 'un7.kr API 연결 실패';
  }

  return result;
}
