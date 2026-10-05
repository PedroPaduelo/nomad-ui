import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PaletteId } from './palettes'
import {
  DEFAULT_PALETTE_BOOT_STORAGE_KEY,
  DEFAULT_THEME_STORAGE_KEY,
  type ThemeStorageOptions,
} from '../lib/themeBoot'

// ── Store de aparência do @nomad/ui ───────────────────────
//
// Só tema e paleta (estado de tela, persistido no localStorage). No
// agent-package isto morava no `uiStore` do app, junto com sidebar, toasts e
// atalhos; aqui fica só o que o kit precisa, e o resto continua no app.
//
// As chaves do localStorage são parâmetro (`ThemeProvider storageKey=…`):
// cada app usa as suas, e o script bloqueante do index.html
// (`themeBootScript`) lê as mesmas. Não compartilhe a chave com outro
// `persist` do app: cada `persist` regrava a chave inteira.

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeState {
  theme: Theme
  palette: PaletteId
}

export interface ThemeActions {
  setTheme: (theme: Theme) => void
  setPalette: (palette: PaletteId) => void
}

export const DEFAULT_THEME: Theme = 'system'
export const DEFAULT_PALETTE: PaletteId = 'slate-blue-gold'

/** Chaves em uso: o `ThemeProvider` troca, o `PaletteProvider` lê. */
const storage: Required<ThemeStorageOptions> = {
  storageKey: DEFAULT_THEME_STORAGE_KEY,
  paletteStorageKey: DEFAULT_PALETTE_BOOT_STORAGE_KEY,
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      palette: DEFAULT_PALETTE,
      setTheme: (theme) => set({ theme }),
      setPalette: (palette) => set({ palette }),
    }),
    {
      // O script bloqueante lê `{ state: { theme, palette } }` desta chave
      // antes do primeiro paint (lib/themeBoot).
      name: DEFAULT_THEME_STORAGE_KEY,
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({ theme: state.theme, palette: state.palette }),
      // A chave só é conhecida quando o ThemeProvider monta: ele hidrata.
      skipHydration: true,
    },
  ),
)

/** Chaves do localStorage em uso (as do último `configureThemeStorage`). */
export function getThemeStorage(): Readonly<Required<ThemeStorageOptions>> {
  return storage
}

let hydratedKey: string | null = null

/**
 * Aponta o store para as chaves do app e lê as preferências salvas. Chamado
 * pelo `ThemeProvider` antes do primeiro render dos filhos; idempotente para a
 * mesma chave. Em testes, chame direto.
 */
export function configureThemeStorage(options: ThemeStorageOptions = {}): void {
  storage.storageKey = options.storageKey ?? DEFAULT_THEME_STORAGE_KEY
  storage.paletteStorageKey = options.paletteStorageKey ?? DEFAULT_PALETTE_BOOT_STORAGE_KEY
  if (hydratedKey === storage.storageKey) return
  hydratedKey = storage.storageKey
  useThemeStore.persist.setOptions({ name: storage.storageKey })
  // localStorage é síncrono: o estado salvo já está no store ao voltar daqui.
  void useThemeStore.persist.rehydrate()
}
