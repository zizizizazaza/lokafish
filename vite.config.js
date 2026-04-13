import { defineConfig } from 'vite';

// Forward /api/* to the Flask backend so the frontend can call it
// without CORS or hard-coded URLs. The target is configurable via the
// VITE_BACKEND_URL env var so docker-compose can point it at the
// `backend` service instead of localhost.
const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:5001';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});
