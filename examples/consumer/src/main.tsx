import { createQueryClient, QueryProvider } from '@nomad/ui/data'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { z } from 'zod'
import { App } from './App'

const envSchema = z.object({
  VITE_API_URL: z.url().default('http://api.test/api'),
})

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

const env = envSchema.parse(import.meta.env)

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider client={queryClient}>
      <App />
    </QueryProvider>
  </StrictMode>,
)

// eslint-disable-next-line no-console -- exemplo de uso da env validada
console.log('API base:', env.VITE_API_URL)
