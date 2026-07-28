import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the game at /learn-aws/ — dev stays at / so the
  // launch.json preview and E2E flows keep their URLs. `vite preview` also
  // runs as command 'serve', hence the isPreview check.
  base: command === 'build' || isPreview ? '/learn-aws/' : '/',
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
}));
