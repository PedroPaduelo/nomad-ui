// ── CommandPalette — busca e navegação unificadas (⌘K / Ctrl+K) ─────────
//
// Paleta de comandos no estilo Linear / GitHub / Notion: um overlay com um
// campo de busca e uma lista de itens agrupados por seção. É a paleta do
// agent-package com o conteúdo como parâmetro: lá os itens (páginas,
// projetos, resultados da busca global e ações) vinham de
// `commandPaletteItems.tsx`, do router e dos stores do produto. Aqui o app
// passa tudo por props:
//   • `items`        → itens fixos (navegar, ações), filtrados aqui pelo
//                      texto digitado (rótulo + `keywords`, sem acento).
//   • `searchItems`  → resultados do servidor para a consulta atual; já
//                      casam com o texto, não passam pelo filtro local.
//   • `onQueryChange`→ avisa a consulta, para o app buscar no servidor.
//   • `sections`     → ordem canônica das seções.
//
// Quem abre e fecha é o app (`isOpen`/`onClose`), por exemplo com o atalho
// ⌘K / Ctrl+K. Esc fecha, setas navegam, Enter executa o item ativo.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { Label } from './Label'

// ── Modelo de item ────────────────────────────────────────

export interface CommandItem {
  id: string
  section: string
  label: string
  icon: ReactNode
  /** Texto extra usado no filtro (não exibido). */
  keywords?: string
  /** Rótulo curto à direita (ex: nome do projeto). */
  hint?: string
  onSelect: () => void
}

export type CommandSearchStatus = 'idle' | 'loading' | 'error'

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  /** Itens fixos (navegar, ações), filtrados pelo texto digitado. */
  items: readonly CommandItem[]
  /** Resultados do servidor para a consulta atual (não passam pelo filtro local). */
  searchItems?: readonly CommandItem[]
  /** Estado da busca no servidor, anunciado numa região `role="status"`. */
  searchStatus?: CommandSearchStatus
  /** Chamado a cada mudança do texto (e com '' ao abrir). */
  onQueryChange?: (query: string) => void
  /** Ordem das seções. Seção fora da lista vai para o fim, na ordem de chegada. */
  sections?: readonly string[]
  /** Fecha a paleta depois de `onSelect` (padrão: sim). */
  closeOnSelect?: boolean
  placeholder?: string
  /** Nome acessível do campo. */
  inputLabel?: string
  /** Nome acessível do diálogo. */
  ariaLabel?: string
  emptyMessage?: string
  loadingMessage?: string
  errorMessage?: string
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Filtra os itens fixos pela consulta (rótulo + keywords, sem acento), junta
 * os resultados do servidor e ordena pela seção canônica, preservando a ordem
 * interna de cada seção.
 */
export function filterCommandItems(
  items: readonly CommandItem[],
  query: string,
  searchItems: readonly CommandItem[] = [],
  sections: readonly string[] = [],
): CommandItem[] {
  const q = normalize(query.trim())
  const base = q
    ? items.filter((it) => normalize(`${it.label} ${it.keywords ?? ''}`).includes(q))
    : [...items]
  const all = q ? [...base, ...searchItems] : base
  const rank = (section: string) => {
    const i = sections.indexOf(section)
    return i === -1 ? sections.length : i
  }
  return all.sort((a, b) => rank(a.section) - rank(b.section))
}

