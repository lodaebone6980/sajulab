// 운세 분석 엔진

import type { FourPillars, ElementDistribution, FortuneAnalysis, FiveElementKo } from './types';
import { HEAVENLY_STEMS, STEM_ELEMENT_KO, STEM_HANJA_TO_KO, ELEMENT_COLORS, ELEMENT_DIRECTIONS } from './constants';
import { calculateTenGod } from './calculator';

// 일간(일주 천간) 기반 성격 분석
const PERSONALITY_BY_DAY_STEM: Record<string, string> = {
  '갑': '갑목(甲木)의 기질을 가지고 있습니다. 큰 나무와 같이 곧고 정직하며, 리더십이 강합니다. 자존심이 높고 독립적이며, 새로운 일을 시작하는 개척자적 기질이 있습니다. 정의감이 강하고 책임감이 있으나, 때로는 고집이 세고 융통성이 부족할 수 있습니다.',
  '을': '을목(乙木)의 기질을 가지고 있습니다. 풀과 덩굴처럼 유연하고 적응력이 뛰어납니다. 부드럽고 인정이 많으며, 예술적 감각이 풍부합니다. 타인과의 관계에서 조화를 잘 이루지만, 결단력이 부족하고 의존적일 수 있습니다.',
  '병': '병화(丙火)의 기질을 가지고 있습니다. 태양처럼 밝고 활기차며, 열정적입니다. 사교적이고 낙관적이며, 주변을 밝게 하는 힘이 있습니다. 표현력이 좋고 인기가 많으나, 급하고 성급한 면이 있을 수 있습니다.',
  '정': '정화(丁火)의 기질을 가지고 있습니다. 촛불처럼 은은하고 따뜻한 성품을 지녔습니다. 섬세하고 감수성이 풍부하며, 내면의 열정이 깊습니다. 집중력이 좋고 학문적 능력이 뛰어나나, 소심하고 걱정이 많을 수 있습니다.',
  '무': '무토(戊土)의 기질을 가지고 있습니다. 큰 산처럼 믿음직하고 안정적입니다. 포용력이 크고 신용이 있으며, 중재자 역할을 잘합니다. 꾸준하고 성실하나, 변화를 싫어하고 보수적일 수 있습니다.',
  '기': '기토(己土)의 기질을 가지고 있습니다. 밭이나 정원처럼 풍요롭고 세심합니다. 계획적이고 분석력이 뛰어나며, 실용적입니다. 다재다능하고 적응력이 좋으나, 걱정이 많고 우유부단할 수 있습니다.',
  '경': '경금(庚金)의 기질을 가지고 있습니다. 칼이나 도끼처럼 날카롭고 결단력이 있습니다. 의리가 강하고 행동력이 뛰어나며, 정의를 중시합니다. 카리스마가 있고 추진력이 강하나, 무뚝뚝하고 과격할 수 있습니다.',
  '신': '신금(辛金)의 기질을 가지고 있습니다. 보석처럼 아름답고 섬세합니다. 미적 감각이 뛰어나고 완벽주의적이며, 자존심이 강합니다. 품위가 있고 세련되나, 예민하고 까다로울 수 있습니다.',
  '임': '임수(壬水)의 기질을 가지고 있습니다. 바다나 큰 강처럼 깊고 지혜롭습니다. 총명하고 박학다식하며, 포용력이 큽니다. 추진력과 행동력이 뛰어나나, 변덕스럽고 방황할 수 있습니다.',
  '계': '계수(癸水)의 기질을 가지고 있습니다. 비나 이슬처럼 조용하고 섬세합니다. 직관력이 뛰어나고 영적인 감수성이 있으며, 학문에 소질이 있습니다. 인내심이 강하고 깊은 사고를 하나, 내성적이고 은둔적일 수 있습니다.',
};

