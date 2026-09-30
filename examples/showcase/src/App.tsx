import { Home, Layers, Palette, Sparkles, Moon, Monitor, Sun } from 'lucide-react'
import {
  Label,
  MainLayout,
  PALETTES,
  Segmented,
  Select,
  Toaster,
  useResolvedTheme,
  useThemeStore,
  type PaletteId,
  type SidebarItem,
  type SidebarSection,
  type Theme,
} from '@nomad/ui'
import { sections } from './registry'
import { readParams } from './url'

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <Sun className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'dark', label: 'Escuro', icon: <Moon className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'system', label: 'Sistema', icon: <Monitor className="h-3.5 w-3.5" aria-hidden /> },
]

/** Marca da Nomad (igual à da seção da barra Nomad). */
function NommandMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Nommand">
      <rect width="32" height="32" rx="8" fill="var(--mark-bg)" />
      <g
        fill="none"
        stroke="var(--mark-on)"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.5 22.5V9.5l11 13v-13" />
      </g>
    </svg>
  )
}

/** Seletores de paleta (10) e de tema: mudam o app inteiro, como o ThemeSwitcher.
 *  Em telas pequenas (<sm) some o rótulo e o resolved-theme para caber no header. */
function AppearanceControls() {
  const theme = useThemeStore((s) => s.theme)
  const palette = useThemeStore((s) => s.palette)
  const setTheme = useThemeStore((s) => s.setTheme)
  const setPalette = useThemeStore((s) => s.setPalette)
  const resolved = useResolvedTheme()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="hidden items-center gap-2 text-caption text-text-secondary sm:flex">
        Paleta
        <Select
          sm
          value={palette}
          onChange={(e) => setPalette(e.target.value as PaletteId)}
          aria-label="Paleta"
        >
          {PALETTES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </label>
      {/* Mobile: tema em select compacto (a paleta troca pela seção Temas) */}
      <Select
        sm
        className="sm:hidden"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        aria-label="Tema"
      >
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
        <option value="system">Sistema</option>
      </Select>
      <div className="hidden sm:block">
        <Segmented options={THEME_OPTIONS} value={theme} onChange={setTheme} aria-label="Tema" />
      </div>
      <span
        className="hidden text-caption text-text-tertiary sm:inline"
        data-testid="resolved-theme"
      >
        {resolved === 'dark' ? 'escuro' : 'claro'}
      </span>
    </div>
  )
}

/** Encaixes da sidebar (4 entradas fixas) e seus ícones. */
type SidebarEntry = {
  key: string
  label: string
  icon: React.ReactNode
  href: string
  matches: (id: string | null) => boolean
}

const SIDEBAR_ENTRIES: SidebarEntry[] = [
  {
    key: 'inicio',
    label: 'Início',
    icon: <Home className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    href: '#inicio',
    matches: (id) => id === null,
  },
  {
    key: 'componentes',
    label: 'Componentes',
    icon: <Layers className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    href: '#componentes',
    matches: (id) =>
      id === 'botoes' ||
      id === 'formulario' ||
      id === 'sobreposicoes' ||
      id === 'banner-estados' ||
      id === 'layout',
  },
  {
    key: 'temas',
    label: 'Temas',
    icon: <Palette className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    href: '#temas',
    matches: (id) => id === 'temas' || id === 'paletas',
  },
  {
    key: 'barra-nomad',
    label: 'Barra Nomad',
    icon: <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    href: '#barra-nomad',
    matches: (id) => id === 'barra-nomad',
  },
]

export function App() {
  const params = readParams()
  const visible = params.section ? sections.filter((s) => s.id === params.section) : sections
  const currentId = params.section ?? null

  const sidebarSections: SidebarSection[] = [
    {
      items: SIDEBAR_ENTRIES.map<SidebarItem>((e) => ({
        key: e.key,
        label: e.label,
        icon: e.icon,
        href: e.href,
        current: e.matches(currentId),
      })),
    },
  ]

  const content = (
    <div className="flex min-w-0 flex-col gap-12">
      {/* Início: cabeçalho + cards das 4 áreas */}
      <section
        id="inicio"
        aria-labelledby="inicio-title"
        className="flex scroll-mt-20 flex-col gap-4"
        data-showcase-section="inicio"
      >
        <div>
          <Label as="p" className="mb-1">
            Início
          </Label>
          <h2 id="inicio-title" className="text-title text-text-primary">
            Vitrine @nomad/ui
          </h2>
          <p className="mt-1 max-w-[90ch] text-body text-text-secondary">
            O kit, o tema e a barra Nomad compartilhados por todos os apps. Troque a paleta e o
            modo (claro/escuro) na barra superior — tudo aqui responde na hora.
          </p>
        </div>
        <div
          id="componentes"
          aria-label="Áreas da vitrine"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {SIDEBAR_ENTRIES.filter((e) => e.key !== 'inicio').map((e) => (
            <a
              key={e.key}
              href={e.href}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface-base p-4 transition-colors hover:border-border-hover hover:bg-surface-raised"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-muted text-text-accent">
                {e.icon}
              </span>
              <p className="text-body font-semibold text-text-primary">{e.label}</p>
              <p className="text-caption text-text-secondary">
                Vá para a área de {e.label.toLowerCase()} da vitrine.
              </p>
            </a>
          ))}
        </div>
      </section>

      {visible.map((s) => (
        <section
          key={s.id}
          id={s.id}
          aria-labelledby={`${s.id}-title`}
          className="flex scroll-mt-20 flex-col gap-4"
          data-showcase-section={s.id}
        >
          <div>
            <Label as="p" className="mb-1">
              {s.group}
            </Label>
            <h2 id={`${s.id}-title`} className="text-subtitle text-text-primary">
              {s.title}
            </h2>
            {s.description ? (
              <p className="mt-1 max-w-[90ch] text-body text-text-secondary">{s.description}</p>
            ) : null}
          </div>
          {s.render()}
        </section>
      ))}
      {visible.length === 0 ? (
        <p className="text-body text-text-secondary">Nenhuma seção com esse id.</p>
      ) : null}
    </div>
  )

  if (params.bare) return <main className="p-6">{content}</main>

  return (
    <MainLayout
      sidebar={{
        sections: sidebarSections,
        brand: { initial: 'N', name: 'Vitrine', subtitle: '@nomad/ui · v0' },
        ariaLabel: 'Navegação da vitrine',
      }}
      sidebarCollapsed={false}
      onToggleSidebar={() => {}}
      header={{
        brand: (
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <NommandMark size={20} />
            Vitrine @nomad/ui
          </div>
        ),
        actions: <AppearanceControls />,
      }}
      contentMax={false}
      contentPadding="p-6"
      mainAriaLabel="Conteúdo da vitrine @nomad/ui"
    >
      {content}
      <Toaster position="bottom-right" />
    </MainLayout>
  )
}