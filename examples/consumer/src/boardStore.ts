import { createScreenStore } from '@nomad/ui/data'

/** Loja de tela para o consumidor de exemplo (Zustand + persist). */
export const useBoardView = createScreenStore(
  { mode: 'list' as 'list' | 'board' },
  undefined,
  { persist: { name: 'consumer:board', keys: ['mode'] } },
)
