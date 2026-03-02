import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import type { SajuResult } from '@/lib/saju/types';
import type { NarrativeResult } from '@/lib/ai';
import { generateSajuPdfFromHtml } from './html-to-pdf';

const FONTS_DIR = path.join(process.cwd(), 'fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'NanumGothic-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'NanumGothic-Bold.ttf');

// 오행 색상
const ELEMENT_COLORS: Record<string, string> = {
  '목': '#22c55e', '화': '#ef4444', '토': '#d97706', '금': '#6b7280', '수': '#3b82f6',
};
const ELEMENT_HANJA: Record<string, string> = {
  '목': '木', '화': '火', '토': '土', '금': '金', '수': '水',
};

interface PdfOptions {
  customerName: string;
  productName: string;
  productCode: string;
  narrative?: NarrativeResult | null;  // LLM 생성 내러티브 (있으면 사용)
}

export async function generateSajuPdf(
  result: SajuResult,
  options: PdfOptions
): Promise<Buffer> {
  // Puppeteer(HTML→PDF) 우선 시도, 실패 시 PDFKit 폴백
  try {
    console.log('[PDF] Puppeteer HTML→PDF 생성 시도...');
    const buffer = await generateSajuPdfFromHtml(result, options);
    console.log('[PDF] Puppeteer 성공:', buffer.length, 'bytes');
    return buffer;
  } catch (err) {
    console.warn('[PDF] Puppeteer 실패, PDFKit 폴백:', err instanceof Error ? err.message : err);
  }

  // ── PDFKit 폴백 ──
  return generatePdfKitFallback(result, options);
}