export function CommandPalette({
  isOpen,
  onClose,
  items,
  searchItems,
  searchStatus = 'idle',
  onQueryChange,
  sections,
  closeOnSelect = true,
  placeholder = 'Buscar...',
  inputLabel = 'Buscar ou navegar',
  ariaLabel = 'Paleta de comandos',
  emptyMessage = 'Nenhum resultado encontrado.',
  loadingMessage = 'Buscando conteúdo…',
  errorMessage = 'A busca de conteúdo falhou.',
}: CommandPaletteProps) {
  const close = onClose
  const [query, setQueryState] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const setQuery = useCallback(
    (next: string) => {
      setQueryState(next)
      onQueryChange?.(next)
    },
    [onQueryChange],
  )

  // Foca o input e zera o estado ao abrir. O foco é imediato: com um atraso,
  // um Esc (ou uma letra) digitado logo depois do ⌘K caía no <body>.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- zera a busca na abertura (igual ao agent-package)
      setQuery('')
      setActiveIndex(0)
      inputRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na abertura
  }, [isOpen])

  // Esc fecha a paleta com o foco em qualquer lugar (APG: Esc fecha o
  // diálogo), não só quando o foco está dentro dela.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  // Lock do scroll do body enquanto aberto.
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const filtered = useMemo(
    () => filterCommandItems(items, query, searchItems, sections),
    [items, query, searchItems, sections],
  )

  const select = useCallback(
    (item: CommandItem) => {
      item.onSelect()
      if (closeOnSelect) close()
    },
    [close, closeOnSelect],
  )

  // Clampa o índice ativo quando a lista muda.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clampa o índice quando a lista muda (igual ao agent-package)
    setActiveIndex((i) => (filtered.length === 0 ? 0 : Math.min(i, filtered.length - 1)))
  }, [filtered.length])

  // ── Teclado: setas e Enter (o Esc é global, acima) ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) =>
          filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length,
        )
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[activeIndex]
        if (item) select(item)
        return
      }
    },
    [filtered, activeIndex, select],
  )

  // Mantém o item ativo visível durante a navegação por teclado.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  if (!isOpen) return null

  // Índice absoluto por item, para saber onde inserir os cabeçalhos de seção.
  let renderedSection: string | null = null

  return (
    <ModalPortal>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- clique no backdrop fecha; o Esc global cobre o teclado */}
      <div
        className="fixed inset-0 z-110 flex items-start justify-center p-4 pt-[12vh] backdrop-blur-xs"
        style={{ backgroundColor: 'var(--backdrop-bg)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- teclado (setas/Enter) do diálogo; herdado do agent-package */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border shadow-lg"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--surface-raised)',
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Input */}
          <div
            className="flex items-center gap-2.5 border-b px-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              placeholder={placeholder}
              aria-label={inputLabel}
              className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-hidden"
            />
            <kbd className="hidden shrink-0 select-none items-center rounded border border-border bg-surface-body px-1.5 py-0.5 text-micro font-medium text-text-tertiary sm:flex">
              Esc
            </kbd>
          </div>

          {/* Lista */}
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-tertiary">{emptyMessage}</div>
            ) : (
              filtered.map((item, index) => {
                const showHeader = item.section !== renderedSection
                renderedSection = item.section
                const isActive = index === activeIndex
                return (
                  <div key={item.id}>
                    {showHeader && (
                      <Label as="div" className="block px-4 pb-1 pt-2">
                        {item.section}
                      </Label>
                    )}
                    <button
                      type="button"
                      data-index={index}
                      onClick={() => select(item)}
                      onMouseMove={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-accent-muted text-text-accent'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                          isActive ? 'text-text-accent' : 'text-text-tertiary'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint && (
                        <span className="shrink-0 rounded bg-surface-overlay px-1.5 py-0.5 text-micro font-medium uppercase tracking-wider text-text-tertiary">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Estado da busca de conteúdo no servidor */}
          <div role="status" aria-live="polite" className="px-4 empty:hidden">
            {query.trim() && searchStatus === 'error' ? (
              <p className="pb-2 text-caption text-text-tertiary">{errorMessage}</p>
            ) : query.trim() && searchStatus === 'loading' ? (
              <p className="pb-2 text-caption text-text-tertiary">{loadingMessage}</p>
            ) : null}
          </div>

          {/* Rodapé com dicas de teclado */}
          <div
            className="flex items-center gap-4 border-t px-4 py-2 text-caption text-text-tertiary"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              navegar
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-surface-body px-1 text-micro">
                Esc
              </kbd>
              fechar
            </span>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
