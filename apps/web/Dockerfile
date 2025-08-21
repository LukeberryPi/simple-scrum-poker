# Frontend Dockerfile for React/Vite app

# Build stage
FROM oven/bun:1.2.18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy web package file and install dependencies
COPY apps/web/package.json ./
RUN bun install --dev

# Copy server types for ORPC (preserve import paths)
COPY apps/server/src/routers ./apps/server/src/routers
COPY apps/server/src/types ./apps/server/src/types
COPY apps/server/tsconfig.json ./apps/server/

# Copy web source code
COPY apps/web ./apps/web

# Build the web application
WORKDIR /app/apps/web
RUN bun run build

# Production stage
FROM nginx:1.27-alpine

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]