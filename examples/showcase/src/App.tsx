import { Moon, Monitor, Sun } from 'lucide-react'
import {
  Label,
  PALETTES,
  Segmented,
  Select,
  useResolvedTheme,
  useThemeStore,
  type PaletteId,
  type Theme,
} from '@nomad/ui'
import { sections, GROUP_ORDER } from './registry'
import { readParams } from './url'

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <Sun className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'dark', label: 'Escuro', icon: <Moon className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'system', label: 'Sistema', icon: <Monitor className="h-3.5 w-3.5" aria-hidden /> },
]

/** Seletores de paleta (10) e de tema: mudam o app inteiro, como o ThemeSwitcher. */
function AppearanceControls() {
  const theme = useThemeStore((s) => s.theme)
  const palette = useThemeStore((s) => s.palette)
  const setTheme = useThemeStore((s) => s.setTheme)
  const setPalette = useThemeStore((s) => s.setPalette)
  const resolved = useResolvedTheme()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-caption text-text-secondary">
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
      <Segmented options={THEME_OPTIONS} value={theme} onChange={setTheme} aria-label="Tema" />
      <span className="text-caption text-text-tertiary" data-testid="resolved-theme">
        {resolved === 'dark' ? 'escuro' : 'claro'}
      </span>
    </div>
  )
}

// A URL e o registro não mudam durante a vida da página.
const params = readParams()
const groups = [...new Set(sections.map((s) => s.group))].sort((a, b) => {
  const ra = GROUP_ORDER.indexOf(a)
  const rb = GROUP_ORDER.indexOf(b)
  return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb)
})

export function App() {
  const visible = params.section ? sections.filter((s) => s.id === params.section) : sections

  const content = (
    <div className="flex min-w-0 flex-col gap-10">
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface-base px-6 py-3">
        <div className="min-w-0">
          <h1 className="text-heading text-text-primary">@nomad/ui — vitrine</h1>
          <p className="text-caption text-text-tertiary">
            Kit, tema e barra Nomad nas 10 paletas × claro/escuro.
          </p>
        </div>
        <AppearanceControls />
      </header>
      <div className="flex w-full">
        <nav
          aria-label="Seções"
          className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-56 shrink-0 overflow-y-auto border-r border-border bg-surface-base px-3 py-4 lg:block"
        >
          {groups.map((g) => (
            <div key={g} className="mb-4">
              <Label as="p" className="mb-1 px-2">
                {g}
              </Label>
              <ul>
                {sections
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="block rounded-md px-2 py-1 text-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
        <main className="min-w-0 flex-1 px-6 py-6">{content}</main>
      </div>
    </div>
  )
}
