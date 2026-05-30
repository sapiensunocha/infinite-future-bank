import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

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
      external: ['puppeteer'], // Node-only lib — never bundle into browser build
      output: {
        manualChunks(id) {
          // Supabase — loads early for auth
          if (id.includes('@supabase/')) return 'vendor-supabase';
          // Face-api is large — isolate it
          if (id.includes('face-api')) return 'vendor-face';
          // Charts
          if (id.includes('chart.js') || id.includes('chartjs') || id.includes('react-chartjs')) return 'vendor-charts';
          // Maps
          if (id.includes('leaflet')) return 'vendor-leaflet';
          // PDF generation
          if (id.includes('jspdf')) return 'vendor-pdf';
          // Stripe
          if (id.includes('@stripe/')) return 'vendor-stripe';
          // All other node_modules (including React) in one shared chunk
          // NOTE: do NOT split react separately — it creates circular dependency with vendor-misc
          if (id.includes('node_modules/')) return 'vendor-misc';
        },
      },
    },
  },
});
