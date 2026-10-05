import { type ReactNode } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'

// ── Tabs — abas (padrão APG "Tabs") ───────────────────────────────
// Sobre o Tabs headless do Base UI (FE-08): role tablist/tab/tabpanel com
// aria-selected/aria-controls, ←/→ trocam de aba (↑/↓ na vertical), Home/End
// vão às pontas, a navegação dá a volta e só a aba ativa entra na ordem de
// Tab (roving tabindex). A aba recebe o foco e já é ativada (ativação
// automática: painéis do app são baratos de montar).
//
// Uso:
//   <Tabs value={aba} onValueChange={setAba}>
//     <TabsList aria-label="Formato">
//       <Tab value="json">JSON</Tab>
//       <Tab value="toml">TOML</Tab>
//     </TabsList>
//     <TabsPanel value="json">…</TabsPanel>
//     <TabsPanel value="toml">…</TabsPanel>
//   </Tabs>

export interface TabsProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  children: ReactNode
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Tabs<T extends string>({
  value,
  onValueChange,
  children,
  orientation = 'horizontal',
  className,
}: TabsProps<T>) {
  return (
    <BaseTabs.Root
      value={value}
      // O Base UI tipa o valor como `any`; só chegam aqui os `value` das
      // <Tab> deste grupo, que o chamador declarou como T.
      onValueChange={(next: T) => onValueChange(next)}
      orientation={orientation}
      className={className}
    >
      {children}
    </BaseTabs.Root>
  )
}

export interface TabsListProps {
  children: ReactNode
  /** Nome do grupo de abas (obrigatório quando não há título visível ligado). */
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
}

export function TabsList({ children, className = '', ...aria }: TabsListProps) {
  return (
    <BaseTabs.List
      activateOnFocus
      loopFocus
      className={'flex flex-wrap gap-1 border-b border-border ' + className}
      {...aria}
    >
      {children}
    </BaseTabs.List>
  )
}

export interface TabProps {
  value: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function Tab({ value, children, disabled, className = '' }: TabProps) {
  return (
    <BaseTabs.Tab
      value={value}
      disabled={disabled}
      className={
        '-mb-px rounded-t-md border-b-2 px-3 py-1.5 text-xs font-medium transition-colors outline-hidden ' +
        'focus-visible:ring-2 focus-visible:ring-accent ' +
        'border-transparent text-text-secondary hover:text-text-primary ' +
        'data-active:border-accent data-active:text-text-accent ' +
        'data-disabled:cursor-not-allowed data-disabled:text-text-tertiary ' +
        className
      }
    >
      {children}
    </BaseTabs.Tab>
  )
}

export interface TabsPanelProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsPanel({ value, children, className = '' }: TabsPanelProps) {
  return (
    <BaseTabs.Panel value={value} className={'outline-hidden ' + className}>
      {children}
    </BaseTabs.Panel>
  )
}
