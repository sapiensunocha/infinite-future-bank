# Ultra-fast deploy: server.cjs uses only Node built-ins (http, fs, path).
# No npm install needed. dist/ is pre-built locally and committed to repo.
# Deploy time: ~20 seconds instead of 10 minutes.
FROM node:20-slim
WORKDIR /app
COPY dist ./dist
COPY server.cjs ./
EXPOSE 3000
CMD ["node", "server.cjs"]
