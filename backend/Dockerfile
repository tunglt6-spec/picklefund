FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
# Loại devDependencies khỏi node_modules production rồi generate lại client vào cây đã prune
# (giữ prisma CLI vì đã chuyển sang dependencies → `migrate deploy` runtime vẫn chạy). Giảm image.
RUN npm prune --omit=dev && npx prisma generate

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
# dumb-init + Chromium (cho Puppeteer render PDF Báo cáo điều hành giống web).
# Puppeteer dùng CHROMIUM HỆ THỐNG (puppeteer-core, không tải bản riêng) — chỉ Vietnamese
# font trong báo cáo nhúng @font-face base64 nên không phụ thuộc font hệ thống.
RUN apk add --no-cache dumb-init chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto font-noto-emoji
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
