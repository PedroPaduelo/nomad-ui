import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { createQueryClient } from './queryClient'

export interface QueryProviderProps {
  /**
   * O QueryClient do app. O app cria um só, no módulo de entrada
   * (`const queryClient = createQueryClient()`), para poder ligá-lo à sessão
   * (`clearCacheOnSessionChange`). Sem ele, o provider cria um com os padrões.
   */
  client?: QueryClient
  children: ReactNode
}

/** `QueryClientProvider` com o QueryClient do Padrão Nomad. */
export function QueryProvider({ client, children }: QueryProviderProps) {
  const [own] = useState(() => client ?? createQueryClient())
  return <QueryClientProvider client={client ?? own}>{children}</QueryClientProvider>
}
