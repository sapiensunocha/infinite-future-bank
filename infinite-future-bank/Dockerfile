# Stage 1 — build the Vite app
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV ELECTRON_SKIP_DIST_DOWNLOAD=true

# Install ALL deps (devDeps needed for vite + compression plugins)
RUN npm install

COPY . .
RUN npm run build

# Stage 2 — lean production image
FROM node:20-slim
WORKDIR /app

COPY package*.json ./

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV ELECTRON_SKIP_DIST_DOWNLOAD=true

RUN npm install --omit=dev

# Copy built assets and server from builder
COPY --from=builder /app/dist ./dist
COPY server.cjs ./

EXPOSE 3000
CMD ["node", "server.cjs"]
