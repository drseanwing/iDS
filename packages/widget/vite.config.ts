import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'OpenGradeWidget',
      fileName: 'opengrade-widget',
      formats: ['umd', 'es'],
    },
    rollupOptions: {
      // Preact is bundled in (small, ~3 kB) so embedders need zero deps
      external: [],
      output: {
        // UMD global name
        globals: {},
      },
    },
    minify: 'esbuild',
    sourcemap: true,
  },
});
