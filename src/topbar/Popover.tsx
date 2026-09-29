import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'

type FocusIntent = 'first' | 'last' | 'panel'

/** Props que o gatilho do popover precisa receber (botão). */
export type PopoverTriggerProps = {
  ref: Ref<HTMLButtonElement>
  'aria-haspopup': 'menu' | 'dialog'
  'aria-expanded': boolean
  'aria-controls': string | undefined
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void
}

type CloseOptions = { restoreFocus?: boolean }
const CloseCtx = createContext<(opts?: CloseOptions) => void>(() => {})

/** Fecha o popover em que o componente está (itens e links com ação própria). */
export function usePopoverClose() {
  return useContext(CloseCtx)
}

/** Margem mínima entre o painel e a borda da janela (igual ao Popover da Conta). */
const VIEWPORT_MARGIN = 16
const ITEM_SELECTOR = '[data-ntb-item]:not([aria-disabled="true"])'

export type PopoverProps = {
  /** `menu`: lista de ações (setas navegam). `dialog`: conteúdo livre (grade de apps, cartão da conta). */
  kind: 'menu' | 'dialog'
  /** Nome acessível do painel. */
  label: string
  /** Largura do painel em px (encolhe para caber na janela). */
  width: number
  /** Lado do painel alinhado ao gatilho. */
  align?: 'start' | 'end'
  /** Controle externo (opcional): aberto/fechado. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger: (props: PopoverTriggerProps) => ReactNode
  children: ReactNode
  className?: string
  /**
   * Em vez de flutuar como popover (position: absolute), renderiza o painel em fluxo (position: static) dentro do
   * ancestral. Mantém largura, conteúdo, navegação por teclado (Esc, setas) e fechamento por clique fora. Pensado para
   * a vitrine empilhar 4 estados sem portal; apps reais continuam usando o portal (default `false`).
   */
  inlinePanel?: boolean
}

/**
 * Popover da barra (sem portal, sem dependência): o painel abre 4 px abaixo do gatilho, alinhado ao início ou ao
 * fim, e encolhe para caber na janela. Clique fora e `Esc` fecham e devolvem o foco ao gatilho; sair com `Tab`
 * fecha. Aberto pelo teclado (Enter, Espaço, ↓), o foco vai para o 1º item; ↑ no gatilho vai para o último.
 *
 * Com `inlinePanel`, o painel é renderizado em fluxo (position: static) — a vitrine usa para empilhar os 4 estados
 * sem portal.
 */
export function Popover({
  kind,
  label,
  width,
  align = 'end',
  open: controlled,
  onOpenChange,
  trigger,
  children,
  className,
  inlinePanel = false,
}: PopoverProps) {
  const [inner, setInner] = useState(false)
  const open = controlled ?? inner
  const [panelWidth, setPanelWidth] = useState(width)
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const intent = useRef<FocusIntent>('first')
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  })

  const setOpen = useCallback(
    (value: boolean) => {
      if (controlled === undefined) setInner(value)
      onOpenChangeRef.current?.(value)
    },
    [controlled],
  )

  const close = useCallback(
    (opts: CloseOptions = {}) => {
      setOpen(false)
      if (opts.restoreFocus) button.current?.focus()
      else {
        // Se o foco sumiu junto com o painel (item desmontado), volta ao gatilho; se outra peça pegou o foco, respeita.
        setTimeout(() => {
          const active = document.activeElement
          if (!active || active === document.body) button.current?.focus()
        }, 0)
      }
    },
    [setOpen],
  )

  const measure = useCallback(() => {
    const r = button.current?.getBoundingClientRect()
    if (!r) return
    const available =
      align === 'end' ? r.right - VIEWPORT_MARGIN : window.innerWidth - r.left - VIEWPORT_MARGIN
    setPanelWidth(Math.max(160, Math.min(width, Math.floor(available))))
  }, [align, width])

  useLayoutEffect(() => {
    if (open) measure()
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    const items = () =>
      Array.from(panel.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])
    const target =
      intent.current === 'panel' ? null : intent.current === 'last' ? items().at(-1) : items()[0]
    ;(target ?? panel.current)?.focus()
    intent.current = 'first'

    function onPointer(e: PointerEvent) {
      if (root.current && !root.current.contains(e.target as Node)) close()
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close({ restoreFocus: true })
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', measure)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', measure)
    }
  }, [open, close, measure])

  function onTriggerClick(e: MouseEvent<HTMLButtonElement>) {
    // detail 0 = ativado pelo teclado (Enter/Espaço): o foco vai para o 1º item.
    intent.current = e.detail === 0 ? 'first' : 'panel'
    setOpen(!open)
  }

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || (e.key === 'ArrowUp' && kind === 'menu')) {
      e.preventDefault()
      intent.current = e.key === 'ArrowUp' ? 'last' : 'first'
      if (!open) setOpen(true)
      else {
        const list = Array.from(panel.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])
        ;(e.key === 'ArrowUp' ? list.at(-1) : list[0])?.focus()
      }
    }
  }

  function onPanelKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const list = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
      (el) => el.dataset.ntbItem !== 'grid',
    )
    if (list.length === 0) return
    const i = list.indexOf(document.activeElement as HTMLElement)
    let next = 0
    if (e.key === 'ArrowDown') next = (i + 1) % list.length
    else if (e.key === 'ArrowUp')
      next = i < 0 ? list.length - 1 : (i - 1 + list.length) % list.length
    else if (e.key === 'End') next = list.length - 1
    e.preventDefault()
    list[next].focus()
  }

  function onBlur(e: FocusEvent<HTMLDivElement>) {
    const to = e.relatedTarget as Node | null
    if (open && to && root.current && !root.current.contains(to)) setOpen(false)
  }

  return (
    <div
      className={`ntb ntb-pop-root${className ? ` ${className}` : ''}${
        inlinePanel ? ' ntb-pop-root--inline' : ''
      }`}
      ref={root}
      onBlur={onBlur}
    >
      {trigger({
        ref: button,
        'aria-haspopup': kind,
        'aria-expanded': open,
        'aria-controls': open ? panelId : undefined,
        onClick: onTriggerClick,
        onKeyDown: onTriggerKey,
      })}
      {open && (
        <div
          ref={panel}
          id={panelId}
          className={`ntb-panel ntb-panel--${align}${inlinePanel ? ' ntb-panel--inline' : ''}`}
          role={kind}
          aria-label={label}
          tabIndex={-1}
          style={
            inlinePanel
              ? { width: '100%', maxWidth: `min(${panelWidth}px, 100%)` }
              : { width: panelWidth }
          }
          onKeyDown={onPanelKey}
        >
          <CloseCtx.Provider value={close}>{children}</CloseCtx.Provider>
        </div>
      )}
    </div>
  )
}
