# ── Stage 1: Dependencies ──────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

ENV NODE_ENV=development

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci && npx prisma generate

# ── Stage 2: Build ─────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ── Stage 3: Production ───────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma generated client (needed at runtime)
COPY --from=builder /app/lib/generated ./lib/generated
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
