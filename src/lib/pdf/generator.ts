import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import type { SajuResult } from '@/lib/saju/types';
import type { NarrativeResult } from '@/lib/ai';
import { generateSajuPdfFromHtml } from './html-to-pdf';

const FONTS_DIR = path.join(process.cwd(), 'fonts');
// NotoSansKR: 한글 + 한자(CJK) + 라틴 모두 지원
const FONT_REGULAR = path.join(FONTS_DIR, 'NotoSansKR-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'NotoSansKR-Bold.ttf');
// NanumGothic 폴백
const FONT_NANUM_REGULAR = path.join(FONTS_DIR, 'NanumGothic-Regular.ttf');
const FONT_NANUM_BOLD = path.join(FONTS_DIR, 'NanumGothic-Bold.ttf');

// 오행 색상 (forceteller.com 스타일 - 파스텔 톤)
const ELEMENT_COLORS: Record<string, string> = {
  '목': '#6ab06a', '화': '#e8786f', '토': '#c4a055', '금': '#8e8e8e', '수': '#4a90d9',
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
  // AI 내러티브가 실제 GPT 모델로 생성된 경우에만 Puppeteer HTML→PDF 시도
  const hasAiNarrative = options.narrative &&
    options.narrative.chapters.length > 0 &&
    options.narrative.model !== 'fallback-template' &&
    options.productCode !== 'saju-data';

  if (hasAiNarrative) {
    try {
      console.log('[PDF] AI 내러티브 감지 → Puppeteer HTML→PDF 시도...');
      const timeoutMs = 15000; // 15초 타임아웃
      const buffer = await Promise.race([
        generateSajuPdfFromHtml(result, options),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Puppeteer 타임아웃 (15초)')), timeoutMs)
        ),
      ]);
      console.log('[PDF] Puppeteer 성공:', buffer.length, 'bytes');
      return buffer;
    } catch (err) {
      console.warn('[PDF] Puppeteer 실패, PDFKit 폴백:', err instanceof Error ? err.message : err);
    }
  } else {
    console.log('[PDF] 레퍼런스 스타일 PDFKit 사용 (fallback 또는 데이터 상품)');
  }

  // ── PDFKit (sajulab.kr 동일 구조) ──
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
        margins: { top: 70, bottom: 70, left: 55, right: 55 },
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

      // Check font file existence - prefer NotoSansKR (한글+한자), fallback to NanumGothic
      let koreanFont = 'Helvetica';
      let koreanBoldFont = 'Helvetica-Bold';

      const notoRegularExists = fs.existsSync(FONT_REGULAR);
      const notoBoldExists = fs.existsSync(FONT_BOLD);
      const nanumRegularExists = fs.existsSync(FONT_NANUM_REGULAR);
      const nanumBoldExists = fs.existsSync(FONT_NANUM_BOLD);

      // Font diagnostic logging
      console.log(`[PDF] Font check: NotoSansKR-Regular=${notoRegularExists} (${notoRegularExists ? fs.statSync(FONT_REGULAR).size : 0}), Bold=${notoBoldExists} (${notoBoldExists ? fs.statSync(FONT_BOLD).size : 0})`);
      console.log(`[PDF] Font check: NanumGothic-Regular=${nanumRegularExists}, Bold=${nanumBoldExists}`);

      if (notoRegularExists && notoBoldExists) {
        try {
          doc.registerFont('Korean', FONT_REGULAR);
          doc.registerFont('KoreanBold', FONT_BOLD);
          koreanFont = 'Korean';
          koreanBoldFont = 'KoreanBold';
          console.log('[PDF] NotoSansKR 폰트 등록 성공 (한글+한자 지원)');
        } catch (err) {
          console.warn('[PDF] NotoSansKR 등록 실패, NanumGothic 시도:', err);
          if (nanumRegularExists && nanumBoldExists) {
            try {
              doc.registerFont('Korean', FONT_NANUM_REGULAR);
              doc.registerFont('KoreanBold', FONT_NANUM_BOLD);
              koreanFont = 'Korean';
              koreanBoldFont = 'KoreanBold';
            } catch (err2) {
              console.warn('[PDF] NanumGothic도 실패, Helvetica 사용:', err2);
            }
          }
        }
      } else if (nanumRegularExists && nanumBoldExists) {
        try {
          doc.registerFont('Korean', FONT_NANUM_REGULAR);
          doc.registerFont('KoreanBold', FONT_NANUM_BOLD);
          koreanFont = 'Korean';
          koreanBoldFont = 'KoreanBold';
          console.log('[PDF] NanumGothic 폰트 등록 (한자 미지원)');
        } catch (err) {
          console.warn('[PDF] 폰트 등록 실패, Helvetica 사용:', err);
        }
      } else {
        console.warn(`[PDF] 폰트 파일 없음. Helvetica 사용.`);
      }

      // AI(GPT) 내러티브가 있으면 AI 기반 PDF, 없으면 sajulab.kr 동일 구조
      const useAiNarrative = options.narrative &&
        options.narrative.chapters.length > 0 &&
        options.narrative.model !== 'fallback-template' &&
        options.productCode !== 'saju-data';

      if (useAiNarrative) {
        generateNarrativePdf(doc, result, options, koreanFont, koreanBoldFont);
      } else {
        // sajulab.kr 동일 구조 (레퍼런스 스타일)
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
  const isNewYear = options.productCode === 'saju-newyear';
  const isPremium = options.productCode === 'saju-premium';

  // sajulab.kr 동일 구조: 표지 → 인사말 → 목차 → 사주원국표 → 오행분포도 → 십신분포 → 본문

  // 1. 표지
  renderNarrativeCoverPage(doc, result, options, koreanFont, koreanBoldFont);

  // 2. 인사말 페이지 (큰 폰트, 넓은 줄간격)
  doc.addPage();
  renderGreetingPageLarge(doc, options.customerName, narrative.greeting, koreanFont, koreanBoldFont);

  // 3. 목차
  doc.addPage();
  renderNarrativeTableOfContents(doc, narrative.chapters, koreanFont, koreanBoldFont);

  // 4. 사주원국표
  doc.addPage();
  renderFourPillars(doc, result, koreanFont, koreanBoldFont);

  // 5. 오행분포도
  doc.addPage();
  renderElementDistribution(doc, result, koreanFont, koreanBoldFont);

  // 6. 십신 분포 페이지
  doc.addPage();
  renderTenGodDistribution(doc, result, koreanFont, koreanBoldFont);

  // 7. 각 챕터별 내러티브 (챕터 타이틀 페이지 + 본문)
  const isBasic = options.productCode === 'saju-basic';
  for (const chapter of narrative.chapters) {
    // 기본분석은 챕터 타이틀 페이지 생략 (sajulab.kr 동일)
    if (!isBasic) {
      doc.addPage();
      renderChapterTitlePage(doc, chapter, koreanFont, koreanBoldFont);
    }
    // 챕터 본문 (큰 폰트, 넓은 줄간격)
    doc.addPage();
    renderNarrativeChapterLarge(doc, chapter, koreanFont, koreanBoldFont);
  }
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

  // 하단 날짜 제거됨
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

      doc.font(koreanBoldFont).fontSize(14).fillColor('#6b3a3a');
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

// ─── 큰 폰트 인사말 페이지 (레퍼런스 스타일 ~16pt) ───

function renderGreetingPageLarge(
  doc: PDFKit.PDFDocument,
  customerName: string,
  greeting: string,
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const margin = 60;
  const contentWidth = width - margin * 2;

  // 타이틀
  doc.font(koreanBoldFont).fontSize(22).fillColor('#d4af37');
  doc.text(`${customerName}님께`, 0, 80, { align: 'center', width });

  // 장식선
  doc.rect(width / 2 - 25, 112, 50, 2).fill('#d4af37');

  // 인사말 본문 (적절한 크기)
  let y = 135;
  const paragraphs = greeting.split('\n').filter(p => p.trim());

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    doc.font(koreanFont).fontSize(11).fillColor('#374151');
    const h = doc.heightOfString(trimmed, { width: contentWidth, lineGap: 8 });
    if (y + h > 720) { doc.addPage(); y = 80; }
    doc.text(trimmed, margin, y, { width: contentWidth, lineGap: 8 });
    y += h + 12;
  }

  // 서명
  doc.font(koreanFont).fontSize(10).fillColor('#6b7280');
  doc.text('운명길잡이 드림', 0, y + 10, { align: 'right', width: width - margin });
}

// ─── 챕터 타이틀 페이지 (어두운 배경) ───

function renderChapterTitlePage(
  doc: PDFKit.PDFDocument,
  chapter: { number: string; title: string },
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width, height } = doc.page;

  // 어두운 배경
  doc.rect(0, 0, width, height).fill('#1e293b');

  // 상단 장식선
  doc.rect(width / 2 - 40, height / 2 - 100, 80, 2).fill('#d4af37');

  // CHAPTER 번호
  doc.font(koreanFont).fontSize(12).fillColor('#94a3b8');
  doc.text(`CHAPTER ${chapter.number}`, 0, height / 2 - 70, { align: 'center', width });

  // 챕터 타이틀
  doc.font(koreanBoldFont).fontSize(30).fillColor('#ffffff');
  doc.text(chapter.title, 60, height / 2 - 35, { align: 'center', width: width - 120 });

  // 영문 서브타이틀
  doc.font(koreanFont).fontSize(11).fillColor('#94a3b8');
  doc.text(chapterTitleToEnglish(chapter.title), 0, height / 2 + 25, { align: 'center', width });

  // 하단 장식선
  doc.rect(width / 2 - 40, height / 2 + 55, 80, 2).fill('#d4af37');
}

// ─── 큰 폰트 챕터 내러티브 렌더링 (16pt, 줄간격 2.0) ───

