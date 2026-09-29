// ── ThemeSwitcher — palette + light/dark toggle ────────────────────────
//
// Renders a compact dropdown in the header that lets the user:
//   1. Switch between palettes (Slate Blue + Gold, Deep Teal + Amber, etc.)
//   2. Toggle light/dark mode
//
// Visual: two buttons — palette picker (colored dots) + sun/moon toggle.
// Palette picker opens a popover with preview swatches.

import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react'
import { Sun, Moon, Palette, Check, ChevronDown } from 'lucide-react'
import { useThemeStore } from '../../theme/store'
import { useResolvedTheme } from '../../hooks/useResolvedTheme'
import { PALETTES } from '../../theme/palettes'
import { cn } from '../../lib/utils'

// Custom props do `.ui-btn` (globals.css): o hover é declarativo em CSS, não
// mutação de `style` no JS. Variante "ghost" com bg de repouso configurável.
function ghostBtnVars(bg: string, bgHover = 'var(--surface-overlay)'): CSSProperties {
  return {
    '--btn-bg': bg,
    '--btn-bg-h': bgHover,
    '--btn-fg': 'var(--color-text-secondary)',
    '--btn-fg-h': 'var(--color-text-primary)',
    '--btn-bd': 'transparent',
    '--btn-bd-h': 'transparent',
  } as CSSProperties
}

export function ThemeSwitcher() {
  const { palette, setTheme, setPalette } = useThemeStore()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Tema efetivo pelo hook único — o ícone (sol/lua) nunca diverge do que
  // o app está de fato mostrando.
  const isDark = useResolvedTheme() === 'dark'

  const toggleDarkLight = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark')
  }, [isDark, setTheme])

  // Click outside to close
  useEffect(() => {
    if (!paletteOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPaletteOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [paletteOpen])

  // ESC to close
  useEffect(() => {
    if (!paletteOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [paletteOpen])

  const activePalette = PALETTES.find((p) => p.id === palette)

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      {/* Palette picker */}
      <button
        type="button"
        onClick={() => setPaletteOpen(!paletteOpen)}
        aria-expanded={paletteOpen}
        aria-haspopup="listbox"
        aria-label="Escolher paleta de cores"
        title="Paleta de cores"
        className="ui-btn inline-flex items-center gap-1.5 rounded-md border-0 px-2 py-1.5 text-caption font-medium transition-colors duration-150"
        style={ghostBtnVars(paletteOpen ? 'var(--surface-raised)' : 'transparent')}
      >
        {/* Color dots preview */}
        <div className="flex -space-x-1">
          <span
            className="inline-block h-3 w-3 rounded-full ring-1"
            // ring-1 usa a custom property --tw-ring-color do Tailwind;
            // ringColor não é uma CSSProperty valida, entao setamos a var.
            style={
              {
                backgroundColor: activePalette?.preview.accent ?? '#60a5fa',
                ['--tw-ring-color' as string]: 'var(--surface-body)',
              } as React.CSSProperties
            }
          />
          <span
            className="inline-block h-3 w-3 rounded-full ring-1"
            // ring-1 usa a custom property --tw-ring-color do Tailwind;
            // ringColor não é uma CSSProperty valida, entao setamos a var.
            style={
              {
                backgroundColor: activePalette?.preview.amber ?? '#f59e0b',
                ['--tw-ring-color' as string]: 'var(--surface-body)',
              } as React.CSSProperties
            }
          />
        </div>
        <span className="hidden sm:inline">{activePalette?.name.split('+')[0].trim()}</span>
        <ChevronDown className="h-3 w-3" aria-hidden />
      </button>

      {/* Dark/Light toggle */}
      <button
        type="button"
        onClick={toggleDarkLight}
        aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        title={isDark ? 'Modo claro' : 'Modo escuro'}
        className="ui-btn inline-flex h-8 w-8 items-center justify-center rounded-md border-0 transition-colors duration-150"
        style={ghostBtnVars('transparent')}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>

      {/* Palette popover */}
      {paletteOpen && (
        <div
          role="listbox"
          aria-label="Paletas disponíveis"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-text-accent" />
              <span className="text-caption font-semibold text-text-primary">Paleta de cores</span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {PALETTES.map((p) => {
              const isActive = p.id === palette
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setPalette(p.id)
                    setPaletteOpen(false)
                  }}
                  className="ui-btn flex w-full items-start gap-3 rounded-md border-0 px-3 py-2.5 text-left transition-colors duration-150"
                  style={
                    isActive
                      ? ghostBtnVars('var(--color-accent-muted)', 'var(--color-accent-muted)')
                      : ghostBtnVars('transparent')
                  }
                >
                  {/* Color swatch */}
                  <div className="flex shrink-0 gap-0.5 pt-0.5">
                    <span
                      className="inline-block h-5 w-5 rounded"
                      style={{ backgroundColor: p.preview.accent }}
                      aria-hidden
                    />
                    <span
                      className="inline-block h-5 w-5 rounded"
                      style={{ backgroundColor: p.preview.amber }}
                      aria-hidden
                    />
                    <span
                      className="inline-block h-5 w-5 rounded"
                      style={{
                        backgroundColor: p.preview.surface,
                        border: '1px solid var(--color-border)',
                      }}
                      aria-hidden
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-caption font-semibold',
                          isActive ? 'text-text-accent' : 'text-text-primary',
                        )}
                      >
                        {p.name}
                      </span>
                      {isActive && <Check className="h-3 w-3 text-text-accent" />}
                    </div>
                    <span className="mt-0.5 block text-micro font-normal normal-case tracking-normal text-text-tertiary">
                      {p.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
