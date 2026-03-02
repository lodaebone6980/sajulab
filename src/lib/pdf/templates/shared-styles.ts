// 공통 CSS 스타일 (모든 PDF 템플릿에서 사용)

export const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Noto Sans KR', sans-serif;
    color: #1a1a2e;
    line-height: 1.8;
    font-size: 11pt;
    background: #fff;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 25mm 20mm;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }

  .page:last-child {
    page-break-after: auto;
  }

  /* ── 표지 ── */
  .cover-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
    color: #fff;
    padding: 0;
  }

  .cover-page .cover-deco-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 120px;
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
  }

  .cover-page .cover-deco-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(0deg, rgba(255,255,255,0.05) 0%, transparent 100%);
  }

  .cover-page .cover-symbol {
    font-size: 80px;
    margin-bottom: 30px;
    opacity: 0.9;
  }

  .cover-page .cover-title {
    font-size: 36px;
    font-weight: 900;
    letter-spacing: 4px;
    margin-bottom: 12px;
    text-shadow: 0 2px 20px rgba(0,0,0,0.3);
  }

  .cover-page .cover-subtitle {
    font-size: 16px;
    font-weight: 300;
    letter-spacing: 8px;
    text-transform: uppercase;
    opacity: 0.7;
    margin-bottom: 60px;
  }

  .cover-page .cover-customer {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .cover-page .cover-info {
    font-size: 14px;
    opacity: 0.6;
    line-height: 2;
  }

  .cover-page .cover-brand {
    position: absolute;
    bottom: 40px;
    font-size: 12px;
    letter-spacing: 6px;
    opacity: 0.4;
  }

  /* ── 인사말 ── */
  .greeting-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: linear-gradient(180deg, #fdf8f0 0%, #fff 100%);
  }

  .greeting-page .greeting-text {
    font-size: 13pt;
    line-height: 2.2;
    color: #333;
    text-align: center;
    max-width: 460px;
    margin: 0 auto;
    font-weight: 300;
  }

  .greeting-page .greeting-signature {
    text-align: center;
    margin-top: 60px;
    font-size: 12pt;
    color: #888;
  }

  /* ── 목차 ── */
  .toc-page h2 {
    font-size: 22px;
    font-weight: 900;
    color: #1a1a2e;
    text-align: center;
    margin-bottom: 40px;
    letter-spacing: 2px;
  }

  .toc-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px dashed #ddd;
  }

  .toc-item .toc-number {
    display: inline-flex;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #1a1a2e;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    flex-shrink: 0;
  }

  .toc-item .toc-title {
    font-size: 14px;
    font-weight: 600;
    flex: 1;
  }

  /* ── 사주원국표 ── */
  .pillar-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 10pt;
  }

  .pillar-table th {
    background: #1a1a2e;
    color: #fff;
    padding: 10px 8px;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 1px;
  }

  .pillar-table td {
    padding: 12px 8px;
    text-align: center;
    border: 1px solid #e5e7eb;
    font-size: 16px;
    font-weight: 700;
  }

  .pillar-table .stem-row td {
    font-size: 28px;
    padding: 18px 8px;
  }

  .pillar-table .branch-row td {
    font-size: 28px;
    padding: 18px 8px;
  }

  /* 오행 컬러 */
  .el-wood { color: #16a34a; }
  .el-fire { color: #dc2626; }
  .el-earth { color: #d97706; }
  .el-metal { color: #6b7280; }
  .el-water { color: #2563eb; }

  .el-wood-bg { background: #f0fdf4; }
  .el-fire-bg { background: #fef2f2; }
  .el-earth-bg { background: #fffbeb; }
  .el-metal-bg { background: #f9fafb; }
  .el-water-bg { background: #eff6ff; }

  /* ── 챕터 ── */
  .chapter-page h2 {
    font-size: 24px;
    font-weight: 900;
    color: #1a1a2e;
    margin-bottom: 8px;
    padding-bottom: 16px;
    border-bottom: 3px solid #1a1a2e;
  }

  .chapter-page .chapter-subtitle {
    font-size: 13px;
    color: #888;
    letter-spacing: 2px;
    margin-bottom: 30px;
  }

  .chapter-page .chapter-body {
    font-size: 11pt;
    line-height: 2;
    color: #333;
    text-align: justify;
  }

  .chapter-page .chapter-body p {
    margin-bottom: 16px;
    text-indent: 1em;
  }

  .chapter-page .subheading {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a2e;
    margin: 28px 0 12px;
    padding-left: 12px;
    border-left: 4px solid #e11d48;
  }

  /* ── 오행 차트 ── */
  .element-chart {
    display: flex;
    gap: 12px;
    margin: 20px 0;
    align-items: flex-end;
    height: 160px;
  }

  .element-bar-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;
  }

  .element-bar {
    width: 48px;
    border-radius: 6px 6px 0 0;
    min-height: 8px;
    transition: height 0.3s;
  }

  .element-bar-label {
    font-size: 12px;
    font-weight: 700;
    margin-top: 8px;
  }

  .element-bar-value {
    font-size: 11px;
    color: #888;
    margin-bottom: 4px;
  }

  /* ── 대운 타임라인 ── */
  .daeun-timeline {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 20px 0;
  }

  .daeun-item {
    width: calc(20% - 8px);
    padding: 12px 8px;
    border-radius: 8px;
    text-align: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }

  .daeun-item .daeun-age {
    font-size: 11px;
    color: #888;
    margin-bottom: 4px;
  }

  .daeun-item .daeun-stem-branch {
    font-size: 20px;
    font-weight: 900;
    margin: 4px 0;
  }

  .daeun-item .daeun-element {
    font-size: 11px;
    font-weight: 600;
  }

  .daeun-item .daeun-years {
    font-size: 10px;
    color: #aaa;
    margin-top: 4px;
  }

  /* ── 월운 그리드 ── */
  .month-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 20px 0;
  }

  .month-card {
    padding: 16px;
    border-radius: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }

  .month-card .month-num {
    font-size: 18px;
    font-weight: 900;
    color: #1a1a2e;
  }

  .month-card .month-stem-branch {
    font-size: 14px;
    font-weight: 700;
    margin: 4px 0;
  }

  .month-card .month-summary {
    font-size: 10px;
    color: #666;
    line-height: 1.5;
  }

  /* ── 신살 태그 ── */
  .sinsal-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 12px 0;
  }

  .sinsal-tag {
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .sinsal-tag.tag-귀인 { background: #fef3c7; color: #92400e; }
  .sinsal-tag.tag-길신 { background: #d1fae5; color: #065f46; }
  .sinsal-tag.tag-흉살 { background: #fee2e2; color: #991b1b; }
  .sinsal-tag.tag-기타 { background: #e5e7eb; color: #374151; }

  /* ── 아웃트로 ── */
  .outro-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
    color: #fff;
  }

  .outro-page .outro-thanks {
    font-size: 28px;
    font-weight: 300;
    letter-spacing: 4px;
    margin-bottom: 20px;
  }

  .outro-page .outro-brand {
    font-size: 14px;
    opacity: 0.5;
    letter-spacing: 6px;
  }

  /* ── 페이지 번호 (footer) ── */
  .page-number {
    position: absolute;
    bottom: 15mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10px;
    color: #bbb;
  }
`;

// 오행 → CSS 클래스
export function getElementClass(element: string): string {
  const map: Record<string, string> = {
    '목': 'el-wood', '화': 'el-fire', '토': 'el-earth', '금': 'el-metal', '수': 'el-water',
    '木': 'el-wood', '火': 'el-fire', '土': 'el-earth', '金': 'el-metal', '水': 'el-water',
  };
  return map[element] || '';
}

export function getElementBgClass(element: string): string {
  const map: Record<string, string> = {
    '목': 'el-wood-bg', '화': 'el-fire-bg', '토': 'el-earth-bg', '금': 'el-metal-bg', '수': 'el-water-bg',
  };
  return map[element] || '';
}

export function getElementColor(element: string): string {
  const map: Record<string, string> = {
    '목': '#16a34a', '화': '#dc2626', '토': '#d97706', '금': '#6b7280', '수': '#2563eb',
  };
  return map[element] || '#333';
}
