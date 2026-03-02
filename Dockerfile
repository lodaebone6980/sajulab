# ── Stage 1: Dependencies ──
FROM node:20-slim AS deps
WORKDIR /app

# better-sqlite3 네이티브 빌드에 필요한 도구
RUN apt-get update && apt-get install -y \
  python3 make g++ \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ──
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: Production ──
FROM node:20-slim AS runner
WORKDIR /app

# Chromium + 한글 폰트 설치 (Puppeteer용)
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-noto-cjk \
  fonts-noto-color-emoji \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 앱 파일 복사
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/fonts ./fonts

# 데이터 디렉토리 생성
RUN mkdir -p /app/data/pdfs

EXPOSE 3000

CMD ["npm", "start"]
