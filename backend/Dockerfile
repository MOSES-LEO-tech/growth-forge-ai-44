# syntax=docker/dockerfile:1

# ============================================
# Development Stage
# ============================================
FROM node:20-alpine AS dev
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Expose debug port
EXPOSE 3000 9229

# Run development server with hot reload
CMD ["npm", "run", "dev"]

# ============================================
# Build Stage (for production)
# ============================================
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (production only)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ============================================
# Production Stage
# ============================================
FROM node:20-alpine AS prod
WORKDIR /app

# Install curl for health check
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Copy package files
COPY package*.json ./

# Install production dependencies only (no dev dependencies)
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Set ownership to app user
RUN chown -R app:app /app

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -fsS http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "dist/server.js"]
