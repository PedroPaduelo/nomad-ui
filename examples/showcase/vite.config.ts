import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { themeBootPlugin } from '../../src/lib/themeBoot'
import { SHOWCASE_STORAGE } from './src/storage'

const src = path.resolve(import.meta.dirname, '../../src')

/**
 * Vitrine do @nomad/ui: um app Vite que usa o pacote como um app de verdade
 * (`import … from '@nomad/ui'`, `@import '@nomad/ui/theme.css'`), só que
 * apontando para o `src/` por alias, sem build. `npm run showcase:dev` sobe
 * em 0.0.0.0:5173 (o container exporta PORT=8080: a porta vai explícita).
 */
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss(), themeBootPlugin(SHOWCASE_STORAGE)],
  resolve: {
    alias: [
      { find: /^@nomad\/ui$/, replacement: `${src}/index.ts` },
      { find: /^@nomad\/ui\/markdown$/, replacement: `${src}/markdown.ts` },
      { find: /^@nomad\/ui\/theme-boot$/, replacement: `${src}/lib/themeBoot.ts` },
      { find: /^@nomad\/ui\/topbar$/, replacement: `${src}/topbar/index.ts` },
      { find: /^@nomad\/ui\/data$/, replacement: `${src}/data/index.ts` },
      { find: /^@nomad\/ui\/theme\.css$/, replacement: `${src}/theme/theme.css` },
      { find: /^@nomad\/ui\/responsive\.css$/, replacement: `${src}/theme/responsive.css` },
    ],
  },
  server: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: true },
  build: { outDir: 'dist', emptyOutDir: true },
})
