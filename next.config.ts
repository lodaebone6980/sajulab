import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdfkit', 'puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;
