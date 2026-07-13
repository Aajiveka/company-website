import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Proxy API calls to the Express server in dev to avoid CORS.
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:4100', changeOrigin: true },
    },
  },
  build: {
    // Deterministic vendor/ui chunk splitting for better long-term caching.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', 'axios'],
        },
      },
    },
  },
});
