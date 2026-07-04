import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Havok ships a .wasm that esbuild's dep pre-bundling mangles — leave it alone.
  optimizeDeps: { exclude: ['@babylonjs/havok'] },
  resolve: {
    alias: {
      // Single source of truth: the frozen narrative app's course data (read-only).
      '@content': fileURLToPath(new URL('../web/src/content.js', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: ['..'] }, // allow importing ../web/src/content.js from outside the Vite root
  },
});