function generatePdfKitFallback(
  result: SajuResult,
  options: PdfOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 50, right: 50 },
        info: {
          Title: `사주분석서 - ${options.customerName}`,
          Author: '사주 분석 서비스',
          Subject: '사주팔자 분석 결과',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Check font file existence
      const fontRegularExists = fs.existsSync(FONT_REGULAR);
      const fontBoldExists = fs.existsSync(FONT_BOLD);

      // Register fonts if available, otherwise use built-in Helvetica
      let koreanFont = 'Helvetica';
      let koreanBoldFont = 'Helvetica-Bold';

      if (fontRegularExists && fontBoldExists) {
        try {
          doc.registerFont('Korean', FONT_REGULAR);
          doc.registerFont('KoreanBold', FONT_BOLD);
          koreanFont = 'Korean';
          koreanBoldFont = 'KoreanBold';
        } catch (err) {
          console.warn('Failed to register Korean fonts, falling back to Helvetica:', err);
        }
      } else {
        console.warn(`Font files missing: Regular=${fontRegularExists}, Bold=${fontBoldExists}. Using Helvetica.`);
      }

      // LLM 내러티브가 있으면 AI 기반 PDF 생성, 없으면 기존 방식
      if (options.narrative && options.narrative.chapters.length > 0 && options.productCode !== 'saju-data') {
        generateNarrativePdf(doc, result, options, koreanFont, koreanBoldFont);
      } else {
        // 기존 방식 (fallback)
        switch (options.productCode) {
          case 'saju-basic':
            generateBasicPdf(doc, result, options, koreanFont, koreanBoldFont);
            break;
          case 'saju-newyear':
            generateNewYearPdf(doc, result, options, koreanFont, koreanBoldFont);
            break;
          case 'saju-data':
            generateDataPdf(doc, result, options, koreanFont, koreanBoldFont);
            break;
          case 'saju-premium':
          default:
            generatePremiumPdf(doc, result, options, koreanFont, koreanBoldFont);
            break;
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────
//  AI 내러티브 기반 PDF 생성 (sajulab.kr 스타일)
// ─────────────────────────────────────────────

function generateNarrativePdf(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  options: PdfOptions,
  koreanFont: string,
  koreanBoldFont: string
) {
  const narrative = options.narrative!;
  const isBasic = options.productCode === 'saju-basic';

  // 1. 표지
  renderNarrativeCoverPage(doc, result, options, koreanFont, koreanBoldFont);

  // 2. 인사말 페이지
  doc.addPage();
  renderGreetingPage(doc, options.customerName, narrative.greeting, koreanFont, koreanBoldFont);

  // 3. 목차
  doc.addPage();
  renderNarrativeTableOfContents(doc, narrative.chapters, koreanFont, koreanBoldFont);

  // 4. 사주원국표
  doc.addPage();
  renderFourPillars(doc, result, koreanFont, koreanBoldFont);

  // 5. 음양오행 분포 (기본분석에서도 포함)
  doc.addPage();
  renderElementDistribution(doc, result, koreanFont, koreanBoldFont);

  // 6. 각 챕터별 내러티브
  for (const chapter of narrative.chapters) {
    doc.addPage();
    renderNarrativeChapter(doc, chapter, koreanFont, koreanBoldFont);
  }

  // 7. 마무리 페이지
  doc.addPage();
  renderOutroPage(doc, options, koreanFont, koreanBoldFont);
}

// ─── 내러티브 표지 (sajulab.kr 스타일) ───

function renderNarrativeCoverPage(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  options: PdfOptions,
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width, height } = doc.page;

  // 배경 (진한 남색)
  doc.rect(0, 0, width, height).fill('#0f172a');

  // 브랜드 로고 텍스트
  doc.font(koreanFont).fontSize(10).fillColor('#94a3b8');
  doc.text('운명길잡이', 0, 80, { align: 'center', width });

  // 상품별 타이틀
  let title1 = '';
  let title2 = '';
  let subtitle = '';

  switch (options.productCode) {
    case 'saju-basic':
      title1 = '사주팔자';
      title2 = '운명 분석서';
      subtitle = '당신의 운명을 밝혀드립니다';
      break;
    case 'saju-premium':
      title1 = '프리미엄';
      title2 = '사주 분석서';
      subtitle = '심층 운명 분석';
      break;
    case 'saju-newyear':
      title1 = `${new Date().getFullYear()} 신년운세`;
      title2 = '새해 운명 가이드';
      subtitle = `${new Date().getFullYear()}년 당신의 운세를 밝혀드립니다`;
      break;
    default:
      title1 = '사주팔자';
      title2 = '운명 분석서';
      subtitle = '당신의 운명을 밝혀드립니다';
  }

  // 금색 장식선
  doc.rect(width / 2 - 40, 180, 80, 1.5).fill('#d4af37');

  // 메인 타이틀
  doc.font(koreanBoldFont).fontSize(36).fillColor('#d4af37');
  doc.text(title1, 0, 220, { align: 'center', width });
  doc.text(title2, 0, 268, { align: 'center', width });

  // 서브타이틀
  doc.font(koreanFont).fontSize(13).fillColor('#94a3b8');
  doc.text(subtitle, 0, 330, { align: 'center', width });

  // 장식선
  doc.rect(width / 2 - 40, 360, 80, 1.5).fill('#d4af37');

  // 고객 정보 박스
  const boxY = 420;
  doc.roundedRect(width / 2 - 110, boxY, 220, 110, 10).fill('#1e293b');

  doc.font(koreanBoldFont).fontSize(22).fillColor('#d4af37');
  doc.text(options.customerName, 0, boxY + 20, { align: 'center', width });

  const { birthInfo } = result;
  doc.font(koreanFont).fontSize(11).fillColor('#94a3b8');
  doc.text(
    `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일`,
    0, boxY + 55, { align: 'center', width }
  );
  doc.text(
    `${birthInfo.isLunar ? '음력' : '양력'} | ${birthInfo.gender === 'male' ? '남성' : '여성'}`,
    0, boxY + 73, { align: 'center', width }
  );

  // 하단 날짜
  doc.font(koreanFont).fontSize(8).fillColor('#475569');
  doc.text(`분석일: ${new Date().toLocaleDateString('ko-KR')}`, 0, height - 80, { align: 'center', width });
}

// ─── 인사말 페이지 ───

function renderGreetingPage(
  doc: PDFKit.PDFDocument,
  customerName: string,
  greeting: string,
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const margin = 60;

  // 타이틀
  doc.font(koreanBoldFont).fontSize(24).fillColor('#d4af37');
  doc.text(`${customerName}님께`, 0, 120, { align: 'center', width });

  // 장식선
  doc.rect(width / 2 - 20, 155, 40, 2).fill('#d4af37');

  // 인사말 본문
  doc.font(koreanFont).fontSize(12).fillColor('#374151');
  doc.text(greeting, margin, 190, {
    width: width - margin * 2,
    align: 'justify',
    lineGap: 8,
  });

  // 서명
  const bottomY = doc.y + 40;
  doc.font(koreanFont).fontSize(11).fillColor('#6b7280');
  doc.text('운명길잡이 드림', 0, Math.min(bottomY, 650), { align: 'right', width: width - margin });
}

// ─── 내러티브 목차 ───

function renderNarrativeTableOfContents(
  doc: PDFKit.PDFDocument,
  chapters: { number: string; title: string }[],
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const leftX = 50;

  // CONTENTS 헤더
  doc.font(koreanFont).fontSize(10).fillColor('#6b7280');
  doc.text('CONTENTS', leftX, 80);

  doc.font(koreanBoldFont).fontSize(28).fillColor('#1f2937');
  doc.text('목차', leftX, 100);

  // 장식선
  doc.rect(leftX, 140, 40, 3).fill('#1f2937');
  doc.moveTo(leftX, 152).lineTo(width - 50, 152).strokeColor('#e5e7eb').lineWidth(1).stroke();

  let y = 175;
  for (const ch of chapters) {
    if (y > 700) {
      doc.addPage();
      y = 80;
    }

    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text(`${ch.number}  ${ch.title}`, leftX, y);

    // 점선
    y += 25;
    doc.moveTo(leftX, y).lineTo(width - 50, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    y += 18;
  }
}

// ─── 챕터 내러티브 렌더링 (핵심!) ───

function renderNarrativeChapter(
  doc: PDFKit.PDFDocument,
  chapter: { number: string; title: string; content: string },
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const margin = 50;
  const contentWidth = width - margin * 2;

  // 헤더 배경 바
  doc.rect(0, 40, width, 1).fill('#1f2937');

  // 챕터 번호
  doc.font(koreanFont).fontSize(10).fillColor('#6b7280');
  doc.text(`CHAPTER ${chapter.number}`, 0, 60, { align: 'center', width });

  // 챕터 타이틀
  doc.font(koreanBoldFont).fontSize(22).fillColor('#1f2937');
  doc.text(chapter.title, 0, 82, { align: 'center', width });

  // ENGLISH subtitle
  doc.font(koreanFont).fontSize(9).fillColor('#9ca3af');
  doc.text(chapterTitleToEnglish(chapter.title), 0, 112, { align: 'center', width });

  // 구분선
  doc.moveTo(margin, 135).lineTo(width - margin, 135).strokeColor('#e5e7eb').lineWidth(1).stroke();

  // 본문 텍스트 - 긴 텍스트를 여러 페이지에 걸쳐 렌더링
  let y = 155;
  const paragraphs = chapter.content.split('\n').filter(p => p.trim());

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // 소제목 감지 (대괄호로 시작하는 경우)
    const isSubheading = trimmed.startsWith('[') && trimmed.endsWith(']');
    const isBoldLine = trimmed.startsWith('■') || trimmed.startsWith('●') || trimmed.startsWith('▶');

    if (isSubheading) {
      // 소제목 앞 여백
      y += 12;
      if (y > 700) { doc.addPage(); y = 60; }

      doc.font(koreanBoldFont).fontSize(14).fillColor('#2563eb');
      const subTitle = trimmed.replace(/[\[\]]/g, '');
      const h = doc.heightOfString(subTitle, { width: contentWidth });
      doc.text(subTitle, margin, y, { width: contentWidth });
      y += h + 10;
    } else if (isBoldLine) {
      if (y > 720) { doc.addPage(); y = 60; }
      doc.font(koreanBoldFont).fontSize(11).fillColor('#374151');
      const h = doc.heightOfString(trimmed, { width: contentWidth, lineGap: 6 });
      doc.text(trimmed, margin, y, { width: contentWidth, lineGap: 6 });
      y += h + 6;
    } else {
      // 일반 본문
      if (y > 720) { doc.addPage(); y = 60; }

      doc.font(koreanFont).fontSize(11).fillColor('#374151');
      // 긴 문단은 분할 렌더링
      const textHeight = doc.heightOfString(trimmed, { width: contentWidth, lineGap: 6 });

      if (y + textHeight > 740) {
        // 페이지를 넘어가는 경우: PDFKit이 자동으로 처리하도록 함
        // 하지만 수동으로 페이지 관리
        const availableHeight = 740 - y;
        const linesPerPage = Math.floor(availableHeight / 18); // ~18pt per line
        const words = trimmed.split('.');
        let currentText = '';

        for (const sentence of words) {
          const test = currentText + sentence + '.';
          const testH = doc.heightOfString(test, { width: contentWidth, lineGap: 6 });

          if (y + testH > 740 && currentText) {
            doc.text(currentText.trim(), margin, y, { width: contentWidth, lineGap: 6, align: 'justify' });
            doc.addPage();
            y = 60;
            currentText = sentence + '.';
          } else {
            currentText = test;
          }
        }

        if (currentText.trim() && currentText.trim() !== '.') {
          const h = doc.heightOfString(currentText.trim(), { width: contentWidth, lineGap: 6 });
          doc.text(currentText.trim(), margin, y, { width: contentWidth, lineGap: 6, align: 'justify' });
          y += h + 8;
        }
      } else {
        doc.text(trimmed, margin, y, { width: contentWidth, lineGap: 6, align: 'justify' });
        y += textHeight + 8;
      }
    }
  }
}

function chapterTitleToEnglish(title: string): string {
  const map: Record<string, string> = {
    '종합 운세 분석': 'FORTUNE ANALYSIS',
    '나의 사주팔자 상세분석': 'DETAILED FOUR PILLARS ANALYSIS',
    '내 인생의 황금기': 'GOLDEN ERA OF YOUR LIFE',
    '연애운과 배우자운': 'LOVE & MARRIAGE FORTUNE',
    '나의 재물운 분석': 'WEALTH ANALYSIS',
    '직업과 성공의 운명': 'CAREER & SUCCESS DESTINY',
    '사주로 보는 건강과 체질': 'HEALTH & CONSTITUTION',
    '당신을 도와줄 운명의 귀인': 'YOUR DESTINED BENEFACTOR',
    '운명을 바꾸는 방법': 'HOW TO CHANGE YOUR DESTINY',
    '월별 상세 운세': 'MONTHLY FORTUNE ANALYSIS',
    '월별 운세 상세 분석': 'MONTHLY FORTUNE ANALYSIS',
    '앞으로의 10년간 운명 분석': 'NEXT 10 YEARS DESTINY',
    '나의 사주 한눈에 보기': 'YOUR FOUR PILLARS AT A GLANCE',
    '운세 총평': 'OVERALL FORTUNE',
    '재물운': 'WEALTH FORTUNE',
    '직업/사업운': 'CAREER FORTUNE',
    '연애/가정운': 'LOVE & FAMILY FORTUNE',
    '건강운': 'HEALTH FORTUNE',
    '인간관계/귀인': 'RELATIONSHIPS & BENEFACTORS',
    '주의할 시기와 대비법': 'CAUTION PERIODS & PREPARATION',
    '행운 가이드': 'LUCKY GUIDE',
  };

  for (const [ko, en] of Object.entries(map)) {
    if (title.includes(ko)) return en;
  }
  return 'ANALYSIS';
}

// ─────────────────────────────────────────────
//  기존 PRODUCT-SPECIFIC PDF GENERATORS (fallback)
// ─────────────────────────────────────────────

function generateBasicPdf(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  options: PdfOptions,
  koreanFont: string,
  koreanBoldFont: string
) {
  // saju-basic: Cover + Four Pillars + Element Distribution + Brief fortune (personality only) + Outro
  renderCoverPage(doc, result, options, koreanFont, koreanBoldFont);

  doc.addPage();
  renderFourPillars(doc, result, koreanFont, koreanBoldFont);

  doc.addPage();
  renderElementDistribution(doc, result, koreanFont, koreanBoldFont);

  doc.addPage();
  renderFortuneSectionPage(doc, '성격운', '성격 분석', result.fortune.personality, koreanFont, koreanBoldFont);

  doc.addPage();
  renderOutroPage(doc, options, koreanFont, koreanBoldFont);
}

function generateNewYearPdf(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  options: PdfOptions,
  koreanFont: string,
  koreanBoldFont: string
) {
  // saju-newyear: Cover + Four Pillars + Year Fortune + Month Fortune + Outro
  renderCoverPage(doc, result, options, koreanFont, koreanBoldFont);

  doc.addPage();
  renderFourPillars(doc, result, koreanFont, koreanBoldFont);

  if (result.yearFortune) {
    doc.addPage();
    renderNewYearFortunePage(doc, result, koreanFont, koreanBoldFont);
  }

  if (result.monthFortunes && result.monthFortunes.length > 0) {
    doc.addPage();
    renderMonthFortunePage(doc, result, koreanFont, koreanBoldFont);
  }

  doc.addPage();
  renderOutroPage(doc, options, koreanFont, koreanBoldFont);
}

function generateDataPdf(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  options: PdfOptions,
  koreanFont: string,
  koreanBoldFont: string
) {
  // saju-data: Cover + All raw data as text + Outro
  renderCoverPage(doc, result, options, koreanFont, koreanBoldFont);

  doc.addPage();
  renderRawDataPage(doc, result, koreanFont, koreanBoldFont);

  doc.addPage();
  renderOutroPage(doc, options, koreanFont, koreanBoldFont);
}

function generatePremiumPdf(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  options: PdfOptions,
  koreanFont: string,
  koreanBoldFont: string
) {
  // saju-premium: Full current PDF (all sections)
  renderCoverPage(doc, result, options, koreanFont, koreanBoldFont);

  doc.addPage();
  renderTableOfContents(doc, result, options, koreanFont, koreanBoldFont);

  doc.addPage();
  renderFourPillars(doc, result, koreanFont, koreanBoldFont);

  doc.addPage();
  renderElementDistribution(doc, result, koreanFont, koreanBoldFont);

  renderFortuneAnalysis(doc, result, koreanFont, koreanBoldFont);

  doc.addPage();
  renderDaeUn(doc, result, koreanFont, koreanBoldFont);

  doc.addPage();
  renderExtendedAnalysis(doc, result, koreanFont, koreanBoldFont);

  if (result.yearFortune || result.monthFortunes) {
    doc.addPage();
    renderYearMonthFortune(doc, result, koreanFont, koreanBoldFont);
  }

  if (result.externalFortune && !result.externalFortune.error) {
    doc.addPage();
    renderExternalFortune(doc, result, koreanFont, koreanBoldFont);
  }

  doc.addPage();
  renderOutroPage(doc, options, koreanFont, koreanBoldFont);
}

// ─────────────────────────────────────────────
//  COVER PAGE
// ─────────────────────────────────────────────
function renderCoverPage(doc: PDFKit.PDFDocument, result: SajuResult, options: PdfOptions, koreanFont: string, koreanBoldFont: string) {
  const { width, height } = doc.page;

  // Background
  doc.rect(0, 0, width, height).fill('#0f172a');

  // Top accent line
  doc.rect(width / 2 - 40, 140, 80, 1.5).fill('#d4af37');

  // Title
  doc.font(koreanBoldFont).fontSize(32).fillColor('#d4af37');
  doc.text('사주팔자', 0, 170, { align: 'center', width });
  doc.text('운명 분석서', 0, 210, { align: 'center', width });

  // Subtitle
  doc.font(koreanFont).fontSize(12).fillColor('#94a3b8');
  doc.text('당신의 운명을 밝혀드립니다', 0, 260, { align: 'center', width });

  // Accent line
  doc.rect(width / 2 - 40, 290, 80, 1.5).fill('#d4af37');

  // Customer info box
  const boxY = 360;
  doc.roundedRect(width / 2 - 100, boxY, 200, 100, 8).fill('#1e293b');
  doc.font(koreanBoldFont).fontSize(18).fillColor('#d4af37');
  doc.text(options.customerName, 0, boxY + 20, { align: 'center', width });

  const { birthInfo } = result;
  doc.font(koreanFont).fontSize(10).fillColor('#94a3b8');
  doc.text(
    `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 ${String(birthInfo.hour).padStart(2, '0')}시 ${String(birthInfo.minute).padStart(2, '0')}분`,
    0, boxY + 50, { align: 'center', width }
  );
  doc.text(
    `${birthInfo.isLunar ? '음력' : '양력'} | ${birthInfo.gender === 'male' ? '남성' : '여성'}`,
    0, boxY + 66, { align: 'center', width }
  );

  // Product badge
  doc.roundedRect(width / 2 - 50, boxY + 120, 100, 24, 12).fill('#d4af3720');
  doc.font(koreanBoldFont).fontSize(9).fillColor('#d4af37');
  doc.text(options.productName, 0, boxY + 126, { align: 'center', width });

  // Bottom
  doc.font(koreanFont).fontSize(8).fillColor('#475569');
  doc.text(`분석일: ${new Date().toLocaleDateString('ko-KR')}`, 0, height - 100, { align: 'center', width });

  // PREMIUM badge
  doc.font(koreanBoldFont).fontSize(7).fillColor('#0f172a');
  doc.roundedRect(width - 90, 40, 60, 18, 3).fill('#d4af37');
  doc.text('PREMIUM', width - 88, 44, { width: 56, align: 'center' });
}

// ─────────────────────────────────────────────
//  TABLE OF CONTENTS
// ─────────────────────────────────────────────
function renderTableOfContents(doc: PDFKit.PDFDocument, result: SajuResult, options: PdfOptions, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;
  const leftX = 50;

  drawSectionHeader(doc, '목 차', koreanBoldFont);

  const tocItems = [
    { num: '01', label: '사주원국표 (四柱八字)', desc: '년주, 월주, 일주, 시주 분석' },
    { num: '02', label: '음양오행 분포 (五行)', desc: '오행의 균형과 용신/기신 분석' },
    { num: '03', label: '성격 분석', desc: '일간의 기질과 성격 특성' },
    { num: '04', label: '직업운 분석', desc: '적합한 직업과 진로 방향' },
    { num: '05', label: '재물운 분석', desc: '재물 관리와 투자 성향' },
    { num: '06', label: '건강운 분석', desc: '주의해야 할 건강 포인트' },
    { num: '07', label: '애정운 분석', desc: '연애와 결혼의 운세' },
    { num: '08', label: '종합운 분석', desc: '전체적인 운의 흐름' },
    { num: '09', label: '대운 (大運)', desc: '10년 주기 대운의 흐름' },
  ];

  if (result.externalFortune && !result.externalFortune.error) {
    tocItems.push({ num: '10', label: '상세 운세', desc: '일운, 년운, 평생운 분석' });
  }

  let y = 170;
  for (const item of tocItems) {
    // Number circle
    doc.circle(leftX + 16, y + 10, 14).fill('#f1f5f9');
    doc.font(koreanBoldFont).fontSize(10).fillColor('#2563eb');
    doc.text(item.num, leftX + 4, y + 5, { width: 24, align: 'center' });

    // Title
    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text(item.label, leftX + 44, y + 2);

    // Description
    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    doc.text(item.desc, leftX + 44, y + 20);

    // Dotted line
    const lineY = y + 38;
    doc.moveTo(leftX, lineY).lineTo(width - 50, lineY).dash(2, { space: 3 }).strokeColor('#e5e7eb').stroke();
    doc.undash();

    y += 48;
  }
}

// ─────────────────────────────────────────────
//  FOUR PILLARS (사주원국표)
// ─────────────────────────────────────────────
function renderFourPillars(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;
  const { fourPillars, tenGods } = result;

  drawSectionHeader(doc, '사주원국표 (四柱八字)', koreanBoldFont);

  const pillars = [
    { label: '시주 (時柱)', pillar: fourPillars.hour, tenGod: tenGods.hour },
    { label: '일주 (日柱)', pillar: fourPillars.day, tenGod: '일간(나)' },
    { label: '월주 (月柱)', pillar: fourPillars.month, tenGod: tenGods.month },
    { label: '년주 (年柱)', pillar: fourPillars.year, tenGod: tenGods.year },
  ];

  const cardW = 105;
  const cardH = 200;
  const startX = (width - (cardW * 4 + 24)) / 2;
  const y = 150;

  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    const x = startX + i * (cardW + 8);
    const color = ELEMENT_COLORS[p.pillar.elementKo] || '#6b7280';

    // Card background
    doc.roundedRect(x, y, cardW, cardH, 8).fill('#f8fafc');
    doc.roundedRect(x, y, cardW, cardH, 8).strokeColor('#e2e8f0').stroke();

    // Label
    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    doc.text(p.label, x, y + 10, { width: cardW, align: 'center' });

    // Ten god
    doc.font(koreanBoldFont).fontSize(9).fillColor('#2563eb');
    doc.text(p.tenGod, x, y + 26, { width: cardW, align: 'center' });

    // Heavenly stem (hanja)
    doc.font(koreanBoldFont).fontSize(28).fillColor(color);
    doc.text(p.pillar.heavenlyStem, x, y + 46, { width: cardW, align: 'center' });

    // Heavenly stem (korean)
    doc.font(koreanFont).fontSize(11).fillColor('#6b7280');
    doc.text(p.pillar.heavenlyStemKo, x, y + 80, { width: cardW, align: 'center' });

    // Divider
    doc.rect(x + 20, y + 98, cardW - 40, 0.5).fill('#e2e8f0');

    // Earthly branch (hanja)
    doc.font(koreanBoldFont).fontSize(28).fillColor(color);
    doc.text(p.pillar.earthlyBranch, x, y + 106, { width: cardW, align: 'center' });

    // Earthly branch (korean)
    doc.font(koreanFont).fontSize(11).fillColor('#6b7280');
    doc.text(p.pillar.earthlyBranchKo, x, y + 140, { width: cardW, align: 'center' });

    // Element + Yin/Yang badges
    const badgeY = y + 164;
    // Element badge
    doc.roundedRect(x + 12, badgeY, 42, 18, 9).fill(color + '20');
    doc.font(koreanBoldFont).fontSize(8).fillColor(color);
    doc.text(`${ELEMENT_HANJA[p.pillar.elementKo]}${p.pillar.elementKo}`, x + 12, badgeY + 4, { width: 42, align: 'center' });

    // YinYang badge
    doc.roundedRect(x + cardW - 54, badgeY, 42, 18, 9).fill('#f1f5f9');
    doc.font(koreanFont).fontSize(8).fillColor('#6b7280');
    doc.text(p.pillar.yinYangKo, x + cardW - 54, badgeY + 4, { width: 42, align: 'center' });
  }

  // Birth info footer
  const { birthInfo } = result;
  doc.font(koreanFont).fontSize(9).fillColor('#9ca3af');
  doc.text(
    `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 ${String(birthInfo.hour).padStart(2, '0')}시 ${String(birthInfo.minute).padStart(2, '0')}분 (${birthInfo.isLunar ? '음력' : '양력'}) | ${birthInfo.gender === 'male' ? '남성' : '여성'}`,
    0, y + cardH + 20, { align: 'center', width }
  );

  if (result.calculationSource) {
    doc.font(koreanFont).fontSize(7).fillColor('#d1d5db');
    doc.text(
      `계산 엔진: ${result.calculationSource === 'manseryeok-kasi' ? '만세력(KASI)' : '내장 알고리즘'}`,
      0, y + cardH + 38, { align: 'center', width }
    );
  }
}

// ─────────────────────────────────────────────
//  ELEMENT DISTRIBUTION (오행분포)
// ─────────────────────────────────────────────
function renderElementDistribution(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;
  const { elementDistribution, yongSin, giSin } = result;

  drawSectionHeader(doc, '음양오행 분포 (五行)', koreanBoldFont);

  const elements = [
    { label: '목', hanja: '木', value: elementDistribution.wood, color: '#22c55e' },
    { label: '화', hanja: '火', value: elementDistribution.fire, color: '#ef4444' },
    { label: '토', hanja: '土', value: elementDistribution.earth, color: '#d97706' },
    { label: '금', hanja: '金', value: elementDistribution.metal, color: '#6b7280' },
    { label: '수', hanja: '水', value: elementDistribution.water, color: '#3b82f6' },
  ];

  const maxVal = Math.max(...elements.map(e => e.value), 1);
  const barStartX = 130;
  const barMaxW = width - barStartX - 100;
  let y = 160;

  for (const el of elements) {
    const barW = (el.value / maxVal) * barMaxW;

    // Element circle
    doc.circle(80, y + 10, 14).fill(el.color + '20');
    doc.font(koreanBoldFont).fontSize(11).fillColor(el.color);
    doc.text(el.hanja, 68, y + 4, { width: 24, align: 'center' });

    // Label
    doc.font(koreanFont).fontSize(10).fillColor('#6b7280');
    doc.text(el.label, 100, y + 5, { width: 28, align: 'right' });

    // Bar background
    doc.roundedRect(barStartX, y + 2, barMaxW, 16, 8).fill('#f1f5f9');

    // Bar fill
    if (barW > 0) {
      doc.roundedRect(barStartX, y + 2, Math.max(barW, 16), 16, 8).fill(el.color);
    }

    // Value
    doc.font(koreanBoldFont).fontSize(10).fillColor('#374151');
    doc.text(String(el.value), barStartX + barMaxW + 10, y + 4);

    y += 36;
  }

  // Yongsin / Gisin box
  y += 20;
  const boxW = 200;
  const centerX = width / 2;

  // Yongsin
  doc.roundedRect(centerX - boxW - 15, y, boxW, 70, 8).fill('#f0fdf4');
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  doc.text('용신 (用神)', centerX - boxW - 15, y + 10, { width: boxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(22).fillColor(ELEMENT_COLORS[yongSin] || '#374151');
  doc.text(`${ELEMENT_HANJA[yongSin]} ${yongSin}`, centerX - boxW - 15, y + 32, { width: boxW, align: 'center' });

  // Gisin
  doc.roundedRect(centerX + 15, y, boxW, 70, 8).fill('#fef2f2');
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  doc.text('기신 (忌神)', centerX + 15, y + 10, { width: boxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(22).fillColor(ELEMENT_COLORS[giSin] || '#374151');
  doc.text(`${ELEMENT_HANJA[giSin]} ${giSin}`, centerX + 15, y + 32, { width: boxW, align: 'center' });

  // Lucky info
  y += 100;
  const { fortune } = result;

  doc.roundedRect(50, y, width - 100, 80, 8).fill('#f8fafc');
  doc.roundedRect(50, y, width - 100, 80, 8).strokeColor('#e2e8f0').stroke();

  const thirdW = (width - 100) / 3;

  // Lucky color
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  doc.text('행운의 색', 50, y + 12, { width: thirdW, align: 'center' });
  doc.circle(50 + thirdW / 2, y + 42, 10).fill(fortune.luckyColor);
  doc.font(koreanFont).fontSize(9).fillColor('#374151');
  doc.text(`${yongSin} 계열`, 50, y + 60, { width: thirdW, align: 'center' });

  // Lucky number
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  doc.text('행운의 숫자', 50 + thirdW, y + 12, { width: thirdW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(24).fillColor('#d97706');
  doc.text(String(fortune.luckyNumber), 50 + thirdW, y + 32, { width: thirdW, align: 'center' });

  // Lucky direction
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  doc.text('행운의 방향', 50 + thirdW * 2, y + 12, { width: thirdW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(18).fillColor('#2563eb');
  doc.text(fortune.luckyDirection, 50 + thirdW * 2, y + 36, { width: thirdW, align: 'center' });
}

// ─────────────────────────────────────────────
//  FORTUNE ANALYSIS (운세분석) - Multiple pages
// ─────────────────────────────────────────────
function renderFortuneAnalysis(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { fortune } = result;

  const sections = [
    { icon: '성격운', title: '성격 분석', content: fortune.personality },
    { icon: '직업운', title: '직업운 분석', content: fortune.career },
    { icon: '재물운', title: '재물운 분석', content: fortune.wealth },
    { icon: '건강운', title: '건강운 분석', content: fortune.health },
    { icon: '애정운', title: '애정운 분석', content: fortune.love },
    { icon: '종합운', title: '종합운 분석', content: fortune.overall },
  ];

  for (const section of sections) {
    doc.addPage();
    renderFortuneSectionPage(doc, section.icon, section.title, section.content, koreanFont, koreanBoldFont);
  }
}

function renderFortuneSectionPage(doc: PDFKit.PDFDocument, icon: string, title: string, content: string, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;

  drawSectionHeader(doc, title, koreanBoldFont);

  // Category badge
  doc.roundedRect(width / 2 - 36, 110, 72, 22, 11).fill('#eff6ff');
  doc.font(koreanBoldFont).fontSize(9).fillColor('#2563eb');
  doc.text(icon, width / 2 - 36, 115, { width: 72, align: 'center' });

  // Content
  doc.font(koreanFont).fontSize(11).fillColor('#374151');
  doc.text(content, 60, 160, {
    width: width - 120,
    align: 'left',
    lineGap: 8,
  });
}

// ─────────────────────────────────────────────
//  DAE UN (대운)
// ─────────────────────────────────────────────
function renderDaeUn(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;
  const { daeUn } = result;

  drawSectionHeader(doc, '대운 (大運)', koreanBoldFont);

  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  doc.text('10년 주기로 변화하는 운의 큰 흐름입니다.', 0, 120, { align: 'center', width });

  // Timeline
  const startX = 60;
  const itemW = (width - 120) / Math.min(daeUn.length, 5);
  let y = 160;

  for (let row = 0; row < Math.ceil(daeUn.length / 5); row++) {
    const rowItems = daeUn.slice(row * 5, (row + 1) * 5);

    // Horizontal line
    doc.moveTo(startX, y + 30)
       .lineTo(startX + itemW * rowItems.length, y + 30)
       .strokeColor('#e2e8f0').lineWidth(1).stroke();

    for (let i = 0; i < rowItems.length; i++) {
      const du = rowItems[i];
      const x = startX + i * itemW + itemW / 2;
      const color = ELEMENT_COLORS[du.element] || '#6b7280';

      // Dot on timeline
      doc.circle(x, y + 30, 5).fill(color);

      // Age
      doc.font(koreanFont).fontSize(8).fillColor('#9ca3af');
      doc.text(`${du.age}세~`, x - 20, y + 4, { width: 40, align: 'center' });

      // Stem + Branch
      doc.font(koreanBoldFont).fontSize(16).fillColor(color);
      doc.text(`${du.heavenlyStem}${du.earthlyBranch}`, x - 25, y + 42, { width: 50, align: 'center' });

      // Year range
      doc.font(koreanFont).fontSize(7).fillColor('#9ca3af');
      doc.text(`${du.startYear}-${du.endYear}`, x - 25, y + 64, { width: 50, align: 'center' });

      // Element badge
      doc.roundedRect(x - 18, y + 78, 36, 16, 8).fill(color + '20');
      doc.font(koreanBoldFont).fontSize(7).fillColor(color);
      doc.text(`${ELEMENT_HANJA[du.element]}${du.element}`, x - 18, y + 82, { width: 36, align: 'center' });
    }

    y += 120;
  }
}

// ─────────────────────────────────────────────
//  EXTERNAL FORTUNE (외부 운세 데이터)
// ─────────────────────────────────────────────
function renderExternalFortune(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;
  const ext = result.externalFortune;
  if (!ext) return;

  drawSectionHeader(doc, '상세 운세 분석', koreanBoldFont);

  let y = 140;

  // Daily fortune
  if (ext.daily?.items?.length) {
    y = renderExternalSection(doc, '오늘의 운세 (일운)', ext.daily.items, y, koreanFont, koreanBoldFont);
  }

  // Yearly fortune
  if (ext.yearly?.items?.length) {
    if (y > 600) { doc.addPage(); y = 80; }
    y = renderExternalSection(doc, `${new Date().getFullYear()}년 운세 (년운)`, ext.yearly.items, y, koreanFont, koreanBoldFont);
  }

  // Lifetime fortune
  if (ext.lifetime?.items?.length) {
    if (y > 500) { doc.addPage(); y = 80; }
    y = renderExternalSection(doc, '평생운', ext.lifetime.items, y, koreanFont, koreanBoldFont);
  }
}

function renderExternalSection(
  doc: PDFKit.PDFDocument,
  title: string,
  items: { title: string; description: string }[],
  startY: number,
  koreanFont: string,
  koreanBoldFont: string
): number {
  const { width } = doc.page;
  let y = startY;

  // Section title
  doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
  doc.text(title, 60, y);
  y += 24;

  doc.rect(60, y, width - 120, 0.5).fill('#e2e8f0');
  y += 12;

  for (const item of items) {
    // Check page break
    if (y > 700) {
      doc.addPage();
      y = 80;
    }

    doc.font(koreanBoldFont).fontSize(10).fillColor('#2563eb');
    doc.text(`▸ ${item.title}`, 60, y);
    y += 18;

    doc.font(koreanFont).fontSize(10).fillColor('#374151');
    const textHeight = doc.heightOfString(item.description, { width: width - 140, lineGap: 6 });
    doc.text(item.description, 70, y, { width: width - 140, lineGap: 6 });
    y += textHeight + 14;
  }

  return y + 10;
}

// ─────────────────────────────────────────────
//  OUTRO PAGE
// ─────────────────────────────────────────────
function renderOutroPage(doc: PDFKit.PDFDocument, options: PdfOptions, koreanFont: string, koreanBoldFont: string) {
  const { width, height } = doc.page;

  // Background
  doc.rect(0, 0, width, height).fill('#faf6f0');

  const centerY = height / 2 - 60;

  doc.rect(width / 2 - 30, centerY - 20, 60, 1).fill('#d4af37');

  doc.font(koreanBoldFont).fontSize(18).fillColor('#3d3028');
  doc.text('분석을 마치며', 0, centerY, { align: 'center', width });

  doc.font(koreanFont).fontSize(11).fillColor('#6b7280');
  doc.text(
    '본 분석 결과는 전통 명리학 이론과 데이터를 기반으로\n작성되었습니다.\n\n분석 결과가 도움이 되셨기를 바라며,\n추가 상담이 필요하시면 언제든 연락 주세요.\n\n감사합니다.',
    0, centerY + 40, { align: 'center', width, lineGap: 6 }
  );

  doc.rect(width / 2 - 30, centerY + 160, 60, 1).fill('#d4af37');

  doc.font(koreanFont).fontSize(8).fillColor('#9ca3af');
  doc.text('* 본 분석은 참고용이며, 의학적/법률적/재정적 조언을 대체하지 않습니다.', 0, height - 80, { align: 'center', width });
  doc.text(`발행일: ${new Date().toLocaleDateString('ko-KR')}`, 0, height - 65, { align: 'center', width });
}

// ─────────────────────────────────────────────
//  EXTENDED ANALYSIS (확장 분석)
// ─────────────────────────────────────────────
function renderExtendedAnalysis(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;

  drawSectionHeader(doc, '심층 분석 (深層分析)', koreanBoldFont);

  let y = 130;

  // 강약 판정
  if (result.strength) {
    const s = result.strength;
    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text('강약 판정 (强弱)', 60, y);
    y += 24;

    const resultColor = s.result === '신강' ? '#ef4444' : s.result === '신약' ? '#3b82f6' : '#d97706';
    doc.roundedRect(60, y, width - 120, 60, 8).fill('#f8fafc');
    doc.font(koreanBoldFont).fontSize(22).fillColor(resultColor);
    doc.text(s.result, 60, y + 8, { width: 120, align: 'center' });
    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    doc.text(`총 ${s.totalScore > 0 ? '+' : ''}${s.totalScore}점`, 60, y + 38, { width: 120, align: 'center' });

    // 3 criteria
    const thirdW = (width - 120 - 120) / 3;
    const criteria = [
      { label: '득령', gained: s.deukryeong.gained, score: s.deukryeong.score },
      { label: '득지', gained: s.deukji.gained, score: s.deukji.score },
      { label: '득세', gained: s.deukse.gained, score: s.deukse.score },
    ];
    for (let i = 0; i < 3; i++) {
      const cx = 180 + i * thirdW + thirdW / 2;
      doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
      doc.text(criteria[i].label, cx - 30, y + 10, { width: 60, align: 'center' });
      doc.font(koreanBoldFont).fontSize(14).fillColor(criteria[i].gained ? '#22c55e' : '#ef4444');
      doc.text(`${criteria[i].gained ? 'O' : 'X'} (${criteria[i].score})`, cx - 30, y + 28, { width: 60, align: 'center' });
    }
    y += 80;
  }

  // 용신 5체계
  if (result.yongShinSystem) {
    const ys = result.yongShinSystem;
    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text('용신 5체계 (用神五體系)', 60, y);
    y += 22;

    doc.font(koreanFont).fontSize(8).fillColor('#6b7280');
    doc.text(ys.reason, 60, y, { width: width - 120 });
    y += 20;

    const items = [
      { label: '용신', sub: '用神', value: ys.yongSin },
      { label: '희신', sub: '喜神', value: ys.huiSin },
      { label: '한신', sub: '閑神', value: ys.hanSin },
      { label: '구신', sub: '仇神', value: ys.guSin },
      { label: '기신', sub: '忌神', value: ys.giSin },
    ];
    const cellW = (width - 120) / 5;
    for (let i = 0; i < 5; i++) {
      const cx = 60 + i * cellW;
      const color = ELEMENT_COLORS[items[i].value] || '#6b7280';
      doc.roundedRect(cx + 2, y, cellW - 4, 50, 6).fill('#f8fafc');
      doc.font(koreanFont).fontSize(8).fillColor('#6b7280');
      doc.text(`${items[i].label}(${items[i].sub})`, cx + 2, y + 6, { width: cellW - 4, align: 'center' });
      doc.font(koreanBoldFont).fontSize(16).fillColor(color);
      doc.text(`${ELEMENT_HANJA[items[i].value]}${items[i].value}`, cx + 2, y + 24, { width: cellW - 4, align: 'center' });
    }
    y += 68;
  }

  // 십이운성
  if (result.twelveStages) {
    const ts = result.twelveStages;
    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text('십이운성 (十二運星)', 60, y);
    y += 24;

    const positions: Array<{ label: string; key: 'hour' | 'day' | 'month' | 'year' }> = [
      { label: '시주', key: 'hour' }, { label: '일주', key: 'day' },
      { label: '월주', key: 'month' }, { label: '년주', key: 'year' },
    ];
    const cellW = (width - 120) / 4;
    for (let i = 0; i < 4; i++) {
      const cx = 60 + i * cellW;
      doc.roundedRect(cx + 2, y, cellW - 4, 40, 6).fill('#f8fafc');
      doc.font(koreanFont).fontSize(8).fillColor('#6b7280');
      doc.text(positions[i].label, cx + 2, y + 6, { width: cellW - 4, align: 'center' });
      doc.font(koreanBoldFont).fontSize(14).fillColor('#2563eb');
      doc.text(ts.bong[positions[i].key], cx + 2, y + 20, { width: cellW - 4, align: 'center' });
    }
    y += 56;
  }

  // 신살 (간략 표시)
  if (result.sinsal && result.sinsal.length > 0) {
    if (y > 600) { doc.addPage(); y = 80; drawSectionHeader(doc, '심층 분석 (계속)', koreanBoldFont); y = 130; }

    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text('신살 (神煞)', 60, y);
    y += 22;

    for (const s of result.sinsal.slice(0, 8)) {
      if (y > 740) { doc.addPage(); y = 80; }
      const catColor = s.category === '귀인' ? '#d97706' : s.category === '길신' ? '#22c55e' : s.category === '흉살' ? '#ef4444' : '#6b7280';
      doc.roundedRect(60, y, 44, 16, 8).fill(catColor + '20');
      doc.font(koreanBoldFont).fontSize(7).fillColor(catColor);
      doc.text(s.category, 60, y + 4, { width: 44, align: 'center' });
      doc.font(koreanBoldFont).fontSize(10).fillColor('#1f2937');
      doc.text(s.name, 112, y + 2);
      doc.font(koreanFont).fontSize(8).fillColor('#6b7280');
      doc.text(s.description, 112, y + 16, { width: width - 172 });
      y += 36;
    }
  }

  // 형충회합 (간략)
  if (result.interactions && result.interactions.length > 0) {
    if (y > 600) { doc.addPage(); y = 80; drawSectionHeader(doc, '심층 분석 (계속)', koreanBoldFont); y = 130; }

    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text('형충회합 (刑沖會合)', 60, y);
    y += 22;

    for (const it of result.interactions.slice(0, 6)) {
      if (y > 740) { doc.addPage(); y = 80; }
      const typeColor = ['천간합', '육합', '삼합', '방합'].includes(it.type) ? '#22c55e' :
                         ['천간충', '육충'].includes(it.type) ? '#ef4444' : '#d97706';
      doc.roundedRect(60, y, 44, 16, 8).fill(typeColor + '20');
      doc.font(koreanBoldFont).fontSize(7).fillColor(typeColor);
      doc.text(it.type, 60, y + 4, { width: 44, align: 'center' });
      doc.font(koreanBoldFont).fontSize(10).fillColor('#1f2937');
      doc.text(it.members.join(' '), 112, y + 2);
      doc.font(koreanFont).fontSize(8).fillColor('#6b7280');
      doc.text(it.description, 112, y + 16, { width: width - 172 });
      y += 36;
    }
  }
}

// ─────────────────────────────────────────────
//  YEAR/MONTH FORTUNE (세운/월운)
// ─────────────────────────────────────────────
function renderYearMonthFortune(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;

  drawSectionHeader(doc, '세운 / 월운 (歲運 / 月運)', koreanBoldFont);

  let y = 130;

  // Year fortune
  if (result.yearFortune) {
    const yf = result.yearFortune;
    const color = ELEMENT_COLORS[yf.elementKo] || '#6b7280';

    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text(`${yf.year}년 세운 (歲運)`, 60, y);
    y += 24;

    doc.roundedRect(60, y, width - 120, 70, 8).fill('#f8fafc');

    // Stem+Branch
    doc.font(koreanBoldFont).fontSize(24).fillColor(color);
    doc.text(`${yf.stem}${yf.branch}`, 80, y + 10, { width: 80 });
    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    doc.text(`${yf.animal}띠해`, 80, y + 42);

    // Ten god + Twelve stage
    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    doc.text('십성', 200, y + 10);
    doc.font(koreanBoldFont).fontSize(14).fillColor('#2563eb');
    doc.text(yf.tenGod, 200, y + 26);

    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    doc.text('운성', 300, y + 10);
    doc.font(koreanBoldFont).fontSize(14).fillColor('#2563eb');
    doc.text(yf.twelveStage, 300, y + 26);

    // Rating
    const ratingColor = yf.favorableRating >= 10 ? '#22c55e' : yf.favorableRating <= -10 ? '#ef4444' : '#d97706';
    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    doc.text('길흉', 400, y + 10);
    doc.font(koreanBoldFont).fontSize(18).fillColor(ratingColor);
    doc.text(`${yf.favorableRating > 0 ? '+' : ''}${yf.favorableRating}`, 400, y + 26);

    y += 80;

    // Summary
    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    doc.text(yf.summary, 60, y, { width: width - 120 });
    y += 30;
  }

  // Month fortunes
  if (result.monthFortunes && result.monthFortunes.length > 0) {
    y += 10;
    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text('12개월 월운 (月運)', 60, y);
    y += 24;

    const cellW = (width - 120) / 6;
    const cellH = 60;

    for (let row = 0; row < 2; row++) {
      const rowItems = result.monthFortunes.slice(row * 6, (row + 1) * 6);
      for (let i = 0; i < rowItems.length; i++) {
        const mf = rowItems[i];
        const cx = 60 + i * cellW;
        const color = ELEMENT_COLORS[mf.elementKo] || '#6b7280';

        doc.roundedRect(cx + 2, y, cellW - 4, cellH, 4).fill('#f8fafc');
        doc.font(koreanFont).fontSize(7).fillColor('#6b7280');
        doc.text(`${mf.month}월`, cx + 2, y + 4, { width: cellW - 4, align: 'center' });
        doc.font(koreanBoldFont).fontSize(11).fillColor(color);
        doc.text(`${mf.stemKo}${mf.branchKo}`, cx + 2, y + 16, { width: cellW - 4, align: 'center' });
        doc.font(koreanFont).fontSize(7).fillColor('#6b7280');
        doc.text(mf.tenGod, cx + 2, y + 32, { width: cellW - 4, align: 'center' });
        doc.font(koreanFont).fontSize(7).fillColor('#2563eb');
        doc.text(mf.twelveStage, cx + 2, y + 44, { width: cellW - 4, align: 'center' });
      }
      y += cellH + 8;
    }
  }
}

// ─────────────────────────────────────────────
//  PRODUCT-SPECIFIC PAGE RENDERERS
// ─────────────────────────────────────────────

function renderNewYearFortunePage(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;
  const yf = result.yearFortune;
  if (!yf) return;

  drawSectionHeader(doc, `${yf.year}년 세운 분석`, koreanBoldFont);

  let y = 150;
  const color = ELEMENT_COLORS[yf.elementKo] || '#6b7280';

  // Stem+Branch box
  doc.roundedRect(60, y, width - 120, 70, 8).fill('#f8fafc');
  doc.font(koreanBoldFont).fontSize(28).fillColor(color);
  doc.text(`${yf.stem}${yf.branch}`, 60, y + 10, { width: width - 120, align: 'center' });
  doc.font(koreanFont).fontSize(11).fillColor('#6b7280');
  doc.text(`${yf.animal}띠해`, 60, y + 48, { width: width - 120, align: 'center' });
  y += 80;

  // Summary
  doc.font(koreanFont).fontSize(11).fillColor('#374151');
  doc.text(yf.summary, 60, y, { width: width - 120, lineGap: 8 });
}

function renderMonthFortunePage(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;

  drawSectionHeader(doc, '12개월 월운 분석', koreanBoldFont);

  let y = 160;
  const cellW = (width - 120) / 6;
  const cellH = 60;

  if (result.monthFortunes && result.monthFortunes.length > 0) {
    for (let row = 0; row < 2; row++) {
      const rowItems = result.monthFortunes.slice(row * 6, (row + 1) * 6);
      for (let i = 0; i < rowItems.length; i++) {
        const mf = rowItems[i];
        const cx = 60 + i * cellW;
        const color = ELEMENT_COLORS[mf.elementKo] || '#6b7280';

        doc.roundedRect(cx + 2, y, cellW - 4, cellH, 4).fill('#f8fafc');
        doc.font(koreanFont).fontSize(7).fillColor('#6b7280');
        doc.text(`${mf.month}월`, cx + 2, y + 4, { width: cellW - 4, align: 'center' });
        doc.font(koreanBoldFont).fontSize(11).fillColor(color);
        doc.text(`${mf.stemKo}${mf.branchKo}`, cx + 2, y + 16, { width: cellW - 4, align: 'center' });
        doc.font(koreanFont).fontSize(7).fillColor('#6b7280');
        doc.text(mf.tenGod, cx + 2, y + 32, { width: cellW - 4, align: 'center' });
        doc.font(koreanFont).fontSize(7).fillColor('#2563eb');
        doc.text(mf.twelveStage, cx + 2, y + 44, { width: cellW - 4, align: 'center' });
      }
      y += cellH + 8;
    }
  }
}

function renderRawDataPage(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;

  drawSectionHeader(doc, '원본 데이터', koreanBoldFont);

  let y = 150;

  // Four Pillars Data
  doc.font(koreanBoldFont).fontSize(12).fillColor('#1f2937');
  doc.text('사주 원국 데이터:', 60, y);
  y += 18;

  const { fourPillars, birthInfo } = result;
  const pillarsText = `
년주: ${fourPillars.year.heavenlyStem}${fourPillars.year.earthlyBranch} (${fourPillars.year.heavenlyStemKo} ${fourPillars.year.earthlyBranchKo})
월주: ${fourPillars.month.heavenlyStem}${fourPillars.month.earthlyBranch} (${fourPillars.month.heavenlyStemKo} ${fourPillars.month.earthlyBranchKo})
일주: ${fourPillars.day.heavenlyStem}${fourPillars.day.earthlyBranch} (${fourPillars.day.heavenlyStemKo} ${fourPillars.day.earthlyBranchKo})
시주: ${fourPillars.hour.heavenlyStem}${fourPillars.hour.earthlyBranch} (${fourPillars.hour.heavenlyStemKo} ${fourPillars.hour.earthlyBranchKo})
  `;

  doc.font(koreanFont).fontSize(9).fillColor('#374151');
  const textHeight1 = doc.heightOfString(pillarsText, { width: width - 120, lineGap: 6 });
  doc.text(pillarsText.trim(), 60, y, { width: width - 120, lineGap: 6 });
  y += textHeight1 + 20;

  // Element Distribution
  doc.font(koreanBoldFont).fontSize(12).fillColor('#1f2937');
  doc.text('오행 분포:', 60, y);
  y += 18;

  const elementText = `
목(木): ${result.elementDistribution.wood}
화(火): ${result.elementDistribution.fire}
토(土): ${result.elementDistribution.earth}
금(金): ${result.elementDistribution.metal}
수(水): ${result.elementDistribution.water}

용신: ${result.yongSin} | 기신: ${result.giSin}
  `;

  doc.font(koreanFont).fontSize(9).fillColor('#374151');
  const textHeight2 = doc.heightOfString(elementText, { width: width - 120, lineGap: 6 });
  doc.text(elementText.trim(), 60, y, { width: width - 120, lineGap: 6 });
  y += textHeight2 + 20;

  if (y > 700) { doc.addPage(); y = 80; drawSectionHeader(doc, '원본 데이터 (계속)', koreanBoldFont); y = 130; }

  // Fortune Text
  doc.font(koreanBoldFont).fontSize(12).fillColor('#1f2937');
  doc.text('운세 분석:', 60, y);
  y += 18;

  const fortuneText = `성격: ${result.fortune.personality}\n직업: ${result.fortune.career}\n재물: ${result.fortune.wealth}\n건강: ${result.fortune.health}\n애정: ${result.fortune.love}\n종합: ${result.fortune.overall}`;

  doc.font(koreanFont).fontSize(9).fillColor('#374151');
  doc.text(fortuneText, 60, y, { width: width - 120, lineGap: 6 });
}

// ─────────────────────────────────────────────
//  SHARED HELPERS
// ─────────────────────────────────────────────
function drawSectionHeader(doc: PDFKit.PDFDocument, title: string, koreanBoldFont: string) {
  const { width } = doc.page;

  // Top decorative line
  doc.rect(50, 50, width - 100, 2).fill('#2563eb');

  // Title
  doc.font(koreanBoldFont).fontSize(20).fillColor('#1f2937');
  doc.text(title, 0, 70, { align: 'center', width });
}
