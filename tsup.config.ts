import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['bin/aw.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
