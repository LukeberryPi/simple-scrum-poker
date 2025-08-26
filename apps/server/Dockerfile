FROM oven/bun:1.2.18-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN bun install --dev
COPY . ./
RUN bun run build

FROM oven/bun:1.2.18-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=builder --chown=bun:bun /app/dist ./dist
COPY --from=builder --chown=bun:bun /app/package.json ./
COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules
USER bun
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
CMD ["bun", "run", "dist/index.js"]
