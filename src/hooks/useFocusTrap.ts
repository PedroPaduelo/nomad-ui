/**
 * useFocusTrap — Trap keyboard focus within a container.
 *
 * Implements WAI-ARIA Dialog focus-trap pattern:
 * - Tab / Shift+Tab wraps at container boundaries
 * - Escape key triggers a callback
 * - Returns focus to the previously active element on deactivation
 * - Only activates when `isActive` is true
 *
 * @example
 * const { containerRef, activate, deactivate } = useFocusTrap({
 *   isActive: isModalOpen,
 *   onEscape: () => setModalOpen(false),
 *   onDeactivate: () => previousEl?.focus(),
 * })
 *
 * <div ref={containerRef}>
 *   <h2>Modal Title</h2>
 *   <input placeholder="First name" />
 *   <button>Submit</button>
 * </div>
 */

import { useRef, useEffect, useCallback } from 'react'
import {
  getFocusableElements,
  focusFirstElement,
  restoreFocus,
  announce,
} from '../lib/accessibility'

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

// ── Pilha de traps ativos ─────────────────────────────────
// Modais aninhados (ex.: Drawer da task → Modal de vincular knowledge)
// criam DOIS traps ativos ao mesmo tempo. Sem coordenação, cada um puxa o
// foco pro seu container no `focusin` do outro → recursão infinita
// ("Maximum call stack size exceeded"). Só o trap do TOPO da pilha reage
// a teclado/foco; os de baixo ficam passivos até o de cima sair.
const trapStack: symbol[] = []
const isTopTrap = (token: symbol) => trapStack[trapStack.length - 1] === token

/**
 * Remove TODAS as ocorrências de um token da pilha.
 * Defensivo: se um `activate()` duplicado escapou (ou o componente
 * desmontou sem passar por `deactivate`), um token órfão no topo faria
 * TODOS os modais seguintes ficarem surdos a teclado (isTopTrap sempre
 * false). Limpar por completo é sempre seguro — o token é único por hook.
 */
function dropFromStack(token: symbol): void {
  for (let i = trapStack.length - 1; i >= 0; i--) {
    if (trapStack[i] === token) trapStack.splice(i, 1)
  }
}

// ── Camadas flutuantes do kit ─────────────────────────────
// Menu, ContextMenu e Popover de components/ui renderizam o painel no body
// (portal) com `data-floating-layer`. Aberto de dentro de um Modal/Drawer, o
// painel fica FORA do contêiner do trap: sem esta exceção o focusin puxaria o
// foco de volta para o diálogo (o menu ficaria inalcançável por teclado) e o
// Esc dentro do menu fecharia o diálogo junto. O painel cuida do próprio
// teclado e devolve o foco ao gatilho, que está dentro do diálogo.
const FLOATING_LAYER_SELECTOR = '[data-floating-layer]'

function isInFloatingLayer(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(FLOATING_LAYER_SELECTOR) !== null
}

interface UseFocusTrapOptions {
  /** Whether the trap is currently active. */
  isActive: boolean
  /** Called when the user presses Escape while trapped. */
  onEscape?: () => void
  /** Called when the trap deactivates (before restoring focus). */
  onDeactivate?: () => void
  /** If true, scroll is locked on the body while active (default: true). */
  lockScroll?: boolean
  /** If true, focuses the first element on activation (default: true). */
  autoFocus?: boolean
  /** Selector for the initial focus target. Overrides first-focusable logic. */
  initialFocusSelector?: string
  /** If true, restores focus to the previously active element on deactivate (default: true). */
  restoreFocusOnDeactivate?: boolean
}

interface UseFocusTrapReturn {
  /** Ref to attach to the trapping container element. */
  containerRef: React.RefObject<HTMLElement | null>
  /** Imperatively activate the trap. */
  activate: () => void
  /** Imperatively deactivate the trap (restores focus). */
  deactivate: () => void
}

// ────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────

