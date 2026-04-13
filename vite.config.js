import { defineConfig } from 'vite';

// Forward /api/* to the Flask backend so the frontend can call it
// without CORS or hard-coded URLs. Backend default port is 5001.
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
