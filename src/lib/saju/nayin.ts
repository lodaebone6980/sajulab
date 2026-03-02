// 납음오행 (納音五行) - Nayin Five Elements
// 60갑자(六十甲子)를 30쌍으로 묶어 각 쌍에 고유한 오행 속성을 부여
// 천간·지지의 단순 오행과 다른, 소리(音)의 조화에서 파생된 오행 체계

import type { HeavenlyStem, EarthlyBranch, FiveElement } from './types';

/** getAllNayin 반환 타입 */
export interface NayinResult {
  year: { name: NayinName; element: FiveElement };
  month: { name: NayinName; element: FiveElement };
  day: { name: NayinName; element: FiveElement };
  hour: { name: NayinName; element: FiveElement };
}

// 납음 30종 이름
export const NAYIN_NAMES = [
  '해중금', '노중화', '대림목', '노방토', '검봉금', '산두화',
  '간하수', '성두토', '백랍금', '양류목', '천중수', '옥상토',
  '벽력화', '송백목', '장류수', '사중금', '산하화', '평지목',
  '벽상토', '금박금', '복등화', '천하수', '대역토', '채천금',
  '상자목', '대계수', '사중토', '천상화', '석류목', '대해수',
] as const;

export type NayinName = typeof NAYIN_NAMES[number];

// 납음별 오행 분류
export const NAYIN_ELEMENT: Record<NayinName, FiveElement> = {
  '해중금': '金', '검봉금': '金', '백랍금': '金', '사중금': '金', '금박금': '金', '채천금': '金',
  '노중화': '火', '산두화': '火', '벽력화': '火', '산하화': '火', '복등화': '火', '천상화': '火',
  '대림목': '木', '양류목': '木', '송백목': '木', '평지목': '木', '상자목': '木', '석류목': '木',
  '노방토': '土', '성두토': '土', '옥상토': '土', '벽상토': '土', '대역토': '土', '사중토': '土',
  '간하수': '水', '천중수': '水', '장류수': '水', '대계수': '水', '천하수': '水', '대해수': '水',
};

// 납음별 의미 설명
export const NAYIN_MEANINGS: Record<NayinName, string> = {
  '해중금': '바다 속의 금. 아직 드러나지 않은 잠재된 재능과 가능성',
  '노중화': '화로 속의 불. 내면에 강한 열정과 에너지를 품고 있음',
  '대림목': '큰 숲의 나무. 넓은 포용력과 꾸준한 성장력',
  '노방토': '길가의 흙. 어디서나 적응하는 유연함과 실용성',
  '검봉금': '칼날의 금속. 날카로운 판단력과 결단력',
  '산두화': '산꼭대기의 불. 높은 이상과 뚜렷한 목표의식',
  '간하수': '골짜기 아래의 물. 깊은 내면과 조용한 지혜',
  '성두토': '성벽의 흙. 견고한 의지와 방어적 성향',
  '백랍금': '밀랍처럼 부드러운 금. 세련된 감성과 유연한 처세',
  '양류목': '버드나무. 유연하고 부드러운 성격, 예술적 감성',
  '천중수': '샘 속의 물. 순수한 마음과 맑은 영감',
  '옥상토': '지붕 위의 흙. 높은 곳에서 내려다보는 통찰력',
  '벽력화': '번개 불. 순간적인 폭발력과 창의적 영감',
  '송백목': '소나무와 잣나무. 굳건한 절개와 변치 않는 신념',
  '장류수': '멀리 흐르는 물. 끊임없는 노력과 지속적 발전',
  '사중금': '모래 속의 금. 인내와 노력 끝에 얻는 성과',
  '산하화': '산 아래의 불. 온화하면서도 꺼지지 않는 열정',
  '평지목': '평지의 나무. 안정적이고 평화로운 성향',
  '벽상토': '벽 위의 흙. 겉으로 드러나는 안정감과 신뢰',
  '금박금': '금박. 화려한 외면과 섬세한 감성',
  '복등화': '등불. 주변을 밝히는 따뜻함과 배려심',
  '천하수': '은하수. 광대한 꿈과 이상주의적 성향',
  '대역토': '역참의 흙. 소통과 연결의 능력, 중개 역할',
  '채천금': '비녀 금. 우아함과 장식적 아름다움',
  '상자목': '뽕나무. 실용적이고 생산적인 능력',
  '대계수': '큰 시냇물. 활발한 활동력과 유통의 재능',
  '사중토': '모래 속의 흙. 겸손하면서도 단단한 내면',
  '천상화': '하늘의 불. 빛나는 존재감과 리더십',
  '석류목': '석류나무. 화려함 속의 풍요와 다산',
  '대해수': '큰 바다의 물. 무한한 포용력과 깊은 지혜',
};

