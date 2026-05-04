import { defineConfig } from 'vite';

// Forward /api/* to the Flask backend so the frontend can call it
// without CORS or hard-coded URLs. The target is configurable via the
// VITE_BACKEND_URL env var so docker-compose can point it at the
// `backend` service instead of localhost.
const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:5001';

export default defineConfig({
  resolve: {
    // 3d-force-graph + three-spritetext + three-render-objects each pull
    // their own `three` import — without dedupe Vite ends up shipping two
    // copies and `Timer` goes missing on the duplicate ("three$1.Timer
    // is not a constructor").
    dedupe: ['three'],
  },
  optimizeDeps: {
    include: ['three', '3d-force-graph', 'three-spritetext'],
  },
  server: {
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});
