// HTML → PDF 변환 (Puppeteer 기반)

import { getBrowser } from './browser';
import { renderSajuHtml } from './templates/render-html';
import type { SajuResult } from '@/lib/saju/types';
import type { NarrativeResult } from '@/lib/ai';

interface HtmlPdfOptions {
  customerName: string;
  productName: string;
  productCode: string;
  narrative?: NarrativeResult | null;
}

export async function generateSajuPdfFromHtml(
  result: SajuResult,
  options: HtmlPdfOptions
): Promise<Buffer> {
  // 1. HTML 렌더링
  const html = renderSajuHtml(result, options);

  // 2. Puppeteer로 PDF 변환
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Google Fonts 로딩 대기
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}