// 60갑자 납음 테이블
// key: "천간지지" (예: "甲子"), value: 납음 이름
// 2개씩 쌍으로 같은 납음을 공유
const NAYIN_TABLE: Record<string, NayinName> = {
  // 1~6번: 갑자 ~ 계사
  '甲子': '해중금', '乙丑': '해중금',
  '丙寅': '노중화', '丁卯': '노중화',
  '戊辰': '대림목', '己巳': '대림목',
  '庚午': '노방토', '辛未': '노방토',
  '壬申': '검봉금', '癸酉': '검봉금',
  '甲戌': '산두화', '乙亥': '산두화',
  // 7~12번: 병자 ~ 신사
  '丙子': '간하수', '丁丑': '간하수',
  '戊寅': '성두토', '己卯': '성두토',
  '庚辰': '백랍금', '辛巳': '백랍금',
  '壬午': '양류목', '癸未': '양류목',
  '甲申': '천중수', '乙酉': '천중수',
  '丙戌': '옥상토', '丁亥': '옥상토',
  // 13~18번: 무자 ~ 계사
  '戊子': '벽력화', '己丑': '벽력화',
  '庚寅': '송백목', '辛卯': '송백목',
  '壬辰': '장류수', '癸巳': '장류수',
  '甲午': '사중금', '乙未': '사중금',
  '丙申': '산하화', '丁酉': '산하화',
  '戊戌': '평지목', '己亥': '평지목',
  // 19~24번: 경자 ~ 을사
  '庚子': '벽상토', '辛丑': '벽상토',
  '壬寅': '금박금', '癸卯': '금박금',
  '甲辰': '복등화', '乙巳': '복등화',
  '丙午': '천하수', '丁未': '천하수',
  '戊申': '대역토', '己酉': '대역토',
  '庚戌': '채천금', '辛亥': '채천금',
  // 25~30번: 임자 ~ 계해
  '壬子': '상자목', '癸丑': '상자목',
  '甲寅': '대계수', '乙卯': '대계수',
  '丙辰': '사중토', '丁巳': '사중토',
  '戊午': '천상화', '己未': '천상화',
  '庚申': '석류목', '辛酉': '석류목',
  '壬戌': '대해수', '癸亥': '대해수',
};

/**
 * 납음오행 조회
 * @param stem 천간 (한자)
 * @param branch 지지 (한자)
 * @returns 납음 이름과 오행
 */
export function getNayin(
  stem: HeavenlyStem,
  branch: EarthlyBranch,
): { name: NayinName; element: FiveElement } {
  const key = `${stem}${branch}`;
  const name = NAYIN_TABLE[key];
  if (!name) {
    throw new Error(`Invalid stem-branch combination: ${key}`);
  }
  return { name, element: NAYIN_ELEMENT[name] };
}

/**
 * 사주 4기둥의 납음오행 일괄 조회
 */
export function getAllNayin(
  yearStem: HeavenlyStem, yearBranch: EarthlyBranch,
  monthStem: HeavenlyStem, monthBranch: EarthlyBranch,
  dayStem: HeavenlyStem, dayBranch: EarthlyBranch,
  hourStem: HeavenlyStem, hourBranch: EarthlyBranch,
): NayinResult {
  return {
    year: getNayin(yearStem, yearBranch),
    month: getNayin(monthStem, monthBranch),
    day: getNayin(dayStem, dayBranch),
    hour: getNayin(hourStem, hourBranch),
  };
}

/**
 * 납음 이름으로 의미 조회
 */
export function getNayinMeaning(name: NayinName): string {
  return NAYIN_MEANINGS[name];
}
