# Fast deploy: dist is pre-built locally and uploaded via .railwayignore (!dist/)
# No npm install + vite build inside Docker = ~1 min deploy instead of 10 min
FROM node:20-slim
WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV ELECTRON_SKIP_DIST_DOWNLOAD=true
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY dist ./dist
COPY server.cjs ./

EXPOSE 3000
CMD ["node", "server.cjs"]