// 오행별 직업운
const CAREER_BY_ELEMENT: Record<FiveElementKo, string> = {
  '목': '교육, 문화, 예술, 출판, 의류, 가구, 인테리어, 환경, 농림업 분야에서 능력을 발휘할 수 있습니다. 성장과 발전을 추구하는 분야가 적합합니다.',
  '화': 'IT, 전자, 방송, 엔터테인먼트, 요식업, 화학, 에너지, 조명 분야에서 두각을 나타낼 수 있습니다. 빛과 열정이 필요한 분야가 적합합니다.',
  '토': '부동산, 건설, 농업, 식품, 중개, 컨설팅, 보험, 창고업 분야에서 안정적인 성과를 거둘 수 있습니다. 신뢰와 안정이 중요한 분야가 적합합니다.',
  '금': '금융, 법률, 군경, 기계, 자동차, 귀금속, 의료기기, 철강 분야에서 성공할 가능성이 높습니다. 정밀하고 체계적인 분야가 적합합니다.',
  '수': '무역, 유통, 물류, 수산업, 관광, 서비스업, 연구, 철학 분야에서 능력을 발휘할 수 있습니다. 유연하고 변화가 많은 분야가 적합합니다.',
};

// 오행별 재물운
const WEALTH_BY_ELEMENT: Record<FiveElementKo, string> = {
  '목': '꾸준한 성장을 통해 재물을 모읍니다. 초반에는 어려울 수 있으나, 시간이 지날수록 재물이 늘어나는 형태입니다. 투자보다는 저축과 사업 확장에 초점을 맞추면 좋습니다.',
  '화': '화려하고 빠른 재물 운이 있습니다. 한번에 큰 돈이 들어올 수 있으나, 지출도 빠릅니다. 재물의 흐름이 역동적이므로 재테크에 관심을 기울여야 합니다.',
  '토': '안정적이고 꾸준한 재물 운입니다. 부동산이나 실물 자산에 인연이 있습니다. 급격한 변화보다는 장기적이고 안정적인 투자가 유리합니다.',
  '금': '정확하고 체계적인 재물 관리 능력이 있습니다. 금융 상품이나 귀금속과 인연이 있습니다. 분석적인 접근으로 투자하면 좋은 결과를 얻을 수 있습니다.',
  '수': '유동적인 재물 운으로, 돈의 흐름이 활발합니다. 무역이나 유통 관련 분야에서 재물이 들어옵니다. 여러 곳에 분산 투자하는 것이 유리합니다.',
};

// 오행별 건강운
const HEALTH_BY_ELEMENT: Record<FiveElementKo, string> = {
  '목': '간, 담, 눈, 근육, 손발 관련 건강에 유의해야 합니다. 스트레스 관리와 충분한 수면이 중요하며, 숲이나 공원에서 산책하면 건강에 도움이 됩니다.',
  '화': '심장, 소장, 혀, 혈액순환 관련 건강에 신경 써야 합니다. 과로와 흥분을 피하고, 명상이나 요가 등 심신 안정에 도움되는 활동을 추천합니다.',
  '토': '위장, 비장, 입, 소화기관 관련 건강에 주의해야 합니다. 규칙적인 식사와 소화에 좋은 음식을 섭취하는 것이 중요합니다.',
  '금': '폐, 대장, 코, 피부, 호흡기 관련 건강에 유의해야 합니다. 맑은 공기에서 호흡 운동을 하고, 피부 관리에 신경 쓰면 좋습니다.',
  '수': '신장, 방광, 귀, 뼈, 생식기 관련 건강에 주의해야 합니다. 수분 섭취를 충분히 하고, 하체 운동을 통해 건강을 관리하면 좋습니다.',
};

