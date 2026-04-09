# Agent Registry - Production Dockerfile
# Version: 1.0.0
# Date: 2026-04-10 (Week 5 Day 4)

# ============================================
# Stage 1: Build Environment
# ============================================

FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build optimization flags
ENV NODE_ENV=production

# Create production build
RUN npm run build 2>/dev/null || true

# ============================================
# Stage 2: Production Image
# ============================================

FROM node:20-alpine AS production

# Labels
LABEL maintainer="Copilot Core Team"
LABEL version="1.0.0"
LABEL description="Agent Registry - Production Container"
LABEL org.opencontainers.image.source="https://github.com/KVIP886/openclaw-agent-registry"
LABEL org.opencontainers.image.licenses="MIT"

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/src ./src
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/scripts ./scripts

# Copy entry point
COPY --from=builder /app/index.js ./
COPY --from=builder /app/start.sh ./

# Set permissions
RUN chown -R appuser:appgroup /app && \
    chmod 755 /app/start.sh && \
    chmod 644 /app/index.js

# Switch to non-root user
USER appuser

# Create necessary directories
RUN mkdir -p /app/logs /app/data

# Expose application port
EXPOSE 1111

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:1111/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Environment variables
ENV NODE_ENV=production \
    PORT=1111 \
    DB_HOST=localhost \
    DB_PORT=5432 \
    DB_NAME=agent_registry \
    DB_USER=postgres \
    DB_PASSWORD=postgres \
    DB_MAX_CONNECTIONS=20 \
    DB_IDLE_TIMEOUT=30000 \
    DB_CONNECT_TIMEOUT=2000 \
    JWT_SECRET=your-secret-key-change-in-production \
    LOG_LEVEL=info \
    LOG_FORMAT=json

# Startup script
ENTRYPOINT ["./start.sh"]

# Default command
CMD ["node", "index.js"]

# ============================================
# Stage 3: Development Image (Optional)
# ============================================

FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 1111

# Environment variables
ENV NODE_ENV=development \
    PORT=1111 \
    WATCH_MODE=true

# Development entrypoint
ENTRYPOINT ["./start-dev.sh"]

# Development command
CMD ["node", "index.js"]
