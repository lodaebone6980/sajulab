// SajuResult + Narrative → 완성 HTML 렌더링
// Puppeteer가 이 HTML을 PDF로 변환

import type { SajuResult } from '@/lib/saju/types';
import type { NarrativeResult } from '@/lib/ai';
import { SHARED_CSS, getElementClass, getElementBgClass, getElementColor } from './shared-styles';

interface RenderOptions {
  customerName: string;
  productName: string;
  productCode: string;
  narrative?: NarrativeResult | null;
}

const PRODUCT_TITLES: Record<string, { title: string; subtitle: string; symbol: string }> = {
  'saju-basic': { title: '사주팔자 운명 분석서', subtitle: 'FOUR PILLARS DESTINY ANALYSIS', symbol: '☰' },
  'saju-premium': { title: '프리미엄 사주 분석서', subtitle: 'PREMIUM SAJU ANALYSIS REPORT', symbol: '☯' },
  'saju-newyear': { title: `${new Date().getFullYear()} 신년운세`, subtitle: 'NEW YEAR FORTUNE REPORT', symbol: '✧' },
};

// ──────────────────────────────────────────────
// 메인 렌더 함수
// ──────────────────────────────────────────────

export function renderSajuHtml(result: SajuResult, options: RenderOptions): string {
  const product = PRODUCT_TITLES[options.productCode] || PRODUCT_TITLES['saju-basic'];
  const chapters = options.narrative?.chapters || [];
  const greeting = options.narrative?.greeting || getDefaultGreeting(options.customerName);

  const pages: string[] = [];

  // 1. 표지
  pages.push(renderCoverPage(product, options.customerName, result));

  // 2. 인사말
  pages.push(renderGreetingPage(greeting));

  // 3. 목차
  if (chapters.length > 0) {
    pages.push(renderTocPage(chapters));
  }

  // 4. 사주원국표 + 오행 차트
  pages.push(renderPillarPage(result));

  // 5. 챕터들
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    pages.push(renderChapterPage(i + 1, ch.title, ch.content));
  }

  // 챕터가 없으면 (폴백) 기본 분석 표시
  if (chapters.length === 0) {
    pages.push(renderFallbackAnalysis(result, options));
  }

  // 6. 대운 페이지
  if (result.daeUn?.length) {
    pages.push(renderDaeunPage(result));
  }

  // 7. 월운 페이지
  if (result.monthFortunes?.length) {
    pages.push(renderMonthFortunePage(result));
  }

  // 8. 아웃트로
  pages.push(renderOutroPage(options.customerName));

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>${SHARED_CSS}</style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`;
}

// ──────────────────────────────────────────────
// 개별 페이지 렌더러
// ──────────────────────────────────────────────

function renderCoverPage(product: { title: string; subtitle: string; symbol: string }, name: string, result: SajuResult): string {
  const bi = result.birthInfo;
  const dateStr = `${bi.year}년 ${bi.month}월 ${bi.day}일`;
  const genderStr = bi.gender === 'male' ? '남' : '여';

  return `
  <div class="page cover-page">
    <div class="cover-deco-top"></div>
    <div class="cover-deco-bottom"></div>
    <div class="cover-symbol">${product.symbol}</div>
    <div class="cover-title">${product.title}</div>
    <div class="cover-subtitle">${product.subtitle}</div>
    <div style="width:60px;height:1px;background:rgba(255,255,255,0.3);margin:0 auto 50px;"></div>
    <div class="cover-customer">${name} 님</div>
    <div class="cover-info">${dateStr} (${genderStr})</div>
    <div class="cover-brand">SAJULAB</div>
  </div>`;
}

function renderGreetingPage(greeting: string): string {
  const paragraphs = greeting.split('\n').filter(l => l.trim()).map(l => `<p>${l.trim()}</p>`).join('');
  return `
  <div class="page greeting-page">
    <div class="greeting-text">${paragraphs}</div>
    <div class="greeting-signature">— 사주연구소 —</div>
  </div>`;
}

function renderTocPage(chapters: { title: string; content: string }[]): string {
  const items = chapters.map((ch, i) => `
    <div class="toc-item">
      <div style="display:flex;align-items:center;">
        <span class="toc-number">${i + 1}</span>
        <span class="toc-title">${ch.title}</span>
      </div>
    </div>
  `).join('');

  return `
  <div class="page toc-page">
    <h2>목 차</h2>
    ${items}
  </div>`;
}

function renderPillarPage(result: SajuResult): string {
  const fp = result.fourPillars;
  const pillars = [
    { label: '시주 (時柱)', pillar: fp.hour },
    { label: '일주 (日柱)', pillar: fp.day },
    { label: '월주 (月柱)', pillar: fp.month },
    { label: '년주 (年柱)', pillar: fp.year },
  ];

  const headerCells = pillars.map(p => `<th>${p.label}</th>`).join('');
  const stemCells = pillars.map(p => `<td class="${getElementBgClass(p.pillar.elementKo)}"><span class="${getElementClass(p.pillar.elementKo)}">${p.pillar.heavenlyStemKo}</span></td>`).join('');
  const branchCells = pillars.map(p => `<td class="${getElementBgClass(p.pillar.elementKo)}"><span class="${getElementClass(p.pillar.elementKo)}">${p.pillar.earthlyBranchKo}</span></td>`).join('');
  const tenGodCells = [
    `<td>${result.tenGods.hour}</td>`,
    `<td style="font-weight:900;">일간</td>`,
    `<td>${result.tenGods.month}</td>`,
    `<td>${result.tenGods.year}</td>`,
  ].join('');

  // 오행 분포 바 차트
  const dist = result.elementDistribution;
  const maxVal = Math.max(dist.wood, dist.fire, dist.earth, dist.metal, dist.water, 1);
  const elements = [
    { name: '목(木)', val: dist.wood, color: '#16a34a' },
    { name: '화(火)', val: dist.fire, color: '#dc2626' },
    { name: '토(土)', val: dist.earth, color: '#d97706' },
    { name: '금(金)', val: dist.metal, color: '#6b7280' },
    { name: '수(水)', val: dist.water, color: '#2563eb' },
  ];
  const bars = elements.map(e => {
    const height = Math.max((e.val / maxVal) * 120, 8);
    return `
      <div class="element-bar-wrap">
        <div class="element-bar-value">${e.val}</div>
        <div class="element-bar" style="height:${height}px;background:${e.color};"></div>
        <div class="element-bar-label" style="color:${e.color};">${e.name}</div>
      </div>`;
  }).join('');

  // 신살 태그
  let sinsalHtml = '';
  if (result.sinsal?.length) {
    const tags = result.sinsal.map(s =>
      `<span class="sinsal-tag tag-${s.category}">${s.name}</span>`
    ).join('');
    sinsalHtml = `
      <h3 style="font-size:16px;font-weight:700;margin:30px 0 12px;">신살 (神殺)</h3>
      <div class="sinsal-tags">${tags}</div>`;
  }

  // 용신 정보
  let yongsinHtml = '';
  if (result.yongShinSystem) {
    const sys = result.yongShinSystem;
    yongsinHtml = `
      <h3 style="font-size:16px;font-weight:700;margin:30px 0 12px;">용신 체계</h3>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
        <div style="text-align:center;padding:12px;border-radius:8px;background:#fef3c7;"><div style="font-size:10px;color:#92400e;">용신</div><div style="font-size:20px;font-weight:900;color:${getElementColor(sys.yongSin)};">${sys.yongSin}</div></div>
        <div style="text-align:center;padding:12px;border-radius:8px;background:#d1fae5;"><div style="font-size:10px;color:#065f46;">희신</div><div style="font-size:20px;font-weight:900;color:${getElementColor(sys.huiSin)};">${sys.huiSin}</div></div>
        <div style="text-align:center;padding:12px;border-radius:8px;background:#fee2e2;"><div style="font-size:10px;color:#991b1b;">기신</div><div style="font-size:20px;font-weight:900;color:${getElementColor(sys.giSin)};">${sys.giSin}</div></div>
        <div style="text-align:center;padding:12px;border-radius:8px;background:#fce7f3;"><div style="font-size:10px;color:#831843;">구신</div><div style="font-size:20px;font-weight:900;color:${getElementColor(sys.guSin)};">${sys.guSin}</div></div>
        <div style="text-align:center;padding:12px;border-radius:8px;background:#f3f4f6;"><div style="font-size:10px;color:#374151;">한신</div><div style="font-size:20px;font-weight:900;color:${getElementColor(sys.hanSin)};">${sys.hanSin}</div></div>
      </div>`;
  }

  return `
  <div class="page">
    <h2 style="font-size:22px;font-weight:900;text-align:center;margin-bottom:24px;">사주원국표 (四柱原局表)</h2>
    <table class="pillar-table">
      <tr>${headerCells}</tr>
      <tr class="stem-row">${stemCells}</tr>
      <tr class="branch-row">${branchCells}</tr>
      <tr>${tenGodCells}</tr>
    </table>

    <h3 style="font-size:16px;font-weight:700;margin:30px 0 12px;">음양오행 분포</h3>
    <div class="element-chart">${bars}</div>

    ${yongsinHtml}
    ${sinsalHtml}
  </div>`;
}

function renderChapterPage(num: number, title: string, content: string): string {
  // content를 문단으로 분리
  const paragraphs = content.split('\n').filter(l => l.trim());
  let bodyHtml = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    // ■ ▶ ● 등으로 시작하는 건 소제목
    if (/^[■▶●◆★▷►◇☆]/.test(trimmed) || /^[0-9]+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^[■▶●◆★▷►◇☆]\s*/, '');
      bodyHtml += `<div class="subheading">${text}</div>`;
    } else {
      bodyHtml += `<p>${trimmed}</p>`;
    }
  }

  return `
  <div class="page chapter-page">
    <h2>${num}. ${title}</h2>
    <div class="chapter-body">${bodyHtml}</div>
  </div>`;
}

function renderDaeunPage(result: SajuResult): string {
  const items = result.daeUn.map(d => `
    <div class="daeun-item">
      <div class="daeun-age">${d.age}세</div>
      <div class="daeun-stem-branch ${getElementClass(d.element)}">${d.heavenlyStem}${d.earthlyBranch}</div>
      <div class="daeun-element" style="color:${getElementColor(d.element)};">${d.element}</div>
      <div class="daeun-years">${d.startYear}~${d.endYear}</div>
    </div>
  `).join('');

  return `
  <div class="page">
    <h2 style="font-size:22px;font-weight:900;text-align:center;margin-bottom:24px;">대운 흐름 (大運)</h2>
    <p style="text-align:center;color:#888;margin-bottom:24px;font-size:12px;">10년 단위로 변하는 인생의 큰 흐름</p>
    <div class="daeun-timeline">${items}</div>
  </div>`;
}

function renderMonthFortunePage(result: SajuResult): string {
  const months = result.monthFortunes || [];
  const cards = months.map(m => `
    <div class="month-card">
      <div class="month-num">${m.month}월</div>
      <div class="month-stem-branch ${getElementClass(m.elementKo)}">${m.stemKo}${m.branchKo}</div>
      <div class="month-summary">${m.summary || `${m.tenGod} · ${m.twelveStage}`}</div>
    </div>
  `).join('');

  return `
  <div class="page">
    <h2 style="font-size:22px;font-weight:900;text-align:center;margin-bottom:24px;">${new Date().getFullYear()}년 월운 (月運)</h2>
    <div class="month-grid">${cards}</div>
  </div>`;
}

function renderOutroPage(name: string): string {
  return `
  <div class="page outro-page">
    <div class="outro-thanks">${name} 님의 앞날에<br/>행운이 함께하기를 바랍니다</div>
    <div style="width:40px;height:1px;background:rgba(255,255,255,0.3);margin:30px auto;"></div>
    <div class="outro-brand">SAJULAB</div>
  </div>`;
}

function renderFallbackAnalysis(result: SajuResult, options: RenderOptions): string {
  const fortune = result.fortune;
  const sections = [
    { title: '종합운', content: fortune.overall },
    { title: '성격과 기질', content: fortune.personality },
    { title: '직업과 재물', content: `${fortune.career}\n\n${fortune.wealth}` },
    { title: '건강', content: fortune.health },
    { title: '연애와 인간관계', content: fortune.love },
  ];

  return sections.map((s, i) => renderChapterPage(i + 1, s.title, s.content)).join('');
}

function getDefaultGreeting(name: string): string {
  return `${name} 님, 안녕하세요.\n\n사주팔자(四柱八字)는 태어난 순간의 우주 에너지를\n여덟 글자로 기록한 인생의 설계도입니다.\n\n이 분석서가 자신을 이해하고\n더 나은 내일을 준비하는 데\n작은 길잡이가 되기를 바랍니다.`;
}
