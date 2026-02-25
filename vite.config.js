import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // 1. The React Plugin allows Vite to understand JSX syntax
  plugins: [react()],
  
  // 2. The Resolve Alias configures our clean import paths
  resolve: {
    alias: {
      // Maps the '@' symbol directly to your 'src' folder
      '@': path.resolve(__dirname, './src'),
    },
  },

  // 3. Server settings ensure your local Dev environment is stable
  server: {
    port: 5173,       // Standard Vite port
    strictPort: true, // Forces this port so your API connections don't break
    open: true,       // Automatically opens the browser when you run 'npm run dev'
  },

  // 4. Build optimization for when you deploy IFB to production
  build: {
    target: 'esnext', // Compiles to the fastest modern JavaScript
    outDir: 'dist',
    sourcemap: false, // Hides your source code from the public build
  }
});