// 오행별 애정운
const LOVE_BY_ELEMENT: Record<FiveElementKo, string> = {
  '목': '성장을 함께할 수 있는 파트너에게 끌립니다. 서로의 발전을 응원하는 관계를 추구하며, 자유롭고 독립적인 연애를 선호합니다. 봄철에 좋은 인연이 찾아올 수 있습니다.',
  '화': '열정적이고 드라마틱한 사랑을 합니다. 감정 표현이 풍부하고 로맨틱한 연애를 즐기지만, 식으면 빠르게 식을 수 있습니다. 여름철에 좋은 인연이 찾아올 수 있습니다.',
  '토': '신뢰와 안정감을 바탕으로 한 사랑을 합니다. 오래 사귀고 결혼으로 이어지는 인연이 많으며, 가정적인 파트너를 만날 수 있습니다. 환절기에 좋은 인연이 찾아올 수 있습니다.',
  '금': '품격 있고 세련된 사랑을 추구합니다. 상대방에 대한 기준이 높지만, 한번 마음을 주면 변하지 않습니다. 가을철에 좋은 인연이 찾아올 수 있습니다.',
  '수': '깊고 지적인 교감을 나누는 사랑을 합니다. 정신적 유대감을 중시하며, 서로의 내면을 이해하는 관계를 추구합니다. 겨울철에 좋은 인연이 찾아올 수 있습니다.',
};

// 총운 분석
function analyzeOverall(dist: ElementDistribution, yongSin: FiveElementKo, giSin: FiveElementKo): string {
  const total = dist.wood + dist.fire + dist.earth + dist.metal + dist.water;
  const elements = [
    { name: '목(木)', value: dist.wood },
    { name: '화(火)', value: dist.fire },
    { name: '토(土)', value: dist.earth },
    { name: '금(金)', value: dist.metal },
    { name: '수(水)', value: dist.water },
  ];

  const sorted = [...elements].sort((a, b) => b.value - a.value);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  let overall = '';

  if (weakest.value === 0) {
    overall += `오행 중 ${weakest.name}이(가) 없어 보완이 필요합니다. `;
  }

  const balance = Math.max(...elements.map(e => e.value)) - Math.min(...elements.map(e => e.value));

  if (balance <= 1) {
    overall += '오행이 고르게 분포되어 있어 전반적으로 균형 잡힌 사주입니다. 큰 기복 없이 안정적인 삶을 살 수 있습니다. ';
  } else if (balance <= 3) {
    overall += `${strongest.name}의 기운이 강한 사주입니다. 해당 기운의 장점을 살리되, 부족한 ${weakest.name}을(를) 보완하면 더 좋은 결과를 얻을 수 있습니다. `;
  } else {
    overall += `${strongest.name}의 기운이 매우 강하고 ${weakest.name}이(가) 부족한 편향된 사주입니다. 용신인 ${yongSin}의 기운을 적극적으로 보충해야 합니다. `;
  }

  overall += `\n\n용신(用神)은 '${yongSin}'이며, 이 오행의 기운을 보충하면 운이 좋아집니다. 기신(忌神)인 '${giSin}'의 기운은 피하는 것이 좋습니다.`;

  return overall;
}

// 럭키 넘버 계산
function calculateLuckyNumber(dayStemElement: FiveElementKo): number {
  const luckyNumbers: Record<FiveElementKo, number> = {
    '목': 3, '화': 7, '토': 5, '금': 9, '수': 1,
  };
  return luckyNumbers[dayStemElement];
}

// 종합 운세 분석
export function analyzeFortuneComplete(
  fourPillars: FourPillars,
  elementDistribution: ElementDistribution,
  yongSin: FiveElementKo,
  giSin: FiveElementKo,
): FortuneAnalysis {
  const dayStemKo = fourPillars.day.heavenlyStemKo;
  const dayStemElement = STEM_ELEMENT_KO[dayStemKo];

  return {
    personality: PERSONALITY_BY_DAY_STEM[dayStemKo] || '분석 데이터가 없습니다.',
    career: CAREER_BY_ELEMENT[yongSin] || CAREER_BY_ELEMENT[dayStemElement],
    wealth: WEALTH_BY_ELEMENT[dayStemElement],
    health: HEALTH_BY_ELEMENT[dayStemElement],
    love: LOVE_BY_ELEMENT[dayStemElement],
    overall: analyzeOverall(elementDistribution, yongSin, giSin),
    luckyColor: ELEMENT_COLORS[yongSin],
    luckyNumber: calculateLuckyNumber(dayStemElement),
    luckyDirection: ELEMENT_DIRECTIONS[yongSin],
  };
}
