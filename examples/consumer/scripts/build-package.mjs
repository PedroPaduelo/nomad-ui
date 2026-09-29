#!/usr/bin/env node
// Builda o @nomad/ui a partir do clone em node_modules (o pacote ainda não traz
// o `dist/` por padrão). Quando a `prepare` voltar para o upstream, troque isto
// por `npm install --ignore-scripts=false`.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkg = resolve(here, '..', 'node_modules', '@nomad', 'ui')

if (!existsSync(pkg)) {
  console.error('[consumer] @nomad/ui não encontrado em', pkg)
  process.exit(0) // não falha a instalação; o gates e o dev vão falhar depois, com mensagem clara
}

mkdirSync(pkg, { recursive: true })
const result = spawnSync('npm', ['run', 'build'], { cwd: pkg, stdio: 'inherit' })
if (result.status !== 0) {
  console.error('[consumer] build do @nomad/ui falhou')
  process.exit(result.status ?? 1)
}
