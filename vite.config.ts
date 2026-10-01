/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset URLs relative so the build works on GitHub Pages
// (any repo sub-path), Netlify, Vercel or a custom domain without changes.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    // The first test lazy-loads Recharts, which can be slow on cold CI runners.
    testTimeout: 20000,
  },
});
