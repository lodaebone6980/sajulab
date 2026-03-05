import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdfkit', 'puppeteer-core', '@sparticuz/chromium'],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
