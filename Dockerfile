# FAANG-Grade Multi-stage Dockerfile for TrueTawakkul Company Portal

# Stage 1: Build Environment
FROM node:22-alpine AS builder
WORKDIR /app
# Copy package files
COPY package*.json ./
# Install ALL dependencies (including devDependencies for build)
RUN npm ci
# Copy source code
COPY . .
# Typecheck and Build TypeScript
RUN npm run build

# Stage 2: Production Environment
FROM node:22-alpine AS production
WORKDIR /app
# Set environment to production
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user for security (Least Privilege)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose API port
EXPOSE 4000

# Start server
CMD ["node", "dist/server.js"]