function renderNarrativeChapterLarge(
  doc: PDFKit.PDFDocument,
  chapter: { number: string; title: string; content: string },
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const margin = 70;
  const contentWidth = width - margin * 2;
  const fontSize = 14;      // sajulab.kr 기준 ~14pt
  const lineGap = 22;       // sajulab.kr 기준 ~2x 행간 (더 넓게)
  const pageBottom = 700;

  // 상단 헤더 바
  doc.rect(0, 35, width, 2).fill('#d4af37');

  // 챕터 번호 + 타이틀 (본문 시작 전)
  doc.font(koreanFont).fontSize(9).fillColor('#9ca3af');
  doc.text(`CHAPTER ${chapter.number}`, margin, 55);
  doc.font(koreanBoldFont).fontSize(20).fillColor('#1f2937');
  doc.text(chapter.title, margin, 75);
  doc.moveTo(margin, 105).lineTo(width - margin, 105).strokeColor('#e5e7eb').lineWidth(1).stroke();

  let y = 130;

  const paragraphs = chapter.content.split('\n');

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      y += 18;
      continue;
    }

    // 소제목 감지
    const isSubheading = trimmed.startsWith('[') && trimmed.endsWith(']');
    const isBoldLine = trimmed.startsWith('■') || trimmed.startsWith('●') || trimmed.startsWith('▶') || trimmed.startsWith('★') || trimmed.startsWith('◆');
    const isMonthHeader = /^\d{1,2}월/.test(trimmed) || /^[0-9]+월\s/.test(trimmed);

    if (isSubheading) {
      y += 24;
      if (y > pageBottom) { doc.addPage(); y = 70; }
      doc.font(koreanBoldFont).fontSize(15).fillColor('#6b3a3a');
      const subTitle = trimmed.replace(/[\[\]]/g, '');
      const h = doc.heightOfString(subTitle, { width: contentWidth, lineGap: 8 });
      doc.text(subTitle, margin, y, { width: contentWidth, lineGap: 8 });
      y += h + 14;
    } else if (isMonthHeader) {
      y += 20;
      if (y > pageBottom) { doc.addPage(); y = 70; }
      // 월별 헤더 강조
      doc.roundedRect(margin - 5, y - 5, contentWidth + 10, 30, 4).fill('#f5f0eb');
      doc.font(koreanBoldFont).fontSize(13).fillColor('#5c3a2e');
      doc.text(trimmed.split(/[:\-–]/).shift()?.trim() || trimmed, margin, y + 4, { width: contentWidth });
      y += 42;
      // 월별 본문
      const rest = trimmed.replace(/^[^\:\-–]+[\:\-–]\s*/, '');
      if (rest && rest !== trimmed) {
        doc.font(koreanFont).fontSize(fontSize).fillColor('#374151');
        const rh = doc.heightOfString(rest, { width: contentWidth, lineGap });
        if (y + rh > pageBottom) { doc.addPage(); y = 70; }
        doc.text(rest, margin, y, { width: contentWidth, lineGap });
        y += rh + 18;
      }
    } else if (isBoldLine) {
      y += 12;
      if (y > pageBottom) { doc.addPage(); y = 70; }
      doc.font(koreanBoldFont).fontSize(12).fillColor('#374151');
      const h = doc.heightOfString(trimmed, { width: contentWidth, lineGap: 10 });
      doc.text(trimmed, margin, y, { width: contentWidth, lineGap: 10 });
      y += h + 12;
    } else {
      // 일반 본문 (큰 폰트 + 넓은 줄간격)
      if (y > pageBottom) { doc.addPage(); y = 70; }

      doc.font(koreanFont).fontSize(fontSize).fillColor('#374151');
      const textHeight = doc.heightOfString(trimmed, { width: contentWidth, lineGap });

      if (y + textHeight > pageBottom) {
        // 긴 텍스트 - 문장 단위로 분할
        const sentences = trimmed.match(/[^.!?。]+[.!?。]?\s*/g) || [trimmed];
        let currentText = '';

        for (const sentence of sentences) {
          const test = currentText + sentence;
          const testH = doc.heightOfString(test, { width: contentWidth, lineGap });

          if (y + testH > pageBottom && currentText) {
            doc.text(currentText.trim(), margin, y, { width: contentWidth, lineGap });
            doc.addPage();
            y = 70;
            currentText = sentence;
          } else {
            currentText = test;
          }
        }

        if (currentText.trim()) {
          const h = doc.heightOfString(currentText.trim(), { width: contentWidth, lineGap });
          doc.text(currentText.trim(), margin, y, { width: contentWidth, lineGap });
          y += h + 20;
        }
      } else {
        doc.text(trimmed, margin, y, { width: contentWidth, lineGap });
        y += textHeight + 20;
      }
    }
  }
}

// ─── 5대 운세 점수 차트 (레퍼런스 스타일) ───

