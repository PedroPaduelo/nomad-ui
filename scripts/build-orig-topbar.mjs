#!/usr/bin/env node
/**
 * Bundle do @nomad/topbar original (sha 303541e, tag topbar-v1.0.0) em
 * `/workspace/.ref/conta_nommand/packages/topbar/dist/topbar.js`. Idempotente;
 * roda uma vez antes do `compare-topbar.mjs`.
 */
import { build } from 'esbuild'

await build({
  entryPoints: ['/workspace/.ref/conta_nommand/packages/topbar/src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: '/workspace/.ref/conta_nommand/packages/topbar/dist/topbar.js',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  loader: { '.css': 'text' },
  define: { 'process.env.NODE_ENV': '"production"' },
})
console.log('OK /workspace/.ref/conta_nommand/packages/topbar/dist/topbar.js')