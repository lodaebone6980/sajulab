import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdfkit', 'puppeteer-core', '@sparticuz/chromium'],
  output: 'standalone',
};

export default nextConfig;
