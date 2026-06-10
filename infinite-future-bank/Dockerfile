FROM node:20-slim
WORKDIR /app

# Copy manifests first for layer caching
COPY package*.json ./

# Skip large binary downloads for production-only install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV ELECTRON_SKIP_DIST_DOWNLOAD=true

RUN npm install --omit=dev --ignore-scripts=false

# Copy the rest of the app (dist/ is pre-built and included)
COPY . .

EXPOSE 3000
CMD ["node", "server.cjs"]
