import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const CORE = path.resolve(__dirname, '../core/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': CORE,
      // resolve any relative imports that components inside core make
      // (e.g. ../../components/ui/GlassCard) to core's own tree
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: { external: ['puppeteer'] },
  },
});
