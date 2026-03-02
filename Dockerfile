# ── Stage 1: Dependencies ──
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build ──
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: Production ──
FROM node:20-slim AS runner
WORKDIR /app

# Chromium 의존성 설치 (Puppeteer용)
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-noto-cjk \
  fonts-noto-color-emoji \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# standalone 출력 복사 (server.js + 최소 node_modules 포함)
COPY --from=builder /app/.next/standalone ./
# static 파일 복사
COPY --from=builder /app/.next/static ./.next/static
# public 폴더 복사
COPY --from=builder /app/public ./public
# 폰트 복사
COPY --from=builder /app/fonts ./fonts

# 데이터 디렉토리 생성
RUN mkdir -p /app/data/pdfs

EXPOSE 3000

CMD ["node", "server.js"]
