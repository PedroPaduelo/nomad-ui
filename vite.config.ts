import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/** Nada de dependência dentro do dist: o app que instala resolve (e deduplica) tudo. */
const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})]
const external = (id: string) =>
  id.startsWith('node:') ||
  deps.some((dep) => id === dep || id.startsWith(`${dep}/`)) ||
  id === 'react/jsx-runtime'

/**
 * Modo biblioteca: uma entrada por `exports` do package.json. O CSS não passa
 * por aqui: o tema é CSS do Tailwind 4, compilado pelo app que instala.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      formats: ['es'],
      entry: {
        index: path.resolve(import.meta.dirname, 'src/index.ts'),
        data: path.resolve(import.meta.dirname, 'src/data/index.ts'),
        topbar: path.resolve(import.meta.dirname, 'src/topbar/index.ts'),
      },
    },
    rolldownOptions: {
      external,
      output: { preserveModules: true, preserveModulesRoot: 'src', entryFileNames: '[name].js' },
    },
  },
})
