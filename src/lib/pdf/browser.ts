// Puppeteer 브라우저 싱글톤 관리
// Railway(Docker) + 로컬 환경 모두 지원

import puppeteer, { type Browser } from 'puppeteer-core';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  let executablePath: string;
  let args: string[];

  // Railway/Docker 환경: @sparticuz/chromium 사용
  if (process.env.RAILWAY_ENVIRONMENT || process.env.AWS_LAMBDA_FUNCTION_NAME || !process.env.PUPPETEER_EXECUTABLE_PATH) {
    try {
      const chromium = await import('@sparticuz/chromium');
      executablePath = await chromium.default.executablePath();
      args = chromium.default.args;
    } catch {
      // fallback: 시스템 크롬 찾기
      executablePath = '/usr/bin/chromium-browser';
      args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ];
    }
  } else {
    // 로컬: 직접 지정된 크롬 경로
    executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    args = ['--no-sandbox', '--disable-setuid-sandbox'];
  }

  browserInstance = await puppeteer.launch({
    executablePath,
    args,
    headless: true,
  });

  return browserInstance;
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
