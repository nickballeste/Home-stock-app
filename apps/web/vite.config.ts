import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@homestock/types': fileURLToPath(
        new URL('../../packages/types/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    host: true, // bind to LAN so phones on the same network can open the app
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
