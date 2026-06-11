import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';
import viteCompression from 'vite-plugin-compression';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
  plugins: [
    react(),
    // Generate .gz — serve package auto-serves them: 1MB vendor-misc → ~280KB
    viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 10240 }),
    // Brotli is 20% smaller than gzip, supported by all modern browsers incl. Safari
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 10240 }),
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
