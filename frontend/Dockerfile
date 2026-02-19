FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for API URL
ARG VITE_API_URL=https://fakturex-backend.up.railway.app/api
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start server
CMD ["sh", "-c", "serve dist -s -l ${PORT:-3000}"]
