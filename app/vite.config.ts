import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Local-first SPA. No backend service is required: all data lives in SQLite (WASM)
// persisted to IndexedDB in the browser (and an in-memory SQLite database in tests).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // The preview proxy serves the app from a dynamic *.e2b.app host.
    allowedHosts: true,
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          sqlite: ['sql.js'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: false,
  },
} as never);
