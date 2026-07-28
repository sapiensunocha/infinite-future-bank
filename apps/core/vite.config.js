import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';
import viteCompression from 'vite-plugin-compression';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

// Skip compression on Railway — it times out the 30-min build limit.
// Railway's CDN handles gzip automatically; local server.cjs serves .gz/.br for self-hosted.
const isRailway = !!process.env.RAILWAY_ENVIRONMENT;

export default defineConfig({
  plugins: [
    react(),
    ...(!isRailway ? [
      viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 10240 }),
      viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 10240 }),
    ] : []),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    open: true,
  },

  build: {
    target: ['es2020', 'safari13', 'edge88', 'firefox78', 'chrome87'],
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      external: ['puppeteer'],
    },
  },
});
