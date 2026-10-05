// O consumer usa o preset publicado (@nomad/ui/eslint): a mesma regra dos apps.
import nomad from '@nomad/ui/eslint'
import { defineConfig } from 'eslint/config'

export default defineConfig(nomad)
