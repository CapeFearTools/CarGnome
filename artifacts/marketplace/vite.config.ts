import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// The dev server picks its own port unless PORT is set; the build never needs one.
const port = process.env.PORT ? Number(process.env.PORT) : undefined;

if (port !== undefined && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    host: true,
    fs: {
      strict: true,
    },
    // In development the API runs alongside on its own port; proxying keeps the
    // browser on one origin, so dev matches the same-origin /api in production.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT ?? 8080}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: true,
  },
});
