/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { localEndpoints } from './scripts/local-endpoints';

/**
 * SPA deep links need a 404.html that is a copy of index.html (the GitHub Pages fallback, as in Bioactive
 * Explorer). Delivery here is `pages`; the deploy workflow copies it again after the build (KICKOFF §4c).
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(fileURLToPath(new URL('./dist', import.meta.url)));
      const index = path.join(dist, 'index.html');
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'));
    },
  };
}

// BASE_PATH lets the same build deploy to a GitHub Pages sub-path: BASE_PATH=/token-for-granted/.
// The local build uses base "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  // localEndpoints(): dev/preview-server middleware only (notepad + reading-tracker file autosave) — never part of
  // dist/, and it answers loopback requests only.
  plugins: [react(), spaFallback(), localEndpoints(fileURLToPath(new URL('.', import.meta.url)))],
  // The e2e suite reaches the preview under a non-localhost name to prove the "browser only" fallback.
  preview: { allowedHosts: process.env.BX_TEST_HOST ? [process.env.BX_TEST_HOST] : [] },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
