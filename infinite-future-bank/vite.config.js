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
          // React core — isolated so Safari's JIT can cache it across deploys
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';
          // Router
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          // Icons — large but static
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          // Tour — only loaded when user has not completed tour
          if (id.includes('node_modules/react-joyride') || id.includes('node_modules/@floating-ui')) return 'vendor-tour';
          // AI SDK — only loaded inside AI feature screens
          if (id.includes('node_modules/@google/generative-ai')) return 'vendor-ai';
          // QR scanner — only loaded when scanner is opened
          if (id.includes('node_modules/@yudiel/react-qr-scanner') || id.includes('node_modules/react-qr-code')) return 'vendor-qr';
          // Everything else
          if (id.includes('node_modules/')) return 'vendor-misc';
        },
      },
    },
  },
});
