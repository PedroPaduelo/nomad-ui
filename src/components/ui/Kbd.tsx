import { type HTMLAttributes } from 'react'

// ── Kbd — cápsula para teclas (⌘K, Esc) ──────────────────────────
// Spec 02 §13 + PLANO §2.1: papel `micro` (mono), pad 1px 6px, border 1px, radius 4px,
// bg surface-body, cor text-tertiary.
//
// Mono por padrão (letra de tecla: `⌘K`, `Esc`, `F2`). Quando o conteúdo é um
// **símbolo Unicode** (⌘, ⇧, ⌥, ⌃, ↻, ⏎, ⌫…), a fonte de mono do tema não tem o
// glifo e o navegador desenha a "caixa vazia" (▯) — foi o que apareceu na
// barra como "▯K comandos". Nesse caso a peça usa a fonte de texto (`font-sans`), que cai no
// system-ui com esses glifos. A regra base `code, pre, kbd, samp { font-family:
// var(--font-mono) }` do globals.css é de elemento e não sai por classe: por isso
// `symbol` marca `data-kbd-symbol` e a folha do pacote sobrescreve com seletor de
// atributo (especificidade maior que a regra de elemento), como fez o contorno
// `font-sans` no motor.

export type KbdProps = HTMLAttributes<HTMLElement> & {
  /** Conteúdo com glifo Unicode de tecla (⌘, ⇧, ⌥, ↻…): usa a fonte de texto. */
  symbol?: boolean
  /** Force mono mesmo com símbolo (padrão: falso quando `symbol`). */
  mono?: boolean
}

export function Kbd({ children, className = '', symbol = false, mono, ...props }: KbdProps) {
  const useSans = symbol && mono !== true
  return (
    <kbd
      className={
        'inline-flex items-center rounded-sm border border-border bg-surface-body px-1.5 py-px ' +
        `text-micro leading-none text-text-tertiary ${useSans ? 'font-sans' : 'font-mono'} ` +
        className
      }
      data-kbd-symbol={useSans ? '' : undefined}
      {...props}
    >
      {children}
    </kbd>
  )
}
