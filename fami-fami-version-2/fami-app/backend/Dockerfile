# Multi-stage build for production
FROM node:20-alpine AS base

# Install wget for health checks
RUN apk add --no-cache wget

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Health check - use CMD-SHELL to properly execute the command
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/api/health || exit 1

# Labels for Docker Desktop
LABEL com.docker.compose.project="fami-app"
LABEL com.docker.compose.service="backend"
LABEL description="Fami Family App - Backend API"

# Start server
CMD ["node", "server.js"]
