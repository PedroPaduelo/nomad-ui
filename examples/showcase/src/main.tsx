import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PaletteProvider, ThemeProvider, configureThemeStorage, useThemeStore } from '@nomad/ui'
import { App } from './App'
import { SHOWCASE_STORAGE } from './storage'
import { readParams } from './url'
import './styles.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

// `?palette=` e `?theme=` vencem o que estava salvo (link direto e capturas).
// Hidrata o store antes (o ThemeProvider faria o mesmo, e é idempotente).
const params = readParams()
configureThemeStorage(SHOWCASE_STORAGE)
if (params.theme) useThemeStore.getState().setTheme(params.theme)
if (params.palette) useThemeStore.getState().setPalette(params.palette)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider {...SHOWCASE_STORAGE}>
      <PaletteProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </PaletteProvider>
    </ThemeProvider>
  </StrictMode>,
)