function renderFortuneScoreChart(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  options: PdfOptions,
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const margin = 50;
  const contentW = width - margin * 2;
  const year = new Date().getFullYear();

  // ─── 버건디 헤더 (sajulab.kr 스타일) ───
  doc.rect(0, 0, width, 145).fill('#5c2626');

  // 연도 배지
  doc.roundedRect(width / 2 - 65, 22, 130, 28, 14).strokeColor('#d4af37').lineWidth(1).stroke();
  doc.font(koreanBoldFont).fontSize(11).fillColor('#d4af37');
  doc.text(`${year} 병오년`, 0, 28, { align: 'center', width });

  doc.font(koreanBoldFont).fontSize(24).fillColor('#ffffff');
  doc.text('신 년 운 세', 0, 60, { align: 'center', width });

  // 이름 박스
  doc.roundedRect(width / 2 - 55, 95, 110, 28, 4).strokeColor('#ffffff').lineWidth(1).stroke();
  doc.font(koreanBoldFont).fontSize(14).fillColor('#ffffff');
  doc.text(options.customerName, 0, 100, { align: 'center', width });
  doc.font(koreanFont).fontSize(10).fillColor('#d4af37');
  doc.text('님의 한 해 운세', width / 2 + 60, 103);

  // ─── 5대 운세 카드 (흰색 박스) ───
  let y = 165;
  doc.roundedRect(margin, y, contentW, 330, 8).fill('#ffffff');
  doc.roundedRect(margin, y, contentW, 330, 8).strokeColor('#e8e5de').stroke();

  doc.font(koreanBoldFont).fontSize(16).fillColor('#1f2937');
  doc.text(`${year}년 5대 운세`, margin + 20, y + 16);
  doc.font(koreanFont).fontSize(9).fillColor('#9ca3af');
  doc.text('원국 십신 분포 + 용신/기신 보정 기준', margin + 20, y + 38);

  const scores = calculateFortuneScores(result);
  const categories = [
    { label: '재물운', sub: '재성 분포', score: scores.wealth, color: '#c4a055' },
    { label: '직업운', sub: '관성 분포', score: scores.career, color: '#c47d5e' },
    { label: '연애운', sub: '식상 분포', score: scores.love, color: '#a85d45' },
    { label: '건강운', sub: '비겁 분포', score: scores.health, color: '#5a7a6b' },
    { label: '대인운', sub: '인성 분포', score: scores.social, color: '#7a6855' },
  ];

  let barY = y + 60;
  const barLeft = margin + 95;
  const barMaxW = contentW - 200;

  for (const cat of categories) {
    const grade = cat.score >= 90 ? '최상' : cat.score >= 70 ? '상' : cat.score >= 55 ? '중상' : cat.score >= 40 ? '중' : '중하';
    const barW = (cat.score / 100) * barMaxW;

    // 라벨
    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text(cat.label, margin + 20, barY + 2);
    doc.font(koreanFont).fontSize(8).fillColor('#9ca3af');
    doc.text(cat.sub, margin + 20, barY + 18);

    // 바 배경
    doc.roundedRect(barLeft, barY + 2, barMaxW, 22, 11).fill('#e8e5de');
    // 바 채움
    if (barW > 0) {
      doc.roundedRect(barLeft, barY + 2, Math.max(barW, 22), 22, 11).fill(cat.color);
    }

    // 점수 + 등급
    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text(`${cat.score}점`, barLeft + barMaxW + 10, barY + 2);
    doc.font(koreanBoldFont).fontSize(11).fillColor(cat.color);
    doc.text(grade, barLeft + barMaxW + 50, barY + 4);

    barY += 48;
  }

  // ─── 하단 종합/최고/주력/보완 박스 (sajulab.kr 스타일) ───
  const totalScore = Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length);
  const bestCat = categories.reduce((a, b) => a.score > b.score ? a : b);
  const worstCat = categories.reduce((a, b) => a.score < b.score ? a : b);

  const boxY = y + 340;
  const boxW = (contentW - 24) / 4;

  // 종합 (버건디 배경)
  doc.roundedRect(margin, boxY, boxW, 65, 6).fill('#5c2626');
  doc.font(koreanFont).fontSize(8).fillColor('#d4af37');
  doc.text('종합', margin, boxY + 8, { width: boxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(24).fillColor('#ffffff');
  doc.text(`${totalScore}`, margin, boxY + 24, { width: boxW - 18, align: 'center' });
  doc.font(koreanFont).fontSize(12).fillColor('#ffffff');
  doc.text('점', margin + boxW / 2 + 14, boxY + 32);

  // 최고
  doc.roundedRect(margin + boxW + 8, boxY, boxW, 65, 6).fill('#f8f7f4');
  doc.roundedRect(margin + boxW + 8, boxY, boxW, 65, 6).strokeColor('#e8e5de').stroke();
  doc.font(koreanFont).fontSize(8).fillColor('#9ca3af');
  doc.text('최고', margin + boxW + 8, boxY + 8, { width: boxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
  doc.text(bestCat.label, margin + boxW + 8, boxY + 24, { width: boxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(12).fillColor(bestCat.color);
  doc.text(`${bestCat.score}점`, margin + boxW + 8, boxY + 44, { width: boxW, align: 'center' });

  // 주력
  const secondBest = categories.filter(c => c !== bestCat).reduce((a, b) => a.score > b.score ? a : b);
  doc.roundedRect(margin + (boxW + 8) * 2, boxY, boxW, 65, 6).fill('#f8f7f4');
  doc.roundedRect(margin + (boxW + 8) * 2, boxY, boxW, 65, 6).strokeColor('#e8e5de').stroke();
  doc.font(koreanFont).fontSize(8).fillColor('#9ca3af');
  doc.text('주력', margin + (boxW + 8) * 2, boxY + 8, { width: boxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
  doc.text(secondBest.label, margin + (boxW + 8) * 2, boxY + 24, { width: boxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(12).fillColor(secondBest.color);
  doc.text(`${secondBest.score}점`, margin + (boxW + 8) * 2, boxY + 44, { width: boxW, align: 'center' });

  // 보완
  doc.roundedRect(margin + (boxW + 8) * 3, boxY, boxW, 65, 6).fill('#f8f7f4');
  doc.roundedRect(margin + (boxW + 8) * 3, boxY, boxW, 65, 6).strokeColor('#e8e5de').stroke();
  doc.font(koreanFont).fontSize(8).fillColor('#9ca3af');
  doc.text('보완', margin + (boxW + 8) * 3, boxY + 8, { width: boxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
  doc.text(worstCat.label, margin + (boxW + 8) * 3, boxY + 24, { width: boxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(12).fillColor(worstCat.color);
  doc.text(`${worstCat.score}점`, margin + (boxW + 8) * 3, boxY + 44, { width: boxW, align: 'center' });
}

// ─── 십신(十神) 분포 페이지 ───

function renderTenGodDistribution(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const { tenGods } = result;
  const margin = 50;
  const contentW = width - margin * 2;

  // ─── 헤더 (sajulab.kr 스타일) ───
  doc.font(koreanBoldFont).fontSize(22).fillColor('#1f2937');
  doc.text('십신(十神) 분포', 0, 50, { align: 'center', width });
  doc.font(koreanFont).fontSize(10).fillColor('#9ca3af');
  doc.text('TEN GODS DISTRIBUTION', 0, 78, { align: 'center', width });

  // ─── 설명 박스 ───
  let y = 105;
  doc.roundedRect(margin, y, contentW, 55, 8).fill('#f8f7f4');
  doc.roundedRect(margin, y, contentW, 55, 8).strokeColor('#e8e5de').stroke();
  doc.font(koreanFont).fontSize(9.5).fillColor('#6b7280');
  doc.text(
    '귀하의 사주 원국에 나타난 오행의 기운을 분석한 결과입니다. 이 데이터는 타고난 기질의 강약을 나타내며, 그래프의 채워진 정도는 해당 성분의 영향력을 의미합니다.',
    margin + 16, y + 16, { width: contentW - 32, lineGap: 5 }
  );

  // ─── 5대 십신 그룹 카드 (forceteller 스타일) ───
  const groups = [
    { icon: '比', name: '비겁 (비견·겁재)', desc: '자아의 힘, 독립심, 경쟁에서의 주체성을 의미합니다.', color: '#6ab06a' },
    { icon: '食', name: '식상 (식신·상관)', desc: '창의적인 표현력, 언변, 재능 발휘를 상징합니다.', color: '#e8786f' },
    { icon: '財', name: '재성 (편재·정재)', desc: '현실적인 감각, 목표 달성 능력, 재물을 의미합니다.', color: '#c4a055' },
    { icon: '官', name: '관성 (편관·정관)', desc: '사회적 책임, 명예, 조직 내의 규율을 의미합니다.', color: '#8e8e8e' },
    { icon: '印', name: '인성 (편인·정인)', desc: '지혜, 학문적 성취, 문서운, 수용 능력을 상징합니다.', color: '#4a90d9' },
  ];

  // 각 그룹의 개수 계산 (천간 십신 사용)
  const allTGs: string[] = [tenGods.year, tenGods.month, tenGods.hour];

  const groupCounts = [
    allTGs.filter(t => t && (t.includes('비견') || t.includes('겁재'))).length,
    allTGs.filter(t => t && (t.includes('식신') || t.includes('상관'))).length,
    allTGs.filter(t => t && (t.includes('편재') || t.includes('정재'))).length,
    allTGs.filter(t => t && (t.includes('편관') || t.includes('정관'))).length,
    allTGs.filter(t => t && (t.includes('편인') || t.includes('정인'))).length,
  ];

  y = 178;
  const cardH = 80;

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const count = groupCounts[i];
    const cardY = y + i * (cardH + 10);

    if (cardY > 720) { doc.addPage(); y = 60 - i * (cardH + 10); }

    // 카드 배경
    doc.roundedRect(margin, cardY, contentW, cardH, 8).fill('#ffffff');
    doc.roundedRect(margin, cardY, contentW, cardH, 8).strokeColor('#e8e5de').stroke();

    // 한자 원형 아이콘 (큰 사이즈)
    doc.circle(margin + 35, cardY + cardH / 2, 22).strokeColor(g.color).lineWidth(2).stroke();
    doc.font(koreanBoldFont).fontSize(20).fillColor(g.color);
    const iconTextY = cardY + cardH / 2 - 20 * 0.45;
    doc.text(g.icon, margin + 15, iconTextY, { width: 40, align: 'center' });

    // 이름 + 설명
    doc.font(koreanBoldFont).fontSize(14).fillColor('#1f2937');
    doc.text(g.name, margin + 72, cardY + 16, { width: contentW - 150 });
    doc.font(koreanFont).fontSize(9.5).fillColor('#6b7280');
    doc.text(g.desc, margin + 72, cardY + 38, { width: contentW - 150, lineGap: 3 });

    // 개수 (오른쪽, 크게)
    doc.font(koreanBoldFont).fontSize(28).fillColor(g.color);
    doc.text(`${count}`, margin + contentW - 60, cardY + 16, { width: 44, align: 'right' });
    doc.font(koreanFont).fontSize(11).fillColor('#6b7280');
    doc.text('개', margin + contentW - 14, cardY + 26);
  }
}

// ─── 분석 안내 페이지 ───

function renderAnalysisGuidePage(
  doc: PDFKit.PDFDocument,
  options: PdfOptions,
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const margin = 60;
  const contentWidth = width - margin * 2;

  // 헤더
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  doc.text('ANALYSIS GUIDE', margin, 60);

  doc.font(koreanBoldFont).fontSize(20).fillColor('#1f2937');
  doc.text('사주 분석 안내', margin, 78);

  doc.rect(margin, 108, 40, 2.5).fill('#d4af37');
  doc.moveTo(margin, 118).lineTo(width - margin, 118).strokeColor('#e5e7eb').lineWidth(1).stroke();

  let y = 135;
  const guideItems = [
    {
      title: '사주팔자란?',
      content: '사주팔자는 태어난 해, 달, 날, 시간을 네 개의 기둥(四柱)과 여덟 개의 글자(八字)로 나타낸 것입니다. 이 여덟 글자에는 당신의 타고난 성격, 재능, 인연, 그리고 인생의 흐름이 담겨 있습니다.',
    },
    {
      title: '용신(用神)이란?',
      content: '용신은 사주에서 가장 필요로 하는 오행의 기운을 말합니다. 용신의 기운을 잘 활용하면 운을 더욱 좋은 방향으로 이끌 수 있으며, 일상에서 용신에 해당하는 색상, 방향, 숫자 등을 활용하면 개운 효과를 기대할 수 있습니다.',
    },
    {
      title: '오행(五行)의 의미',
      content: '오행은 목(木), 화(火), 토(土), 금(金), 수(水)의 다섯 가지 원소입니다. 이 다섯 기운은 서로 돕고(상생) 억제하는(상극) 관계를 가지며, 사주 안에서 오행의 분포와 관계가 성격과 운명을 결정짓는 핵심 요인입니다.',
    },
    {
      title: '대운(大運)과 세운(歲運)',
      content: '대운은 10년 단위로 바뀌는 큰 운의 흐름이고, 세운은 해마다 바뀌는 한 해의 운입니다. 이 두 가지를 함께 보면 더 정확한 시기별 운세 판단이 가능합니다.',
    },
    {
      title: '이 분석서 활용법',
      content: '이 분석서는 타고난 성향부터 재물운, 직업운, 연애운, 건강운까지 다각도로 분석한 결과입니다. 운명은 알고 대비하면 더 좋은 방향으로 바꿀 수 있습니다.',
    },
  ];

  for (const item of guideItems) {
    if (y > 660) { doc.addPage(); y = 60; }

    // 제목
    doc.font(koreanBoldFont).fontSize(11).fillColor('#5c3a2e');
    doc.text(item.title, margin, y);
    y += 18;

    // 내용
    doc.font(koreanFont).fontSize(9.5).fillColor('#374151');
    const h = doc.heightOfString(item.content, { width: contentWidth, lineGap: 5 });
    doc.text(item.content, margin, y, { width: contentWidth, lineGap: 5 });
    y += h + 16;
  }
}

// ─── 사주원국 해설 페이지 ───

function renderFourPillarsExplanation(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const margin = 80;
  const contentWidth = width - margin * 2;
  const { fourPillars, yongSin, elementDistribution } = result;

  // 헤더
  doc.font(koreanFont).fontSize(10).fillColor('#6b7280');
  doc.text('FOUR PILLARS INTERPRETATION', margin, 70);

  doc.font(koreanBoldFont).fontSize(24).fillColor('#1f2937');
  doc.text('사주원국 해설', margin, 95);

  doc.rect(margin, 130, 50, 3).fill('#d4af37');

  let y = 160;

  // 일간 해설
  const dayElement = fourPillars.day.elementKo;
  const dayStem = fourPillars.day.heavenlyStemKo;

  doc.font(koreanBoldFont).fontSize(14).fillColor('#5c3a2e');
  doc.text(`일간: ${dayStem} (${dayElement}의 기운)`, margin, y);
  y += 22;

  const dayExplanation = `당신의 일간은 ${dayStem}으로, ${dayElement}의 기운을 타고났습니다. 일간은 사주의 주인공으로서 당신 자신을 나타내는 핵심 글자입니다. ${dayElement}의 성질에 따라 기본적인 성격과 가치관, 행동 양식이 결정됩니다.`;
  doc.font(koreanFont).fontSize(12).fillColor('#374151');
  const dh = doc.heightOfString(dayExplanation, { width: contentWidth, lineGap: 8 });
  doc.text(dayExplanation, margin, y, { width: contentWidth, lineGap: 8 });
  y += dh + 16;

  // 용신 해설
  if (y > 500) { doc.addPage(); y = 80; }
  doc.font(koreanBoldFont).fontSize(14).fillColor('#5c3a2e');
  doc.text(`용신: ${yongSin}`, margin, y);
  y += 22;

  const yongSinExplanation = `당신의 용신은 ${yongSin}입니다. 용신은 사주에서 가장 필요로 하는 기운으로, 이 기운을 보충하면 운이 상승합니다. 일상에서 ${yongSin}에 해당하는 색상, 방향, 직업 등을 가까이하면 좋은 효과를 볼 수 있습니다.`;
  doc.font(koreanFont).fontSize(12).fillColor('#374151');
  const yh = doc.heightOfString(yongSinExplanation, { width: contentWidth, lineGap: 8 });
  doc.text(yongSinExplanation, margin, y, { width: contentWidth, lineGap: 8 });
  y += yh + 16;

  // 오행 분포 해설
  if (y > 500) { doc.addPage(); y = 80; }
  doc.font(koreanBoldFont).fontSize(14).fillColor('#5c3a2e');
  doc.text('오행 분포 분석', margin, y);
  y += 22;

  const elements = [
    { name: '목(木)', count: elementDistribution.wood, desc: '성장, 창의력, 인내' },
    { name: '화(火)', count: elementDistribution.fire, desc: '열정, 예의, 표현력' },
    { name: '토(土)', count: elementDistribution.earth, desc: '안정, 신뢰, 중재' },
    { name: '금(金)', count: elementDistribution.metal, desc: '결단, 정의, 의리' },
    { name: '수(水)', count: elementDistribution.water, desc: '지혜, 유연, 소통' },
  ];

  for (const el of elements) {
    if (y > 600) { doc.addPage(); y = 80; }
    doc.font(koreanBoldFont).fontSize(11).fillColor('#374151');
    doc.text(`${el.name} ${el.count}개 - ${el.desc}`, margin + 10, y);
    y += 16;
  }
}

// ─── 운세 점수 해설 페이지 ───

function renderFortuneScoreExplanation(
  doc: PDFKit.PDFDocument,
  result: SajuResult,
  options: PdfOptions,
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const margin = 80;
  const contentWidth = width - margin * 2;
  const scores = calculateFortuneScores(result);
  const year = new Date().getFullYear();

  doc.font(koreanFont).fontSize(10).fillColor('#6b7280');
  doc.text('FORTUNE SCORE DETAILS', margin, 70);

  doc.font(koreanBoldFont).fontSize(24).fillColor('#1f2937');
  doc.text(`${year}년 운세 점수 해설`, margin, 95);

  doc.rect(margin, 130, 50, 3).fill('#d4af37');

  let y = 165;

  const details = [
    { label: '재물운', score: scores.wealth, color: '#c4a055',
      high: '올해 재물 운이 좋은 편입니다. 투자나 재테크에 좋은 기회가 올 수 있으며, 안정적인 수입이 기대됩니다. 다만 과도한 지출은 삼가고, 계획적인 자산 관리를 하시는 것이 좋겠습니다.',
      low: '올해 재물 운에 다소 주의가 필요합니다. 큰 투자나 보증은 피하시고, 안정적인 저축 위주의 재정 관리를 추천드립니다. 용신의 기운을 활용하면 재물 운을 보강할 수 있습니다.' },
    { label: '직업운', score: scores.career, color: '#c47d5e',
      high: '직장이나 사업에서 좋은 성과를 기대할 수 있는 해입니다. 승진이나 이직의 기회가 올 수 있으며, 새로운 프로젝트에서 두각을 나타낼 수 있습니다.',
      low: '직업적으로 안정을 유지하는 것이 중요한 해입니다. 무리한 이직이나 사업 확장보다는 현재 위치에서 실력을 쌓는 데 집중하시기 바랍니다.' },
    { label: '연애운', score: scores.love, color: '#a85d45',
      high: '인연의 기운이 좋은 해입니다. 미혼이라면 좋은 만남이 기대되고, 기혼이라면 부부 관계가 더욱 돈독해질 수 있습니다.',
      low: '감정적인 갈등에 주의가 필요한 해입니다. 소통을 통해 오해를 풀고, 상대방을 이해하려는 노력이 필요합니다.' },
    { label: '건강운', score: scores.health, color: '#5a7a6b',
      high: '건강 상태가 비교적 양호한 해입니다. 규칙적인 운동과 균형 잡힌 식단을 유지하면 더욱 건강한 한 해를 보낼 수 있습니다.',
      low: '건강 관리에 특별히 신경을 써야 하는 해입니다. 과로를 피하고 충분한 휴식을 취하시기 바랍니다. 정기 검진도 추천드립니다.' },
    { label: '대인운', score: scores.social, color: '#7a6855',
      high: '대인관계가 원활한 해입니다. 귀인의 도움을 받을 수 있으며, 새로운 인맥이 좋은 기회를 가져다줄 수 있습니다.',
      low: '대인관계에서 신중함이 필요한 해입니다. 가까운 사람과의 갈등을 조심하고, 새로운 관계에서는 신뢰를 먼저 쌓으시기 바랍니다.' },
  ];

  for (const d of details) {
    if (y > 520) { doc.addPage(); y = 80; }

    // 라벨 + 점수
    doc.font(koreanBoldFont).fontSize(17).fillColor(d.color);
    doc.text(`${d.label}  ${d.score}점`, margin, y);
    y += 30;

    // 해설
    const text = d.score >= 60 ? d.high : d.low;
    doc.font(koreanFont).fontSize(15).fillColor('#374151');
    const h = doc.heightOfString(text, { width: contentWidth, lineGap: 18 });
    doc.text(text, margin, y, { width: contentWidth, lineGap: 18 });
    y += h + 28;
  }
}

// ─── 용어 해설 페이지 ───

function renderGlossaryPage(
  doc: PDFKit.PDFDocument,
  koreanFont: string,
  koreanBoldFont: string
) {
  const { width } = doc.page;
  const margin = 80;
  const contentWidth = width - margin * 2;

  doc.font(koreanFont).fontSize(10).fillColor('#6b7280');
  doc.text('GLOSSARY', margin, 70);

  doc.font(koreanBoldFont).fontSize(26).fillColor('#1f2937');
  doc.text('사주명리 용어 해설', margin, 95);

  doc.rect(margin, 132, 50, 3).fill('#d4af37');
  doc.moveTo(margin, 145).lineTo(width - margin, 145).strokeColor('#e5e7eb').lineWidth(1).stroke();

  let y = 175;

  const glossary = [
    { term: '천간(天干)', desc: '하늘의 기운을 나타내는 10개의 글자로, 갑(甲), 을(乙), 병(丙), 정(丁), 무(戊), 기(己), 경(庚), 신(辛), 임(壬), 계(癸)를 말합니다. 각각 목(木), 화(火), 토(土), 금(金), 수(水)의 음양 기운을 담고 있으며, 사주의 위쪽 글자들이 천간에 해당합니다.' },
    { term: '지지(地支)', desc: '땅의 기운을 나타내는 12개의 글자로, 자(子), 축(丑), 인(寅), 묘(卯), 진(辰), 사(巳), 오(午), 미(未), 신(申), 유(酉), 술(戌), 해(亥)를 말합니다. 12가지 동물(띠)과 연결되며, 계절과 시간의 흐름을 상징합니다. 사주의 아래쪽 글자들이 지지에 해당합니다.' },
    { term: '일간(日干)', desc: '생일의 천간으로, 사주의 주인공인 나를 나타냅니다. 일간의 오행과 음양에 따라 기본 성격과 기질이 결정되며, 모든 사주 분석의 출발점이 됩니다. 사주를 볼 때 가장 먼저 확인하는 핵심 글자입니다.' },
    { term: '용신(用神)', desc: '사주에서 가장 필요로 하는 오행의 기운입니다. 사주의 균형을 잡아주는 핵심 요소로, 용신의 기운이 들어오는 시기에 운이 좋아집니다. 용신에 해당하는 색상, 방향, 숫자를 활용하면 개운에 도움이 됩니다.' },
    { term: '대운(大運)', desc: '10년 단위로 바뀌는 인생의 큰 흐름입니다. 어떤 대운을 만나느냐에 따라 인생의 방향과 기회가 크게 달라질 수 있습니다. 대운은 월주(月柱)를 기준으로 순행 또는 역행하며 펼쳐집니다.' },
    { term: '세운(歲運)', desc: '한 해의 운을 결정하는 흐름으로, 매년 바뀌는 천간과 지지가 사주와 어떤 관계를 맺느냐에 따라 그 해의 길흉(吉凶)이 결정됩니다. 신년운세는 바로 이 세운을 분석한 결과입니다.' },
    { term: '상생(相生)', desc: '오행이 서로 돕는 관계입니다. 목(木)이 화(火)를 낳고, 화가 토(土)를 낳고, 토가 금(金)을 낳고, 금이 수(水)를 낳고, 수가 목을 낳는 순서로 순환합니다. 상생 관계에 있는 오행이 만나면 서로 힘을 북돋아 줍니다.' },
    { term: '상극(相剋)', desc: '오행이 서로 억제하는 관계입니다. 목(木)이 토(土)를 이기고, 토가 수(水)를 이기고, 수가 화(火)를 이기고, 화가 금(金)을 이기고, 금이 목을 이기는 순서로 순환합니다. 적절한 상극은 균형을 잡아주는 역할을 합니다.' },
    { term: '십신(十神)', desc: '일간을 기준으로 다른 글자들과의 관계를 나타내는 10가지 명칭입니다. 비견(比肩), 겁재(劫財), 식신(食神), 상관(傷官), 편재(偏財), 정재(正財), 편관(偏官), 정관(正官), 편인(偏印), 정인(正印)이 있으며, 각각 고유한 성격과 운명적 의미를 지닙니다.' },
    { term: '오행(五行)', desc: '목(木), 화(火), 토(土), 금(金), 수(水)의 다섯 가지 원소를 말합니다. 동양 철학에서 우주 만물을 구성하는 기본 요소로, 사주 안에서 이 다섯 가지 기운의 분포와 균형이 당신의 성격, 재능, 운명의 흐름을 결정짓는 핵심 요인입니다.' },
  ];

  for (const item of glossary) {
    if (y > 560) { doc.addPage(); y = 80; }

    doc.font(koreanBoldFont).fontSize(15).fillColor('#5c3a2e');
    doc.text(item.term, margin, y);
    y += 26;

    doc.font(koreanFont).fontSize(14).fillColor('#374151');
    const h = doc.heightOfString(item.desc, { width: contentWidth, lineGap: 14 });
    doc.text(item.desc, margin, y, { width: contentWidth, lineGap: 14 });
    y += h + 24;
  }
}

// ─── 운세 점수 산출 헬퍼 ───

function calculateFortuneScores(result: SajuResult): {
  wealth: number; career: number; love: number; health: number; social: number;
} {
  // 사주 데이터 기반으로 점수 산출 (용신/기신, 세운, 오행 균형 등 활용)
  const { elementDistribution, yongSin } = result;
  const total = elementDistribution.wood + elementDistribution.fire + elementDistribution.earth + elementDistribution.metal + elementDistribution.water;

  // 오행 균형도 (균형할수록 높은 기본 점수)
  const avg = total / 5;
  const variance = [elementDistribution.wood, elementDistribution.fire, elementDistribution.earth, elementDistribution.metal, elementDistribution.water]
    .reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / 5;
  const balanceScore = Math.max(30, 80 - variance * 10);

  // 세운 길흉도 (favorableRating은 -100 ~ +100 숫자)
  const rating = result.yearFortune?.favorableRating ?? 0;
  const yearBonus = rating >= 10 ? 15 : rating >= 0 ? 5 : -5;

  // 각 운세별 오행 관련성으로 점수 변동
  const yongSinMap: Record<string, string> = { '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water' };
  const yongSinElement = yongSinMap[yongSin] || 'wood';

  const base = Math.round(balanceScore + yearBonus);
  const rand = (seed: number) => ((seed * 9301 + 49297) % 233280) / 233280;

  return {
    wealth: Math.min(100, Math.max(20, base + Math.round((rand(elementDistribution.metal + elementDistribution.earth) - 0.5) * 30))),
    career: Math.min(100, Math.max(20, base + Math.round((rand(elementDistribution.wood + elementDistribution.fire) - 0.5) * 30))),
    love: Math.min(100, Math.max(20, base + Math.round((rand(elementDistribution.fire + elementDistribution.water) - 0.5) * 30))),
    health: Math.min(100, Math.max(20, base + Math.round((rand(elementDistribution.water + elementDistribution.earth) - 0.5) * 30))),
    social: Math.min(100, Math.max(20, base + Math.round((rand(elementDistribution.wood + elementDistribution.metal) - 0.5) * 30))),
  };
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
    { num: '01', label: '사주원국표', desc: '년주, 월주, 일주, 시주 분석' },
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
    doc.font(koreanBoldFont).fontSize(10).fillColor('#6b3a3a');
    const tocCircleY = y + 10 - 10 * 0.45;
    doc.text(item.num, leftX + 4, tocCircleY, { width: 24, align: 'center' });

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
//  HELPER: Text vertical centering for Korean fonts
// ─────────────────────────────────────────────
function getCenteredTextY(cellY: number, cellHeight: number, fontSize: number): number {
  return cellY + (cellHeight - fontSize) / 2 - fontSize * 0.15;
}

// ─────────────────────────────────────────────
//  FOUR PILLARS (사주원국표)
// ─────────────────────────────────────────────
function renderFourPillars(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width, height } = doc.page;
  const { fourPillars, tenGods, birthInfo } = result;
  const margin = 40;

  // ─── 헤더 ───
  doc.font(koreanBoldFont).fontSize(24).fillColor('#1f2937');
  doc.text('사주원국표', 0, 50, { align: 'center', width });
  doc.font(koreanFont).fontSize(9).fillColor('#9ca3af');
  doc.text('THE DESTINY CHART', 0, 78, { align: 'center', width });

  // ─── 이름 + 생년월일 상세정보 (포스텔러 스타일) ───
  doc.font(koreanBoldFont).fontSize(13).fillColor('#374151');
  doc.text(`${result.birthInfo.gender === 'male' ? '남' : '여'} ${birthInfo.year}년생`, 0, 95, { align: 'center', width });

  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  const birthMonth = String(birthInfo.month).padStart(2, '0');
  const birthDay = String(birthInfo.day).padStart(2, '0');
  doc.text(
    `양력 ${birthInfo.year}년 ${birthMonth}월 ${birthDay}일`,
    0, 112, { align: 'center', width }
  );

  // 출생시간 + 한국기준 -30분 반영 정보
  const hourBranch = fourPillars.hour.earthlyBranchKo;
  doc.text(`출생시 ${hourBranch}시 (${hourBranch}시 기준)`, 0, 126, { align: 'center', width });

  // 한국 표준시 기준 설명
  doc.font(koreanFont).fontSize(7.5).fillColor('#9ca3af');
  doc.text('※ 한국 표준시(KST) 기준, 진태양시 -30분 보정 반영', 0, 140, { align: 'center', width });

  // ─── 테이블 설정 (forceteller 스타일 - 전체 페이지를 가득 채우기) ───
  const tableX = margin;
  const tableW = width - margin * 2;
  const labelColW = 65;
  const colW = (tableW - labelColW) / 4;
  let ty = 158;

  const pillars = [
    { label: '시주', index: 0, pillar: fourPillars.hour, tenGod: tenGods.hour, life: '말년운/자녀운,결실' },
    { label: '일주', index: 1, pillar: fourPillars.day, tenGod: '일간(나)', life: '중년운/정체성,자아' },
    { label: '월주', index: 2, pillar: fourPillars.month, tenGod: tenGods.month, life: '청년운/부모,사회상' },
    { label: '년주', index: 3, pillar: fourPillars.year, tenGod: tenGods.year, life: '초년운/조상,시대상' },
  ];

  // 테이블 헤더 (구분)
  doc.rect(tableX, ty, tableW, 35).fill('#f3f0ed');
  doc.rect(tableX, ty, tableW, 35).strokeColor('#d1d5db').stroke();
  doc.font(koreanBoldFont).fontSize(11).fillColor('#374151');
  const headerY = getCenteredTextY(ty, 35, 11);
  doc.text('구분', tableX, headerY, { width: labelColW, align: 'center' });
  for (let i = 0; i < 4; i++) {
    doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
    doc.text(pillars[i].label, tableX + labelColW + i * colW, headerY, { width: colW, align: 'center' });
  }
  ty += 35;

  // 선택적: 개념 레이블 행 (운세 관련 설명)
  doc.rect(tableX, ty, tableW, 20).fill('#ffffff');
  doc.rect(tableX, ty, tableW, 20).strokeColor('#d1d5db').stroke();
  doc.font(koreanFont).fontSize(7).fillColor('#9ca3af');
  for (let i = 0; i < 4; i++) {
    doc.text(pillars[i].life, tableX + labelColW + i * colW, ty + 6, { width: colW - 4, align: 'center' });
  }
  ty += 20;

  // ─── 천간 행 ───
  const stemH = 100;
  doc.rect(tableX, ty, tableW, stemH).fill('#ffffff');
  doc.rect(tableX, ty, tableW, stemH).strokeColor('#d1d5db').stroke();
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  const stemLabelY = getCenteredTextY(ty, stemH, 9);
  doc.text('천간', tableX, stemLabelY, { width: labelColW, align: 'center' });

  for (let i = 0; i < 4; i++) {
    const p = pillars[i].pillar;
    const stemColor = ELEMENT_COLORS[p.elementKo] || '#374151';
    const cellX = tableX + labelColW + i * colW;

    // sajulab.kr 스타일: 한자만 크게 표시 (丙, 庚 등)
    const hanjaText = p.heavenlyStem;
    const hanjaFontSize = 36;

    const centerY = getCenteredTextY(ty, stemH, hanjaFontSize);

    doc.font(koreanBoldFont).fontSize(hanjaFontSize).fillColor(stemColor);
    doc.text(hanjaText, cellX, centerY, { width: colW, align: 'center', lineBreak: false });

    // 음양+오행 표시 (우측 하단)
    const isYang = p.yinYangKo === '양';
    const yinYangMark = isYang ? '+' : '-';
    doc.font(koreanFont).fontSize(9).fillColor(stemColor);
    doc.text(`${yinYangMark}${p.elementKo}`, cellX + colW - 28, ty + stemH - 14, { width: 24, align: 'center' });
  }
  ty += stemH;

  // ─── 천간 십성 행 ───
  const tenGodStemH = 45;
  doc.rect(tableX, ty, tableW, tenGodStemH).fill('#ffffff');
  doc.rect(tableX, ty, tableW, tenGodStemH).strokeColor('#d1d5db').stroke();
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  const tenGodStemY = getCenteredTextY(ty, tenGodStemH, 10);
  doc.text('십성', tableX, tenGodStemY, { width: labelColW, align: 'center' });
  for (let i = 0; i < 4; i++) {
    doc.font(koreanFont).fontSize(10).fillColor('#374151');
    doc.text(pillars[i].tenGod, tableX + labelColW + i * colW, tenGodStemY, { width: colW, align: 'center' });
  }
  ty += tenGodStemH;

  // ─── 지지 행 ───
  const branchH = 100;
  doc.rect(tableX, ty, tableW, branchH).fill('#ffffff');
  doc.rect(tableX, ty, tableW, branchH).strokeColor('#d1d5db').stroke();
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  const branchLabelY = getCenteredTextY(ty, branchH, 9);
  doc.text('지지', tableX, branchLabelY, { width: labelColW, align: 'center' });

  for (let i = 0; i < 4; i++) {
    const p = pillars[i].pillar;
    const branchColor = ELEMENT_COLORS[p.elementKo] || '#374151';
    const cellX = tableX + labelColW + i * colW;

    // sajulab.kr 스타일: 한자만 크게 표시 (子, 午 등)
    const hanjaText = p.earthlyBranch;
    const hanjaFontSize = 36;

    const centerY = getCenteredTextY(ty, branchH, hanjaFontSize);

    doc.font(koreanBoldFont).fontSize(hanjaFontSize).fillColor(branchColor);
    doc.text(hanjaText, cellX, centerY, { width: colW, align: 'center', lineBreak: false });

    // 음양+오행 표시 (우측 하단)
    const isYang = p.yinYangKo === '양';
    const yinYangMark = isYang ? '+' : '-';
    doc.font(koreanFont).fontSize(9).fillColor(branchColor);
    doc.text(`${yinYangMark}${p.elementKo}`, cellX + colW - 28, ty + branchH - 14, { width: 24, align: 'center' });
  }
  ty += branchH;

  // ─── 지지 십성 행 ───
  const tenGodBranchH = 45;
  doc.rect(tableX, ty, tableW, tenGodBranchH).fill('#ffffff');
  doc.rect(tableX, ty, tableW, tenGodBranchH).strokeColor('#d1d5db').stroke();
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  const tenGodBranchY = getCenteredTextY(ty, tenGodBranchH, 10);
  doc.text('십성', tableX, tenGodBranchY, { width: labelColW, align: 'center' });
  for (let i = 0; i < 4; i++) {
    let branchTenGod = '-';
    if (i === 0) branchTenGod = tenGods.hourBranch || '-';
    else if (i === 1) branchTenGod = tenGods.dayBranch || '-';
    else if (i === 2) branchTenGod = tenGods.monthBranch || '-';
    else if (i === 3) branchTenGod = tenGods.yearBranch || '-';
    doc.font(koreanFont).fontSize(10).fillColor('#374151');
    doc.text(branchTenGod, tableX + labelColW + i * colW, tenGodBranchY, { width: colW, align: 'center' });
  }
  ty += tenGodBranchH;

  // ─── 지장간 행 (hidden stems) ───
  if (result.hiddenStems) {
    const hiddenStemH = 60;
    doc.rect(tableX, ty, tableW, hiddenStemH).fill('#ffffff');
    doc.rect(tableX, ty, tableW, hiddenStemH).strokeColor('#d1d5db').stroke();
    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    const hiddenStemY = getCenteredTextY(ty, hiddenStemH, 9);
    doc.text('지장간', tableX, hiddenStemY, { width: labelColW, align: 'center' });

    const hiddenKey = ['hour', 'day', 'month', 'year'] as const;
    for (let i = 0; i < 4; i++) {
      const hidden = result.hiddenStems[hiddenKey[i]];
      let hiddenText = '';
      if (hidden.余) hiddenText += hidden.余;
      if (hidden.中) hiddenText += (hiddenText ? ',' : '') + hidden.中;
      if (hidden.正) hiddenText += (hiddenText ? ',' : '') + hidden.正;

      doc.font(koreanFont).fontSize(9).fillColor('#374151');
      doc.text(hiddenText || '-', tableX + labelColW + i * colW, hiddenStemY, { width: colW, align: 'center' });
    }
    ty += hiddenStemH;
  }

  // ─── 운성 행 ───
  const stageH = 45;
  doc.rect(tableX, ty, tableW, stageH).fill('#ffffff');
  doc.rect(tableX, ty, tableW, stageH).strokeColor('#d1d5db').stroke();
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  const stageY = getCenteredTextY(ty, stageH, 9);
  doc.text('운성', tableX, stageY, { width: labelColW, align: 'center' });
  for (let i = 0; i < 4; i++) {
    const keys = ['hour', 'day', 'month', 'year'] as const;
    const stageVal = result.twelveStages?.bong?.[keys[i]] || '-';
    doc.font(koreanFont).fontSize(10).fillColor('#374151');
    doc.text(stageVal, tableX + labelColW + i * colW, stageY, { width: colW, align: 'center' });
  }
  ty += stageH;

  // ─── 신살 행 ───
  const pillars_order = ['hour', 'day', 'month', 'year'] as const;
  let maxSinsalHeight = 45;
  for (let i = 0; i < 4; i++) {
    const currentPillar = pillars_order[i];
    const sinsalForPillar = result.sinsal?.filter(s => s.pillar === currentPillar).map(s => s.name) || [];
    const sinsalText = sinsalForPillar.length > 0 ? sinsalForPillar.join(',') : '-';
    doc.font(koreanFont).fontSize(9);
    const h = doc.heightOfString(sinsalText, { width: colW - 10, lineGap: 2 });
    maxSinsalHeight = Math.max(maxSinsalHeight, h + 18);
  }
  maxSinsalHeight = Math.min(maxSinsalHeight, 70);

  doc.rect(tableX, ty, tableW, maxSinsalHeight).fill('#ffffff');
  doc.rect(tableX, ty, tableW, maxSinsalHeight).strokeColor('#d1d5db').stroke();
  doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
  const sinsalY = getCenteredTextY(ty, maxSinsalHeight, 9);
  doc.text('신살', tableX, sinsalY, { width: labelColW, align: 'center' });
  for (let i = 0; i < 4; i++) {
    const currentPillar = pillars_order[i];
    const sinsalForPillar = result.sinsal?.filter(s => s.pillar === currentPillar).map(s => s.name) || [];
    const sinsalText = sinsalForPillar.length > 0 ? sinsalForPillar.join(',') : '-';
    doc.font(koreanFont).fontSize(9).fillColor('#374151');
    doc.text(sinsalText, tableX + labelColW + i * colW, sinsalY, { width: colW - 10, align: 'center', lineGap: 2 });
  }
  ty += maxSinsalHeight;

  // ─── 세로 구분선 그리기 ───
  const tableTop = 150;
  const tableBottom = ty;
  // 라벨 컬럼 구분선
  doc.moveTo(tableX + labelColW, tableTop).lineTo(tableX + labelColW, tableBottom).strokeColor('#d1d5db').lineWidth(0.5).stroke();
  for (let i = 1; i < 4; i++) {
    doc.moveTo(tableX + labelColW + i * colW, tableTop).lineTo(tableX + labelColW + i * colW, tableBottom).strokeColor('#d1d5db').lineWidth(0.5).stroke();
  }
  // 전체 외곽선
  doc.rect(tableX, tableTop, tableW, tableBottom - tableTop).strokeColor('#374151').lineWidth(1.5).stroke();

  // ─── 용신분석 박스 ───
  ty += 20;
  const boxH = 70;
  doc.roundedRect(tableX, ty, tableW, boxH, 8).fill('#f3f0ed');
  doc.roundedRect(tableX, ty, tableW, boxH, 8).strokeColor('#d1d5db').lineWidth(1).stroke();

  doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
  doc.text('용신분석', tableX + 16, ty + 12);
  doc.font(koreanFont).fontSize(8.5).fillColor('#6b7280');
  doc.text('오행의 조화와 균형', tableX + 16, ty + 30);

  // 용신/희신/기신/구신/한신 배지
  const ys = result.yongShinSystem;
  const gods = [
    { label: '용신', value: result.yongSin },
    { label: '희신', value: ys?.huiSin || '화' },
    { label: '기신', value: result.giSin },
    { label: '구신', value: ys?.guSin || '수' },
    { label: '한신', value: ys?.hanSin || '금' },
  ];
  const badgeStartX = tableX + 140;
  const badgeW = 58;
  for (let i = 0; i < gods.length; i++) {
    const bx = badgeStartX + i * (badgeW + 6);
    const g = gods[i];
    const elColor = ELEMENT_COLORS[g.value] || '#374151';
    doc.roundedRect(bx, ty + 12, badgeW, 48, 6).fill('#ffffff');
    doc.roundedRect(bx, ty + 12, badgeW, 48, 6).strokeColor('#d1d5db').stroke();
    doc.font(koreanFont).fontSize(7).fillColor('#9ca3af');
    doc.text(g.label, bx, ty + 16, { width: badgeW, align: 'center' });
    doc.font(koreanBoldFont).fontSize(18).fillColor(elColor);
    const badgeCenterY = getCenteredTextY(ty + 12, 48, 18);
    doc.text(ELEMENT_HANJA[g.value] || g.value, bx, badgeCenterY, { width: badgeW, align: 'center' });
  }
}

// ─────────────────────────────────────────────
//  ELEMENT DISTRIBUTION (오행분포)
// ─────────────────────────────────────────────
function renderElementDistribution(doc: PDFKit.PDFDocument, result: SajuResult, koreanFont: string, koreanBoldFont: string) {
  const { width } = doc.page;
  const { elementDistribution, yongSin, giSin } = result;
  const margin = 50;
  const contentW = width - margin * 2;

  // ─── 헤더 ───
  doc.font(koreanFont).fontSize(10).fillColor('#9ca3af');
  doc.text('음양오행', 0, 50, { align: 'center', width });
  doc.font(koreanBoldFont).fontSize(22).fillColor('#1f2937');
  doc.text('나를 구성하는 에너지의 균형', 0, 68, { align: 'center', width });

  // ─── 음양의 조화 박스 ───
  let y = 110;
  const yinYangBox = { x: margin, y, w: contentW, h: 65 };
  doc.roundedRect(yinYangBox.x, yinYangBox.y, yinYangBox.w, yinYangBox.h, 8).fill('#f8f7f4');
  doc.roundedRect(yinYangBox.x, yinYangBox.y, yinYangBox.w, yinYangBox.h, 8).strokeColor('#e8e5de').stroke();

  doc.font(koreanBoldFont).fontSize(11).fillColor('#374151');
  doc.text('음양의 조화', margin + 16, y + 10);

  // 음양 바
  const barY = y + 30;
  const barH = 24;
  const totalPillars = 8;
  // 사주 8자(천간4+지지4) 각각의 음양을 개별 계산
  const fp = result.fourPillars;
  const yangStems = ['甲', '丙', '戊', '庚', '壬']; // 양 천간
  const yangBranches = ['子', '寅', '辰', '午', '申', '戌']; // 양 지지
  let yangCount = 0;
  for (const p of [fp.year, fp.month, fp.day, fp.hour]) {
    if (yangStems.includes(p.heavenlyStem)) yangCount++;
    if (yangBranches.includes(p.earthlyBranch)) yangCount++;
  }
  const yinCount = totalPillars - yangCount;
  const yangPct = Math.round((yangCount / totalPillars) * 100);
  const yinPct = 100 - yangPct;
  const yangW = (yangPct / 100) * (contentW - 32);
  const yinW = (contentW - 32) - yangW;

  doc.roundedRect(margin + 16, barY, contentW - 32, barH, 12).fill('#e8e5de');
  if (yangW > 0) {
    doc.roundedRect(margin + 16, barY, yangW, barH, 12).fill('#c47d5e');
    doc.font(koreanBoldFont).fontSize(9).fillColor('#ffffff');
    doc.text(`양(陽) ${yangCount}개 (${yangPct}%)`, margin + 16, getCenteredTextY(barY, barH, 9), { width: yangW, align: 'center' });
  }
  if (yinW > 20) {
    doc.roundedRect(margin + 16 + yangW, barY, yinW, barH, 12).fill('#4a4a6a');
    doc.font(koreanBoldFont).fontSize(9).fillColor('#ffffff');
    doc.text(`음(陰) ${yinCount}개 (${yinPct}%)`, margin + 16 + yangW, getCenteredTextY(barY, barH, 9), { width: yinW, align: 'center' });
  }

  // ─── 오행 분포도 박스 ───
  y = 195;
  doc.roundedRect(margin, y, contentW, 310, 8).fill('#f8f7f4');
  doc.roundedRect(margin, y, contentW, 310, 8).strokeColor('#e8e5de').stroke();

  doc.font(koreanBoldFont).fontSize(11).fillColor('#374151');
  doc.text('오행 분포도', margin + 16, y + 14);

  const elements = [
    { label: '나무', hanja: '木', value: elementDistribution.wood, color: '#6ab06a' },
    { label: '불', hanja: '火', value: elementDistribution.fire, color: '#e8786f' },
    { label: '흙', hanja: '土', value: elementDistribution.earth, color: '#c4a055' },
    { label: '금', hanja: '金', value: elementDistribution.metal, color: '#8e8e8e' },
    { label: '물', hanja: '水', value: elementDistribution.water, color: '#4a90d9' },
  ];

  const totalElements = elements.reduce((s, e) => s + e.value, 0) || 1;
  const barLeft = margin + 120;
  const barMaxW = contentW - 190;
  let ey = y + 42;
  const rowH = 50;
  const circleR = 19;

  for (const el of elements) {
    const pct = Math.round((el.value / totalElements) * 100);
    const barW = (pct / 100) * barMaxW;
    const centerY = ey + rowH / 2;

    // 한자 원형 아이콘 - 컬러 배경 + 흰색 텍스트 (forceteller 스타일)
    doc.circle(margin + 38, centerY, circleR).fill(el.color);
    doc.font(koreanBoldFont).fontSize(17).fillColor('#ffffff');
    const circleTextY = centerY - 17 * 0.55;
    doc.text(el.hanja, margin + 38 - circleR, circleTextY, { width: circleR * 2, align: 'center' });

    // 한글 레이블
    doc.font(koreanFont).fontSize(13).fillColor('#374151');
    doc.text(el.label, margin + 64, centerY - 13 * 0.55, { width: 45 });

    // 바 배경 (둥근 끝)
    doc.roundedRect(barLeft, centerY - 13, barMaxW, 26, 13).fill('#e8e5de');

    // 바 채움
    if (barW > 0) {
      doc.roundedRect(barLeft, centerY - 13, Math.max(barW, 26), 26, 13).fill(el.color);
      // 퍼센트 텍스트 (바 안에)
      if (pct > 8) {
        doc.font(koreanBoldFont).fontSize(10).fillColor('#ffffff');
        const pctTextY = centerY - 10 * 0.55;
        doc.text(`${pct}%`, barLeft, pctTextY, { width: Math.max(barW, 26), align: 'center' });
      }
    } else {
      // 0%일 때도 텍스트 표시
      doc.font(koreanFont).fontSize(10).fillColor('#9ca3af');
      doc.text('0%', barLeft + 8, centerY - 6);
    }

    // 개수
    doc.font(koreanFont).fontSize(12).fillColor('#374151');
    doc.text(`${el.value}개`, barLeft + barMaxW + 14, centerY - 12 * 0.55);

    ey += rowH;
  }

  // ─── 음양이란 / 오행이란 설명 ───
  y = 520;
  const halfW = (contentW - 20) / 2;

  // 음양이란
  doc.circle(margin + 8, y + 8, 5).fill('#e8786f');
  doc.font(koreanBoldFont).fontSize(11).fillColor('#374151');
  doc.text('음양이란', margin + 20, y + 2);
  doc.font(koreanFont).fontSize(8.5).fillColor('#6b7280');
  doc.text(
    '세상 만물을 이루는 두 가지 상반된 기운입니다. 양(陽)은 빛, 발산, 활동적인 에너지를 의미하며, 음(陰)은 어둠, 수렴, 차분한 에너지를 뜻합니다.',
    margin + 5, y + 20, { width: halfW - 10, lineGap: 4 }
  );

  // 오행이란
  doc.circle(margin + halfW + 28, y + 8, 5).fill('#6ab06a');
  doc.font(koreanBoldFont).fontSize(11).fillColor('#374151');
  doc.text('오행이란', margin + halfW + 40, y + 2);
  doc.font(koreanFont).fontSize(8.5).fillColor('#6b7280');
  doc.text(
    '목화토금수 다섯 가지 기운의 분포입니다. 많은 기운은 나의 핵심 성향을, 적은 기운은 보완이 필요한 부분을 나타냅니다.',
    margin + halfW + 25, y + 20, { width: halfW - 10, lineGap: 4 }
  );
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
  doc.font(koreanBoldFont).fontSize(9).fillColor('#6b3a3a');
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

    doc.font(koreanBoldFont).fontSize(10).fillColor('#6b3a3a');
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

    const resultColor = s.result === '신강' ? '#c47d5e' : s.result === '신약' ? '#5c7d8e' : '#c4a055';
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
      doc.font(koreanBoldFont).fontSize(14).fillColor(criteria[i].gained ? '#5a7a6b' : '#c47d5e');
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
      doc.font(koreanBoldFont).fontSize(14).fillColor('#6b3a3a');
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
      const catColor = s.category === '귀인' ? '#c4a055' : s.category === '길신' ? '#5a7a6b' : s.category === '흉살' ? '#c47d5e' : '#6b7280';
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
      const typeColor = ['천간합', '육합', '삼합', '방합'].includes(it.type) ? '#5a7a6b' :
                         ['천간충', '육충'].includes(it.type) ? '#c47d5e' : '#c4a055';
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
    doc.font(koreanBoldFont).fontSize(14).fillColor('#6b3a3a');
    doc.text(yf.tenGod, 200, y + 26);

    doc.font(koreanFont).fontSize(9).fillColor('#6b7280');
    doc.text('운성', 300, y + 10);
    doc.font(koreanBoldFont).fontSize(14).fillColor('#6b3a3a');
    doc.text(yf.twelveStage, 300, y + 26);

    // Rating
    const ratingColor = yf.favorableRating >= 10 ? '#5a7a6b' : yf.favorableRating <= -10 ? '#c47d5e' : '#c4a055';
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
        doc.font(koreanFont).fontSize(7).fillColor('#6b3a3a');
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
  const margin = 50;
  const contentW = width - margin * 2;

  // ─── 헤더 ───
  doc.font(koreanBoldFont).fontSize(20).fillColor('#1f2937');
  doc.text('월별 운세 흐름', 0, 50, { align: 'center', width });
  doc.font(koreanFont).fontSize(9).fillColor('#9ca3af');
  doc.text('월운 12운성 + 십신 가중치 기준 (10점 만점)', 0, 76, { align: 'center', width });

  if (!result.monthFortunes || result.monthFortunes.length === 0) return;

  // 12운성별 기본 점수 (소수점 포함, sajulab.kr 스타일)
  const stageScoreMap: Record<string, number> = {
    '장생': 8, '목욕': 5, '관대': 7, '건록': 9, '제왕': 10,
    '쇠': 4, '병': 3.5, '사': 2.5, '묘': 1.5, '절': 2, '태': 4.5, '양': 6,
  };

  // 십신별 가중치 (용신/희신이면 +0.5~1, 기신/구신이면 -0.5~1)
  const tenGodModifier = (tenGod: string | undefined): number => {
    if (!tenGod) return 0;
    const positive = ['정관', '편관', '정인', '편인'];
    const negative = ['상관', '겁재'];
    if (positive.includes(tenGod)) return 0.5;
    if (negative.includes(tenGod)) return -0.5;
    return 0;
  };

  // 12운성별 의미있는 설명 (sajulab.kr 스타일)
  const stageDescription: Record<string, string> = {
    '장생': '표현의 새로운 시작',
    '목욕': '정화의 시기',
    '관대': '도약의 준비',
    '건록': '재물의 도약의 기회',
    '제왕': '승진의 최고의 성과',
    '쇠': '신중한 선택',
    '병': '전환의 시기',
    '사': '잉태의 시기',
    '묘': '내면 성찰',
    '절': '휴식 필요',
    '태': '내면 성장',
    '양': '재정비',
  };

  const monthScores = result.monthFortunes.map(mf => {
    const base = stageScoreMap[mf.twelveStage] || 5;
    const mod = tenGodModifier(mf.tenGod);
    const score = Math.max(1, Math.min(10, +(base + mod).toFixed(1)));
    const desc = stageDescription[mf.twelveStage] || '변화의 시기';
    return { ...mf, score, desc };
  });

  // 2월부터 시작하도록 정렬 (sajulab.kr 스타일)
  const sorted = [...monthScores].sort((a, b) => {
    const am = a.month >= 2 ? a.month : a.month + 12;
    const bm = b.month >= 2 ? b.month : b.month + 12;
    return am - bm;
  });

  // ─── 월별 바 차트 ───
  let y = 100;
  const barLeft = margin + 50;
  const barMaxW = contentW - 180;
  const rowH = 32;

  for (const ms of sorted) {
    const barW = (ms.score / 10) * barMaxW;
    // 색상: 빨강(낮음)→갈색→금색→녹색(높음) sajulab.kr 스타일
    const color = ms.score >= 9 ? '#2d6a4f' : ms.score >= 7.5 ? '#5a7a6b' :
                  ms.score >= 6 ? '#c4a055' : ms.score >= 4.5 ? '#7a6855' : '#8b3a3a';
    const grade = ms.score >= 9 ? '대길' : ms.score <= 4 ? '주의' : '';

    // 월 라벨
    doc.font(koreanBoldFont).fontSize(11).fillColor('#374151');
    doc.text(`${ms.month}월`, margin + 2, y + 6, { width: 38, align: 'right' });

    // 바 배경
    doc.roundedRect(barLeft, y + 2, barMaxW, 22, 11).fill('#e8e5de');
    // 바 채움
    if (barW > 0) {
      doc.roundedRect(barLeft, y + 2, Math.max(barW, 22), 22, 11).fill(color);
    }

    // 점수
    doc.font(koreanBoldFont).fontSize(11).fillColor('#374151');
    doc.text(`${ms.score}`, barLeft + barMaxW + 10, y + 5);

    // 설명 (12운성 기반 의미있는 설명)
    doc.font(koreanFont).fontSize(8.5).fillColor('#6b7280');
    doc.text(ms.desc, barLeft + barMaxW + 32, y + 7);

    // 등급 배지
    if (grade) {
      const badgeColor = grade === '대길' ? '#2d6a4f' : '#8b3a3a';
      doc.roundedRect(barLeft + barMaxW + 110, y + 2, 36, 22, 11).fill(badgeColor);
      doc.font(koreanBoldFont).fontSize(8).fillColor('#ffffff');
      doc.text(grade, barLeft + barMaxW + 110, y + 8, { width: 36, align: 'center' });
    }

    y += rowH;
  }

  // ─── 하단 요약 (연평균 / 최고 / 최저) ───
  y += 10;
  const avgScore = (sorted.reduce((s, m) => s + m.score, 0) / sorted.length).toFixed(1);
  const bestMonth = sorted.reduce((a, b) => a.score > b.score ? a : b);
  const worstMonth = sorted.reduce((a, b) => a.score < b.score ? a : b);

  const sumBoxW = (contentW - 16) / 3;
  // 연평균
  doc.roundedRect(margin, y, sumBoxW, 50, 6).fill('#f8f7f4');
  doc.roundedRect(margin, y, sumBoxW, 50, 6).strokeColor('#e8e5de').stroke();
  doc.font(koreanFont).fontSize(8).fillColor('#9ca3af');
  doc.text('연평균', margin, y + 8, { width: sumBoxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(18).fillColor('#1f2937');
  doc.text(`${avgScore}점`, margin, y + 24, { width: sumBoxW, align: 'center' });

  // 최고
  doc.roundedRect(margin + sumBoxW + 8, y, sumBoxW, 50, 6).fill('#f8f7f4');
  doc.roundedRect(margin + sumBoxW + 8, y, sumBoxW, 50, 6).strokeColor('#e8e5de').stroke();
  doc.font(koreanFont).fontSize(8).fillColor('#9ca3af');
  doc.text('최고', margin + sumBoxW + 8, y + 8, { width: sumBoxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(18).fillColor('#5c2626');
  doc.text(`${bestMonth.month}월 (${bestMonth.score}점)`, margin + sumBoxW + 8, y + 24, { width: sumBoxW, align: 'center' });

  // 최저
  doc.roundedRect(margin + (sumBoxW + 8) * 2, y, sumBoxW, 50, 6).fill('#f8f7f4');
  doc.roundedRect(margin + (sumBoxW + 8) * 2, y, sumBoxW, 50, 6).strokeColor('#e8e5de').stroke();
  doc.font(koreanFont).fontSize(8).fillColor('#9ca3af');
  doc.text('최저', margin + (sumBoxW + 8) * 2, y + 8, { width: sumBoxW, align: 'center' });
  doc.font(koreanBoldFont).fontSize(18).fillColor('#c47d5e');
  doc.text(`${worstMonth.month}월 (${worstMonth.score}점)`, margin + (sumBoxW + 8) * 2, y + 24, { width: sumBoxW, align: 'center' });

  // ─── 행운의 달 / 주의할 달 박스 ───
  y += 65;
  const halfW = (contentW - 16) / 2;

  // 행운의 달
  doc.roundedRect(margin, y, halfW, 110, 8).fill('#ffffff');
  doc.roundedRect(margin, y, halfW, 110, 8).strokeColor('#2d6a4f').lineWidth(1.5).stroke();
  doc.roundedRect(margin + 12, y + 10, 42, 18, 4).fill('#2d6a4f');
  doc.font(koreanBoldFont).fontSize(8).fillColor('#ffffff');
  doc.text('BEST', margin + 12, y + 14, { width: 42, align: 'center' });
  doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
  doc.text('행운의 달', margin + 62, y + 12);

  const topMonths = [...sorted].sort((a, b) => b.score - a.score).slice(0, 3);
  let my = y + 38;
  for (const tm of topMonths) {
    doc.font(koreanBoldFont).fontSize(10).fillColor('#374151');
    doc.text(`${tm.month}월`, margin + 16, my);
    doc.font(koreanBoldFont).fontSize(10).fillColor('#2d6a4f');
    doc.text(`${tm.score}점`, margin + 50, my);
    doc.font(koreanFont).fontSize(8.5).fillColor('#6b7280');
    doc.text(tm.desc, margin + 85, my + 1);
    my += 22;
  }

  // 주의할 달
  doc.roundedRect(margin + halfW + 16, y, halfW, 110, 8).fill('#ffffff');
  doc.roundedRect(margin + halfW + 16, y, halfW, 110, 8).strokeColor('#8b3a3a').lineWidth(1.5).stroke();
  doc.roundedRect(margin + halfW + 28, y + 10, 60, 18, 4).fill('#8b3a3a');
  doc.font(koreanBoldFont).fontSize(8).fillColor('#ffffff');
  doc.text('CAUTION', margin + halfW + 28, y + 14, { width: 60, align: 'center' });
  doc.font(koreanBoldFont).fontSize(13).fillColor('#1f2937');
  doc.text('주의할 달', margin + halfW + 96, y + 12);

  const bottomMonths = [...sorted].sort((a, b) => a.score - b.score).slice(0, 3);
  my = y + 38;
  for (const bm of bottomMonths) {
    doc.font(koreanBoldFont).fontSize(10).fillColor('#374151');
    doc.text(`${bm.month}월`, margin + halfW + 32, my);
    doc.font(koreanBoldFont).fontSize(10).fillColor('#8b3a3a');
    doc.text(`${bm.score}점`, margin + halfW + 66, my);
    doc.font(koreanFont).fontSize(8.5).fillColor('#6b7280');
    doc.text(bm.desc, margin + halfW + 101, my + 1);
    my += 22;
  }
  doc.lineWidth(1); // reset
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
  doc.rect(50, 50, width - 100, 2).fill('#6b3a3a');

  // Title
  doc.font(koreanBoldFont).fontSize(20).fillColor('#1f2937');
  doc.text(title, 0, 70, { align: 'center', width });
}