export function useFocusTrap(options: UseFocusTrapOptions): UseFocusTrapReturn {
  const {
    isActive,
    onEscape,
    onDeactivate,
    lockScroll = true,
    autoFocus = true,
    initialFocusSelector,
    restoreFocusOnDeactivate = true,
  } = options

  const containerRef = useRef<HTMLElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const isTrapActiveRef = useRef(false)
  const tokenRef = useRef<symbol>(Symbol('focus-trap'))

  // ── Opções vivas em ref ───────────────────────────────────
  // O caller quase sempre passa arrow function inline
  // (`onEscape={() => setOpen(false)}`). Se essas funções entrarem nas deps
  // dos handlers, `activate`/`deactivate` mudam de identidade a CADA render,
  // o effect de sincronia re-roda, e o trap desativa+reativa: o scroll
  // destrava/trava, o foco volta pro primeiro campo e o cursor do usuário é
  // roubado no meio da digitação. Guardando em ref, os handlers ficam
  // estáveis e o effect só reage a `isActive`.
  const latestRef = useRef({
    onEscape,
    onDeactivate,
    lockScroll,
    autoFocus,
    initialFocusSelector,
    restoreFocusOnDeactivate,
  })

  useEffect(() => {
    latestRef.current = {
      onEscape,
      onDeactivate,
      lockScroll,
      autoFocus,
      initialFocusSelector,
      restoreFocusOnDeactivate,
    }
  })

  // ── Scroll lock helpers ──

  const savedScrollRef = useRef<{
    scrollY: number
    overflow: string
    paddingRight: string
  } | null>(null)

  const lockBodyScroll = useCallback(() => {
    if (typeof document === 'undefined') return
    // Já travado (ativação duplicada): não sobrescreve o snapshot original.
    if (savedScrollRef.current) return

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    savedScrollRef.current = {
      scrollY: window.scrollY,
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    }

    document.body.style.overflow = 'hidden'
    // Compensate for scrollbar width to prevent layout shift
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }, [])

  const unlockBodyScroll = useCallback(() => {
    if (typeof document === 'undefined' || !savedScrollRef.current) return

    document.body.style.overflow = savedScrollRef.current.overflow
    document.body.style.paddingRight = savedScrollRef.current.paddingRight
    window.scrollTo(0, savedScrollRef.current.scrollY)
    savedScrollRef.current = null
  }, [])

  // ── Focus helpers ──

  const setInitialFocus = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    // O rAF pode disparar depois do trap já ter sido desativado
    // (modal fechado no mesmo frame). Não roube o foco nesse caso.
    if (!isTrapActiveRef.current) return

    const selector = latestRef.current.initialFocusSelector
    if (selector) {
      const target = container.querySelector<HTMLElement>(selector)
      if (target) {
        target.focus()
        return
      }
    }

    focusFirstElement(container)
  }, [])

  const handleTabKey = useCallback((event: KeyboardEvent) => {
    const container = containerRef.current
    if (!container) return

    const focusable = getFocusableElements(container)
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey) {
      // Shift+Tab: if focus is on the first element, wrap to last
      if (document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    } else {
      // Tab: if focus is on the last element, wrap to first
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }, [])

  // ── Keyboard handler ──

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isTrapActiveRef.current || !isTopTrap(tokenRef.current)) return
      if (isInFloatingLayer(event.target)) return

      if (event.key === 'Tab') {
        handleTabKey(event)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        latestRef.current.onEscape?.()
      }
    },
    [handleTabKey],
  )

  // ── Focus-in handler (keep focus inside on external clicks) ──

  const handleFocusIn = useCallback((event: FocusEvent) => {
    if (!isTrapActiveRef.current || !isTopTrap(tokenRef.current)) return

    const container = containerRef.current
    if (!container) return
    if (isInFloatingLayer(event.target)) return

    // If focus moved outside the container, pull it back
    if (!container.contains(event.target as Node)) {
      // Diálogo aberto por um item de menu: o "elemento anterior" capturado
      // na ativação é o item, que some com o menu. O menu devolve o foco ao
      // gatilho logo depois (e este handler o puxa de volta para cá): esse
      // gatilho vira o alvo do retorno de foco quando o diálogo fechar.
      const previous = previousFocusRef.current
      if (
        event.target instanceof HTMLElement &&
        (!previous || !previous.isConnected || isInFloatingLayer(previous))
      ) {
        previousFocusRef.current = event.target
      }
      const focusable = getFocusableElements(container)
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        container.focus()
      }
    }
  }, [])

  // ── Activation / deactivation ──

  const activate = useCallback(() => {
    if (typeof document === 'undefined') return
    // Idempotente: reativar um trap já ativo não empilha token duplicado
    // nem re-captura o elemento previamente focado.
    if (isTrapActiveRef.current) return

    isTrapActiveRef.current = true
    // Capturado APENAS na transição false→true. Se fosse recapturado a cada
    // ativação, o "elemento anterior" viraria um campo de dentro do próprio
    // modal — e o foco nunca voltaria pro botão que abriu.
    previousFocusRef.current = document.activeElement as HTMLElement | null
    trapStack.push(tokenRef.current)

    if (latestRef.current.lockScroll) lockBodyScroll()

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    if (latestRef.current.autoFocus) {
      // Wait one frame for the container to be rendered
      requestAnimationFrame(setInitialFocus)
    }
  }, [handleKeyDown, handleFocusIn, lockBodyScroll, setInitialFocus])

  const deactivate = useCallback(() => {
    if (!isTrapActiveRef.current) return

    isTrapActiveRef.current = false
    dropFromStack(tokenRef.current)
    latestRef.current.onDeactivate?.()

    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('focusin', handleFocusIn)

    unlockBodyScroll()

    if (latestRef.current.restoreFocusOnDeactivate) {
      restoreFocus(previousFocusRef.current)
    }
    previousFocusRef.current = null
  }, [handleKeyDown, handleFocusIn, unlockBodyScroll])

  // ── Sync with isActive ──
  // `activate`/`deactivate` são estáveis (só dependem de callbacks estáveis),
  // então este effect roda somente quando `isActive` muda de verdade.

  useEffect(() => {
    if (isActive) {
      activate()
    } else {
      deactivate()
    }
  }, [isActive, activate, deactivate])

  // ── Cleanup de desmonte ───────────────────────────────────
  // Rede de segurança para desmonte abrupto (rota trocou, pai sumiu,
  // Suspense descartou a árvore): destrava o scroll, solta os listeners e
  // tira o token da pilha mesmo que `deactivate` não tenha sido chamado.
  useEffect(() => {
    const token = tokenRef.current
    return () => {
      deactivate()
      dropFromStack(token)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      unlockBodyScroll()
    }
  }, [deactivate, handleKeyDown, handleFocusIn, unlockBodyScroll])

  // ── Screen reader announcement ──

  useEffect(() => {
    if (isActive && containerRef.current) {
      const title = containerRef.current.querySelector('[data-focus-trap-title]')?.textContent
      if (title) {
        announce(title, 'assertive')
      }
    }
  }, [isActive])

  return { containerRef, activate, deactivate }
}
