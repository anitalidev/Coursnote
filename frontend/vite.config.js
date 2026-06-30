import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  server: { port: 3334 },
  build: { outDir: 'dist', emptyOutDir: true },
});
