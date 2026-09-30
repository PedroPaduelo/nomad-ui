// ── Palettes — all available color schemes for the app ─────────────────
//
// Each palette defines a full set of CSS custom property values for
// dark and light modes. The active palette is persisted in localStorage
// and applied by PaletteProvider (useLayoutEffect) on :root; before the
// bundle loads, the blocking script in index.html applies the snapshot
// saved by lib/themeBoot, so a reload never paints the wrong palette.
//
// Contraste (FE-A2): todo token usado como texto (text.primary/secondary/
// tertiary/accent/amber e os status) tem >= 4.5:1 sobre as 4 superfícies
// do modo, e onAccent/onAmber sobre o preenchimento. `accent.main` e
// `amber.main` são PREENCHIMENTO (botão, barra, borda): como cor de texto use
// `text-accent`/`text-amber` (o Tailwind mapeia para text.accent/text.amber)
// ou `var(--color-text-accent)`. src/test/components/palette-contrast.test.ts
// trava isso para as 10 paletas nos dois modos.
//
// Adding a new palette: just add an entry to PALETTES.
// The ThemeSwitcher component reads this array and renders a picker.

export type PaletteId =
  | 'slate-blue-gold'
  | 'deep-teal-amber'
  | 'warm-stone-sage'
  | 'violet-cyan'
  | 'matrix-green'
  | 'terminator-red'
  | 'blueprint-orange'
  | 'terracotta-editorial'
  | 'obsidian-magenta'
  | 'paper-newsprint'
  | 'nommand'

export interface PaletteColors {
  surfaces: {
    body: string
    base: string
    raised: string
    overlay: string
    /** Surface for code blocks and inline `code`. Defaults to `raised` when omitted. */
    code?: string
  }
  accent: {
    main: string
    hover: string
    muted: string
    strong: string
  }
  amber: {
    main: string
    hover: string
    muted: string
    strong: string
  }
  text: {
    primary: string
    secondary: string
    tertiary: string
    disabled: string
    accent: string
    inverse: string
    amber: string
    /** Foreground color for text rendered on top of `accent.main`. Picked per-palette to guarantee AA contrast. */
    onAccent: string
    /** Foreground color for text rendered on top of `amber.main`. */
    onAmber: string
  }
  borders: {
    default: string
    hover: string
    accent: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
    accentGlow: string
  }
  backdrop: string
  /**
   * Status semânticos palette-driven. Cada paleta tem um `status` próprio para
   * reforçar a identidade visual; quando omitido, `applyPalette` usa
   * `DEFAULT_STATUS`. `info` por convenção segue o accent LEGÍVEL da paleta
   * (`text.accent`, não `accent.main`): `accent.main` é preenchimento e, em
   * várias paletas, falharia o AA como texto sobre a superfície — PLANO §2.4.
   */
  status?: PaletteStatusColors
}

/**
 * As 4 cores de status de uma paleta. Usado tanto no campo `status` de
 * `PaletteColors` quanto no fallback global `DEFAULT_STATUS`.
 */
export interface PaletteStatusColors {
  success: string
  warning: string
  error: string
  info: string
}

export interface Palette {
  id: PaletteId
  name: string
  description: string
  preview: {
    accent: string
    amber: string
    surface: string
  }
  dark: PaletteColors
  light: PaletteColors
}

// ── Palette definitions ──────────────────────────────────────

export const PALETTES: Palette[] = [
  {
    id: 'slate-blue-gold',
    name: 'Slate Blue + Gold',
    description: 'Corporativo clean — Bloomberg meets Linear',
    preview: { accent: '#60a5fa', amber: '#f59e0b', surface: '#0f1219' },
    dark: {
      surfaces: {
        body: '#161b24',
        base: '#1d242f',
        raised: '#252c38',
        overlay: '#28313e',
      },
      accent: {
        main: '#60a5fa',
        hover: '#93c5fd',
        muted: 'rgba(96, 165, 250, 0.14)',
        strong: '#2563eb',
      },
      amber: {
        main: '#f59e0b',
        hover: '#fbbf24',
        muted: 'rgba(245, 158, 11, 0.14)',
        strong: '#d97706',
      },
      text: {
        primary: '#d6dde6',
        secondary: '#a2afc1',
        tertiary: '#8b9bb1',
        disabled: '#455263',
        accent: '#71b0ff',
        inverse: '#0f1219',
        amber: '#f59e0b',
        onAccent: '#0b1220',
        onAmber: '#0f1219',
      },
      borders: {
        default: 'rgba(255, 255, 255, 0.14)',
        hover: 'rgba(255, 255, 255, 0.16)',
        accent: 'rgba(96, 165, 250, 0.45)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.40)',
        md: '0 4px 12px rgba(0, 0, 0, 0.45)',
        lg: '0 12px 40px rgba(0, 0, 0, 0.55)',
        accentGlow: '0 0 20px rgba(96, 165, 250, 0.12)',
      },
      backdrop: 'rgba(10, 13, 18, 0.6)',
      status: {
        success: '#34d399',
        warning: '#fbbf24',
        error: '#ff8684',
        info: '#71b0ff',
      },
    },
    light: {
      surfaces: {
        body: '#eef1f5',
        base: '#f7f8fa',
        raised: '#ffffff',
        overlay: '#e8ecf1',
      },
      accent: {
        main: '#2563eb',
        hover: '#1d4ed8',
        muted: 'rgba(37, 99, 235, 0.10)',
        strong: '#1e40af',
      },
      amber: {
        main: '#b45309',
        hover: '#92400e',
        muted: 'rgba(217, 119, 6, 0.12)',
        strong: '#d97706',
      },
      text: {
        primary: '#172033',
        secondary: '#4b5868',
        tertiary: '#5e6a7c',
        disabled: '#b0bac6',
        accent: '#1855dc',
        inverse: '#f8f9fb',
        amber: '#a04800',
        onAccent: '#ffffff',
        onAmber: '#ffffff',
      },
      borders: {
        default: 'rgba(15, 23, 42, 0.10)',
        hover: 'rgba(15, 23, 42, 0.20)',
        accent: 'rgba(37, 99, 235, 0.35)',
      },
      shadows: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
        md: '0 4px 12px rgba(15, 23, 42, 0.08)',
        lg: '0 12px 40px rgba(15, 23, 42, 0.14)',
        accentGlow: '0 0 20px rgba(37, 99, 235, 0.08)',
      },
      backdrop: 'rgba(30, 41, 59, 0.45)',
      status: {
        success: '#00702e',
        warning: '#955000',
        error: '#c20011',
        info: '#1855dc',
      },
    },
  },
  {
    id: 'deep-teal-amber',
    name: 'Deep Teal + Amber',
    description: 'Enterprise-clean — Notion meets Stripe',
    preview: { accent: '#2dd4bf', amber: '#fbbf24', surface: '#0c1414' },
    dark: {
      surfaces: {
        body: '#0c1414',
        base: '#131c1d',
        raised: '#1a2628',
        overlay: '#243335',
      },
      accent: {
        main: '#2dd4bf',
        hover: '#5eead4',
        muted: 'rgba(45, 212, 191, 0.15)',
        strong: '#0f766e',
      },
      amber: {
        main: '#fbbf24',
        hover: '#fcd34d',
        muted: 'rgba(251, 191, 36, 0.15)',
        strong: '#b45309',
      },
      text: {
        primary: '#c8d4d2',
        secondary: '#a1b1af',
        tertiary: '#8e9d9b',
        disabled: '#3a4846',
        accent: '#2dd4bf',
        inverse: '#0c1414',
        amber: '#fbbf24',
        onAccent: '#06302b',
        onAmber: '#0c1414',
      },
      borders: {
        default: 'rgba(255, 255, 255, 0.08)',
        hover: 'rgba(255, 255, 255, 0.15)',
        accent: 'rgba(45, 212, 191, 0.4)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.35)',
        md: '0 4px 12px rgba(0, 0, 0, 0.4)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.45)',
        accentGlow: '0 0 20px rgba(45, 212, 191, 0.15)',
      },
      backdrop: 'rgba(12, 20, 20, 0.8)',
      status: {
        success: '#2dd4bf',
        warning: '#fbbf24',
        error: '#ff8583',
        info: '#2dd4bf',
      },
    },
    light: {
      surfaces: {
        body: '#f5f3ee',
        base: '#fbfaf6',
        raised: '#ffffff',
        overlay: '#efede6',
      },
      accent: {
        main: '#0f766e',
        hover: '#14b8a6',
        muted: 'rgba(15, 118, 110, 0.10)',
        strong: '#2dd4bf',
      },
      amber: {
        main: '#c66323',
        hover: '#d97706',
        muted: 'rgba(180, 83, 9, 0.10)',
        strong: '#fbbf24',
      },
      text: {
        primary: '#0c1414',
        secondary: '#3d4847',
        tertiary: '#636c6b',
        disabled: '#b0b8b7',
        accent: '#006d65',
        inverse: '#fbfaf6',
        amber: '#a04800',
        onAccent: '#fbfaf6',
        onAmber: '#0c1414',
      },
      borders: {
        default: 'rgba(0, 0, 0, 0.08)',
        hover: 'rgba(0, 0, 0, 0.15)',
        accent: 'rgba(15, 118, 110, 0.3)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.06)',
        md: '0 4px 12px rgba(0, 0, 0, 0.08)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.12)',
        accentGlow: '0 0 20px rgba(15, 118, 110, 0.10)',
      },
      backdrop: 'rgba(245, 243, 238, 0.8)',
      status: {
        success: '#006d65',
        warning: '#965000',
        error: '#c40012',
        info: '#006d65',
      },
    },
  },
  {
    id: 'warm-stone-sage',
    name: 'Warm Stone + Sage',
    description: 'Orgânico e editorial — Are.na meets Substack',
    preview: { accent: '#86efac', amber: '#fb923c', surface: '#171311' },
    dark: {
      surfaces: {
        body: '#171311',
        base: '#1e1a17',
        raised: '#262119',
        overlay: '#332c22',
      },
      accent: {
        main: '#86efac',
        hover: '#a7f3d0',
        muted: 'rgba(134, 239, 172, 0.12)',
        strong: '#16a34a',
      },
      amber: {
        main: '#fb923c',
        hover: '#fdba74',
        muted: 'rgba(251, 146, 60, 0.14)',
        strong: '#c2410c',
      },
      text: {
        primary: '#d4c8bc',
        secondary: '#b5a796',
        tertiary: '#a19384',
        disabled: '#4a4035',
        accent: '#86efac',
        inverse: '#171311',
        amber: '#fb923c',
        onAccent: '#14361e',
        onAmber: '#171311',
      },
      borders: {
        default: 'rgba(255, 255, 255, 0.06)',
        hover: 'rgba(255, 255, 255, 0.13)',
        accent: 'rgba(134, 239, 172, 0.35)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.35)',
        md: '0 4px 12px rgba(0, 0, 0, 0.40)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.45)',
        accentGlow: '0 0 20px rgba(134, 239, 172, 0.10)',
      },
      backdrop: 'rgba(23, 19, 17, 0.8)',
      status: {
        success: '#22c55e',
        warning: '#fbbf24',
        error: '#ff8280',
        info: '#86efac',
      },
    },
    light: {
      surfaces: {
        body: '#f7f5f0',
        base: '#fdfcfa',
        raised: '#ffffff',
        overlay: '#efece5',
      },
      accent: {
        main: '#008538',
        hover: '#22c55e',
        muted: 'rgba(22, 163, 74, 0.08)',
        strong: '#86efac',
      },
      amber: {
        main: '#d85528',
        hover: '#ea580c',
        muted: 'rgba(194, 65, 12, 0.08)',
        strong: '#fb923c',
      },
      text: {
        primary: '#1a1714',
        secondary: '#5c5246',
        tertiary: '#73685a',
        disabled: '#c4baa8',
        accent: '#007430',
        inverse: '#fdfcfa',
        amber: '#b23800',
        onAccent: '#fdfcfa',
        onAmber: '#171311',
      },
      borders: {
        default: 'rgba(0, 0, 0, 0.07)',
        hover: 'rgba(0, 0, 0, 0.14)',
        accent: 'rgba(22, 163, 74, 0.25)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 12px rgba(0, 0, 0, 0.07)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.10)',
        accentGlow: '0 0 20px rgba(22, 163, 74, 0.06)',
      },
      backdrop: 'rgba(247, 245, 240, 0.8)',
      status: {
        success: '#00702e',
        warning: '#965000',
        error: '#c30011',
        info: '#00702e',
      },
    },
  },
  {
    id: 'violet-cyan',
    name: 'Violet + Cyan',
    description: 'Ousado e tech-forward — Vercel meets Figma',
    preview: { accent: '#a78bfa', amber: '#22d3ee', surface: '#0f0d15' },
    dark: {
      surfaces: {
        body: '#0f0d15',
        base: '#16131f',
        raised: '#1e1a28',
        overlay: '#282334',
      },
      accent: {
        main: '#a78bfa',
        hover: '#c4b5fd',
        muted: 'rgba(167, 139, 250, 0.14)',
        strong: '#7c3aed',
      },
      amber: {
        main: '#22d3ee',
        hover: '#67e8f9',
        muted: 'rgba(34, 211, 238, 0.14)',
        strong: '#0891b2',
      },
      text: {
        primary: '#d0c8e0',
        secondary: '#a59dbe',
        tertiary: '#9189b0',
        disabled: '#3a3555',
        accent: '#ab8ffe',
        inverse: '#0f0d15',
        amber: '#22d3ee',
        onAccent: '#1f1140',
        onAmber: '#0f0d15',
      },
      borders: {
        default: 'rgba(255, 255, 255, 0.07)',
        hover: 'rgba(255, 255, 255, 0.14)',
        accent: 'rgba(167, 139, 250, 0.4)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.40)',
        md: '0 4px 12px rgba(0, 0, 0, 0.45)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.50)',
        accentGlow: '0 0 20px rgba(167, 139, 250, 0.12)',
      },
      backdrop: 'rgba(15, 13, 21, 0.8)',
      status: {
        success: '#34d399',
        warning: '#fbbf24',
        error: '#fc7474',
        info: '#ab8ffe',
      },
    },
    light: {
      surfaces: {
        body: '#f3f1f7',
        base: '#f9f8fc',
        raised: '#ffffff',
        overlay: '#edeaf3',
      },
      accent: {
        main: '#7c3aed',
        hover: '#8b5cf6',
        muted: 'rgba(124, 58, 237, 0.08)',
        strong: '#a78bfa',
      },
      amber: {
        main: '#0891b2',
        hover: '#22d3ee',
        muted: 'rgba(8, 145, 178, 0.08)',
        strong: '#67e8f9',
      },
      text: {
        primary: '#1a1625',
        secondary: '#4b4560',
        tertiary: '#6d6582',
        disabled: '#b8b0c8',
        accent: '#7833e7',
        inverse: '#f9f8fc',
        amber: '#006c86',
        onAccent: '#f9f8fc',
        onAmber: '#0f0d15',
      },
      borders: {
        default: 'rgba(0, 0, 0, 0.08)',
        hover: 'rgba(0, 0, 0, 0.15)',
        accent: 'rgba(124, 58, 237, 0.25)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 12px rgba(0, 0, 0, 0.07)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.10)',
        accentGlow: '0 0 20px rgba(124, 58, 237, 0.06)',
      },
      backdrop: 'rgba(243, 241, 247, 0.8)',
      status: {
        success: '#00702e',
        warning: '#954f00',
        error: '#c20011',
        info: '#7631e5',
      },
    },
  },
  {
    id: 'matrix-green',
    name: 'Matrix Green',
    description: 'Hacker terminal — phosphor on black, l33t aesthetic',
    preview: { accent: '#00ff88', amber: '#00cc66', surface: '#000000' },
    dark: {
      surfaces: {
        body: '#000000',
        base: '#0a0a0a',
        raised: '#101010',
        overlay: '#1a1a1a',
      },
      accent: {
        main: '#00ff88',
        hover: '#33ffaa',
        muted: 'rgba(0, 255, 136, 0.12)',
        strong: '#00cc66',
      },
      amber: {
        main: '#00cc66',
        hover: '#00ff88',
        muted: 'rgba(0, 204, 102, 0.12)',
        strong: '#009950',
      },
      text: {
        primary: '#aaffcc',
        secondary: '#5cb894',
        tertiary: '#4d9075',
        disabled: '#1f4a37',
        accent: '#00ff88',
        inverse: '#000000',
        amber: '#00cc66',
        onAccent: '#000000',
        onAmber: '#000000',
      },
      borders: {
        default: 'rgba(0, 255, 136, 0.10)',
        hover: 'rgba(0, 255, 136, 0.25)',
        accent: 'rgba(0, 255, 136, 0.50)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 255, 136, 0.10)',
        md: '0 4px 12px rgba(0, 255, 136, 0.15)',
        lg: '0 8px 32px rgba(0, 255, 136, 0.20)',
        accentGlow: '0 0 20px rgba(0, 255, 136, 0.40)',
      },
      backdrop: 'rgba(0, 0, 0, 0.85)',
      status: {
        success: '#00ff88',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#00ff88',
      },
    },
    light: {
      surfaces: {
        body: '#f0fff5',
        base: '#f5fff8',
        raised: '#ffffff',
        overlay: '#daf5e5',
      },
      accent: {
        main: '#008855',
        hover: '#00a866',
        muted: 'rgba(0, 136, 85, 0.10)',
        strong: '#00cc66',
      },
      amber: {
        main: '#008746',
        hover: '#00b366',
        muted: 'rgba(0, 153, 80, 0.10)',
        strong: '#00ff88',
      },
      text: {
        primary: '#0a2e1f',
        secondary: '#1e5238',
        tertiary: '#44745c',
        disabled: '#88a89a',
        accent: '#007246',
        inverse: '#ffffff',
        amber: '#00733b',
        onAccent: '#ffffff',
        onAmber: '#ffffff',
      },
      borders: {
        default: 'rgba(0, 136, 85, 0.15)',
        hover: 'rgba(0, 136, 85, 0.30)',
        accent: 'rgba(0, 136, 85, 0.50)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 136, 85, 0.06)',
        md: '0 4px 12px rgba(0, 136, 85, 0.08)',
        lg: '0 8px 32px rgba(0, 136, 85, 0.10)',
        accentGlow: '0 0 20px rgba(0, 136, 85, 0.10)',
      },
      backdrop: 'rgba(240, 255, 245, 0.8)',
      status: {
        success: '#007146',
        warning: '#00723a',
        error: '#c50012',
        info: '#007146',
      },
    },
  },
  {
    id: 'terminator-red',
    name: 'Terminator Red',
    description: 'Sci-fi military — chrome red on gunmetal, dystopian tactical',
    preview: { accent: '#ff3a3a', amber: '#ff6b35', surface: '#0a0a0c' },
    dark: {
      surfaces: {
        body: '#0a0a0c',
        base: '#111114',
        raised: '#18181c',
        overlay: '#22222a',
      },
      accent: {
        main: '#c91414',
        hover: '#ff5e5e',
        muted: 'rgba(255, 58, 58, 0.12)',
        strong: '#cc0000',
      },
      amber: {
        main: '#ff6b35',
        hover: '#ff8a5e',
        muted: 'rgba(255, 107, 53, 0.14)',
        strong: '#cc4400',
      },
      text: {
        primary: '#d8d8d8',
        secondary: '#9e9ea2',
        tertiary: '#8a8a92',
        disabled: '#3a3a42',
        accent: '#ff5d55',
        inverse: '#0a0a0c',
        amber: '#ff6e3a',
        onAccent: '#ffffff',
        onAmber: '#0a0a0c',
      },
      borders: {
        default: 'rgba(255, 58, 58, 0.10)',
        hover: 'rgba(255, 58, 58, 0.25)',
        accent: 'rgba(255, 58, 58, 0.50)',
      },
      shadows: {
        sm: '0 1px 2px rgba(255, 58, 58, 0.10)',
        md: '0 4px 12px rgba(0, 0, 0, 0.50)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.60)',
        accentGlow: '0 0 20px rgba(255, 58, 58, 0.30)',
      },
      backdrop: 'rgba(10, 10, 12, 0.85)',
      status: {
        success: '#34d399',
        warning: '#fbbf24',
        error: '#ff6d6a',
        info: '#ff7167',
      },
    },
    light: {
      surfaces: {
        body: '#f5f3f0',
        base: '#fafaf8',
        raised: '#ffffff',
        overlay: '#ede8e0',
      },
      accent: {
        main: '#cc0000',
        hover: '#e60000',
        muted: 'rgba(204, 0, 0, 0.08)',
        strong: '#ff3a3a',
      },
      amber: {
        main: '#cc4400',
        hover: '#e65500',
        muted: 'rgba(204, 68, 0, 0.08)',
        strong: '#ff6b35',
      },
      text: {
        primary: '#1a1a1c',
        secondary: '#4a4a4e',
        tertiary: '#67676d',
        disabled: '#a8a8b0',
        accent: '#c00000',
        inverse: '#ffffff',
        amber: '#ad3800',
        onAccent: '#ffffff',
        onAmber: '#ffffff',
      },
      borders: {
        default: 'rgba(204, 0, 0, 0.12)',
        hover: 'rgba(204, 0, 0, 0.25)',
        accent: 'rgba(204, 0, 0, 0.40)',
      },
      shadows: {
        sm: '0 1px 2px rgba(204, 0, 0, 0.06)',
        md: '0 4px 12px rgba(0, 0, 0, 0.08)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.12)',
        accentGlow: '0 0 20px rgba(204, 0, 0, 0.10)',
      },
      backdrop: 'rgba(245, 243, 240, 0.8)',
      status: {
        success: '#006e2d',
        warning: '#934e00',
        error: '#bf0011',
        info: '#c10000',
      },
    },
  },
  {
    id: 'blueprint-orange',
    name: 'Blueprint Orange',
    description: 'Engineering blueprint — technical orange on drafting paper',
    preview: { accent: '#ff8c00', amber: '#ffa940', surface: '#0d2238' },
    dark: {
      surfaces: {
        body: '#0d2238',
        base: '#102a45',
        raised: '#15355a',
        overlay: '#1d4274',
      },
      accent: {
        main: '#d46d13',
        hover: '#ffa940',
        muted: 'rgba(255, 140, 0, 0.14)',
        strong: '#cc6e00',
      },
      amber: {
        main: '#ffa940',
        hover: '#ffbf66',
        muted: 'rgba(255, 169, 64, 0.14)',
        strong: '#cc8800',
      },
      text: {
        primary: '#d8e4f0',
        secondary: '#a3c6e7',
        tertiary: '#91b3da',
        disabled: '#3a5070',
        accent: '#ffaa66',
        inverse: '#0d2238',
        amber: '#ffb35c',
        onAccent: '#0d2238',
        onAmber: '#0d2238',
      },
      borders: {
        default: 'rgba(255, 255, 255, 0.10)',
        hover: 'rgba(255, 255, 255, 0.20)',
        accent: 'rgba(255, 140, 0, 0.50)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.35)',
        md: '0 4px 12px rgba(0, 0, 0, 0.45)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.55)',
        accentGlow: '0 0 20px rgba(255, 140, 0, 0.30)',
      },
      backdrop: 'rgba(13, 34, 56, 0.85)',
      status: {
        success: '#45dfa4',
        warning: '#ffb768',
        error: '#ffa3a0',
        info: '#ffb276',
      },
    },
    light: {
      surfaces: {
        body: '#fafbfc',
        base: '#ffffff',
        raised: '#ffffff',
        overlay: '#eef2f5',
      },
      accent: {
        main: '#b25f00',
        hover: '#e68000',
        muted: 'rgba(204, 110, 0, 0.10)',
        strong: '#ff8c00',
      },
      amber: {
        main: '#a06a00',
        hover: '#e69900',
        muted: 'rgba(204, 136, 0, 0.10)',
        strong: '#ffa940',
      },
      text: {
        primary: '#0a1a2e',
        secondary: '#1f2f48',
        tertiary: '#4a6080',
        disabled: '#8a99b0',
        accent: '#9b5200',
        inverse: '#ffffff',
        amber: '#8d5d00',
        onAccent: '#ffffff',
        onAmber: '#ffffff',
      },
      borders: {
        default: 'rgba(13, 34, 56, 0.10)',
        hover: 'rgba(13, 34, 56, 0.20)',
        accent: 'rgba(204, 110, 0, 0.40)',
      },
      shadows: {
        sm: '0 1px 2px rgba(13, 34, 56, 0.06)',
        md: '0 4px 12px rgba(13, 34, 56, 0.08)',
        lg: '0 8px 32px rgba(13, 34, 56, 0.10)',
        accentGlow: '0 0 20px rgba(204, 110, 0, 0.10)',
      },
      backdrop: 'rgba(250, 251, 252, 0.85)',
      status: {
        success: '#007430',
        warning: '#8b5b00',
        error: '#c80012',
        info: '#9a5100',
      },
    },
  },
  {
    id: 'terracotta-editorial',
    name: 'Terracotta Editorial',
    description: 'Magazine print — warm terracotta on cream paper',
    preview: { accent: '#c2410c', amber: '#e76f51', surface: '#f8f4ec' },
    dark: {
      surfaces: {
        body: '#1a0f0a',
        base: '#211510',
        raised: '#2a1c16',
        overlay: '#37251e',
      },
      accent: {
        main: '#e76f51',
        hover: '#ed8b73',
        muted: 'rgba(231, 111, 81, 0.14)',
        strong: '#c2410c',
      },
      amber: {
        main: '#f4a261',
        hover: '#f7b481',
        muted: 'rgba(244, 162, 97, 0.14)',
        strong: '#e76f51',
      },
      text: {
        primary: '#e8d5c4',
        secondary: '#b8a090',
        tertiary: '#a48d77',
        disabled: '#4a3a2c',
        accent: '#f97f60',
        inverse: '#1a0f0a',
        amber: '#f4a261',
        onAccent: '#2a0e02',
        onAmber: '#1a0f0a',
      },
      borders: {
        default: 'rgba(231, 111, 81, 0.12)',
        hover: 'rgba(231, 111, 81, 0.25)',
        accent: 'rgba(231, 111, 81, 0.50)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.35)',
        md: '0 4px 12px rgba(0, 0, 0, 0.40)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.50)',
        accentGlow: '0 0 20px rgba(231, 111, 81, 0.20)',
      },
      backdrop: 'rgba(26, 15, 10, 0.85)',
      status: {
        success: '#3ebd62',
        warning: '#f4a261',
        error: '#ff7c6f',
        info: '#fa8061',
      },
    },
    light: {
      surfaces: {
        body: '#f8f4ec',
        base: '#fdfaf3',
        raised: '#ffffff',
        overlay: '#efe7d8',
      },
      accent: {
        main: '#c2410c',
        hover: '#d94f15',
        muted: 'rgba(194, 65, 12, 0.10)',
        strong: '#e76f51',
      },
      amber: {
        main: '#e76f51',
        hover: '#ed8b73',
        muted: 'rgba(231, 111, 81, 0.10)',
        strong: '#f4a261',
      },
      text: {
        primary: '#1f1410',
        secondary: '#4a382e',
        tertiary: '#79634f',
        disabled: '#a89080',
        accent: '#ab3500',
        inverse: '#ffffff',
        amber: '#ac391b',
        onAccent: '#faf6f0',
        onAmber: '#1a0f0a',
      },
      borders: {
        default: 'rgba(194, 65, 12, 0.12)',
        hover: 'rgba(194, 65, 12, 0.22)',
        accent: 'rgba(194, 65, 12, 0.40)',
      },
      shadows: {
        sm: '0 1px 2px rgba(194, 65, 12, 0.06)',
        md: '0 4px 12px rgba(194, 65, 12, 0.08)',
        lg: '0 8px 32px rgba(194, 65, 12, 0.10)',
        accentGlow: '0 0 20px rgba(194, 65, 12, 0.10)',
      },
      backdrop: 'rgba(248, 244, 236, 0.8)',
      status: {
        success: '#006d2d',
        warning: '#9d4600',
        error: '#be0011',
        info: '#ac3500',
      },
    },
  },
  {
    id: 'obsidian-magenta',
    name: 'Obsidian Magenta',
    description: 'Cyberpunk neon — magenta on obsidian black, synthwave',
    preview: { accent: '#ff00aa', amber: '#aa00ff', surface: '#08000c' },
    dark: {
      surfaces: {
        body: '#08000c',
        base: '#10031a',
        raised: '#180526',
        overlay: '#240935',
      },
      accent: {
        main: '#ef319f',
        hover: '#ff44bb',
        muted: 'rgba(255, 0, 170, 0.14)',
        strong: '#cc0088',
      },
      amber: {
        main: '#aa00ff',
        hover: '#bb44ff',
        muted: 'rgba(170, 0, 255, 0.14)',
        strong: '#8800cc',
      },
      text: {
        primary: '#e8c8e0',
        secondary: '#a888a8',
        tertiary: '#987698',
        disabled: '#483848',
        accent: '#ff30ae',
        inverse: '#08000c',
        amber: '#b95eff',
        onAccent: '#3a0028',
        onAmber: '#fdf5fa',
      },
      borders: {
        default: 'rgba(255, 0, 170, 0.12)',
        hover: 'rgba(255, 0, 170, 0.28)',
        accent: 'rgba(255, 0, 170, 0.55)',
      },
      shadows: {
        sm: '0 1px 2px rgba(255, 0, 170, 0.12)',
        md: '0 4px 12px rgba(0, 0, 0, 0.50)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.60)',
        accentGlow: '0 0 20px rgba(255, 0, 170, 0.45)',
      },
      backdrop: 'rgba(8, 0, 12, 0.85)',
      status: {
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#ff3eb0',
      },
    },
    light: {
      surfaces: {
        body: '#faf0f8',
        base: '#fdf5fa',
        raised: '#ffffff',
        overlay: '#f0d8eb',
      },
      accent: {
        main: '#cc0088',
        hover: '#e00099',
        muted: 'rgba(204, 0, 136, 0.10)',
        strong: '#ff00aa',
      },
      amber: {
        main: '#8800cc',
        hover: '#aa00ff',
        muted: 'rgba(136, 0, 204, 0.10)',
        strong: '#aa00ff',
      },
      text: {
        primary: '#1a0814',
        secondary: '#4a2c40',
        tertiary: '#79576f',
        disabled: '#a888a0',
        accent: '#a80070',
        inverse: '#ffffff',
        amber: '#8600ca',
        onAccent: '#fdf5fa',
        onAmber: '#fdf5fa',
      },
      borders: {
        default: 'rgba(204, 0, 136, 0.15)',
        hover: 'rgba(204, 0, 136, 0.30)',
        accent: 'rgba(204, 0, 136, 0.50)',
      },
      shadows: {
        sm: '0 1px 2px rgba(204, 0, 136, 0.08)',
        md: '0 4px 12px rgba(136, 0, 204, 0.10)',
        lg: '0 8px 32px rgba(136, 0, 204, 0.12)',
        accentGlow: '0 0 20px rgba(204, 0, 136, 0.15)',
      },
      backdrop: 'rgba(250, 240, 248, 0.8)',
      status: {
        success: '#00672a',
        warning: '#8b4a00',
        error: '#b50010',
        info: '#ac0072',
      },
    },
  },
  {
    id: 'paper-newsprint',
    name: 'Paper Newsprint',
    description: 'Newspaper print — black ink on cream, classic editorial',
    preview: { accent: '#dc2626', amber: '#a16207', surface: '#f4f1e8' },
    dark: {
      surfaces: {
        body: '#1c1814',
        base: '#221e1a',
        raised: '#2a2620',
        overlay: '#383226',
      },
      accent: {
        main: '#dc2626',
        hover: '#ef4444',
        muted: 'rgba(220, 38, 38, 0.12)',
        strong: '#991b1b',
      },
      amber: {
        main: '#d97706',
        hover: '#f59e0b',
        muted: 'rgba(217, 119, 6, 0.12)',
        strong: '#a16207',
      },
      text: {
        primary: '#e8e2d4',
        secondary: '#b9af9b',
        tertiary: '#a69b8a',
        disabled: '#4a4238',
        accent: '#ff786b',
        inverse: '#f4f1e8',
        amber: '#f59034',
        onAccent: '#faf8f2',
        onAmber: '#1c1814',
      },
      borders: {
        default: 'rgba(220, 38, 38, 0.10)',
        hover: 'rgba(220, 38, 38, 0.22)',
        accent: 'rgba(220, 38, 38, 0.45)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.35)',
        md: '0 4px 12px rgba(0, 0, 0, 0.40)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.50)',
        accentGlow: '0 0 20px rgba(220, 38, 38, 0.18)',
      },
      backdrop: 'rgba(28, 24, 20, 0.85)',
      status: {
        success: '#4dca6f',
        warning: '#ffa152',
        error: '#ff8e81',
        info: '#ff9083',
      },
    },
    light: {
      surfaces: {
        body: '#f4f1e8',
        base: '#faf8f2',
        raised: '#ffffff',
        overlay: '#ebe5d4',
      },
      accent: {
        main: '#991b1b',
        hover: '#b91c1c',
        muted: 'rgba(153, 27, 27, 0.08)',
        strong: '#dc2626',
      },
      amber: {
        main: '#b57426',
        hover: '#b45309',
        muted: 'rgba(161, 98, 7, 0.08)',
        strong: '#d97706',
      },
      text: {
        primary: '#1c1814',
        secondary: '#3a342a',
        tertiary: '#5a5246',
        disabled: '#8a8270',
        accent: '#991b1b',
        inverse: '#ffffff',
        amber: '#8a5200',
        onAccent: '#faf8f2',
        onAmber: '#1c1814',
      },
      borders: {
        default: 'rgba(28, 24, 20, 0.12)',
        hover: 'rgba(28, 24, 20, 0.22)',
        accent: 'rgba(153, 27, 27, 0.40)',
      },
      shadows: {
        sm: '0 1px 2px rgba(28, 24, 20, 0.06)',
        md: '0 4px 12px rgba(28, 24, 20, 0.08)',
        lg: '0 8px 32px rgba(28, 24, 20, 0.10)',
        accentGlow: '0 0 20px rgba(153, 27, 27, 0.08)',
      },
      backdrop: 'rgba(244, 241, 232, 0.8)',
      status: {
        success: '#006c2d',
        warning: '#885100',
        error: '#bc0010',
        info: '#991b1b',
      },
    },
  },
  {
    id: 'nommand',
    name: 'Nommand',
    description: 'Azul institucional da Conta Nommand — design v2 “Institucional”, aprovado pelo dono (2026-09-30). Mesmo accent das outras paletas azuis, com bordas mais sutis, status da paleta e onAccent explícito.',
    preview: { accent: '#60a5fa', amber: '#b45309', surface: '#161b24' },
    dark: {
      surfaces: { body: '#161b24', base: '#1d242f', raised: '#252c38', overlay: '#28313e' },
      accent: { main: '#60a5fa', hover: '#93c5fd', muted: 'rgba(96, 165, 250, 0.14)', strong: '#2563eb' },
      amber: { main: '#f59e0b', hover: '#fbbf24', muted: 'rgba(245, 158, 11, 0.14)', strong: '#d97706' },
      text: { primary: '#d6dde6', secondary: '#a2afc1', tertiary: '#8b9bb1', disabled: '#455263', accent: '#71b0ff', inverse: '#0f1219', amber: '#f59e0b', onAccent: '#0b1220', onAmber: '#0f1219' },
      borders: { default: 'rgba(255, 255, 255, 0.10)', hover: 'rgba(255, 255, 255, 0.16)', accent: 'rgba(96, 165, 250, 0.45)' },
      shadows: { sm: '0 1px 2px rgba(0, 0, 0, 0.40)', md: '0 4px 12px rgba(0, 0, 0, 0.45)', lg: '0 12px 40px rgba(0, 0, 0, 0.55)', accentGlow: '0 0 20px rgba(96, 165, 250, 0.12)' },
      backdrop: 'rgba(10, 13, 18, 0.6)',
      status: { success: '#34d399', warning: '#fbbf24', error: '#ff8684', info: '#71b0ff' },
    },
    light: {
      surfaces: { body: '#eef1f5', base: '#f7f8fa', raised: '#ffffff', overlay: '#e8ecf1' },
      accent: { main: '#2563eb', hover: '#1d4ed8', muted: 'rgba(37, 99, 235, 0.10)', strong: '#1e40af' },
      amber: { main: '#b45309', hover: '#92400e', muted: 'rgba(217, 119, 6, 0.12)', strong: '#d97706' },
      text: { primary: '#172033', secondary: '#4b5868', tertiary: '#5e6a7c', disabled: '#b0bac6', accent: '#1855dc', inverse: '#f8f9fb', amber: '#a04800', onAccent: '#ffffff', onAmber: '#ffffff' },
      borders: { default: 'rgba(15, 23, 42, 0.10)', hover: 'rgba(15, 23, 42, 0.20)', accent: 'rgba(37, 99, 235, 0.35)' },
      shadows: { sm: '0 1px 2px rgba(15, 23, 42, 0.06)', md: '0 4px 12px rgba(15, 23, 42, 0.08)', lg: '0 12px 40px rgba(15, 23, 42, 0.14)', accentGlow: '0 0 20px rgba(37, 99, 235, 0.08)' },
      backdrop: 'rgba(30, 41, 59, 0.45)',
      status: { success: '#00702e', warning: '#955000', error: '#c20011', info: '#1855dc' },
    },
  },
]

// ── Status semânticos: fallback global ───────────────────────
//
// Usado quando uma paleta não declara `status` próprio. São os status da
// paleta padrão (slate-blue-gold), os mesmos do `:root` / `html.light` do
// globals.css, que cobre o intervalo antes de o React montar.
// `palette-contrast.test.ts` confere que globals.css espelha a paleta padrão.

export const DEFAULT_STATUS: Record<
  'dark' | 'light',
  PaletteStatusColors & { neutralMuted: string }
> = {
  dark: {
    success: '#34d399',
    warning: '#fbbf24',
    error: '#ff8684',
    info: '#71b0ff',
    neutralMuted: 'rgba(148, 163, 184, 0.14)',
  },
  light: {
    success: '#00702e',
    warning: '#955000',
    error: '#c20011',
    info: '#1855dc',
    neutralMuted: 'rgba(71, 85, 105, 0.10)',
  },
}

// ── Utility: palette → CSS custom properties ─────────────────

/**
 * Deriva a variante "muted forte" de um `rgba(r, g, b, a)` multiplicando o
 * alpha (teto 0.45). Usada por `--color-accent-muted-strong`, que até então
 * só existia estático em `prose.css` — ou seja, ficava azul-slate em TODAS as
 * paletas (hover de botão fantasma e sublinhado de link no conteúdo incluídos).
 * Se a string não for um rgba reconhecível, devolve a original sem quebrar.
 */
function strongerAlpha(rgba: string, factor = 2.1, max = 0.45): string {
  const m = rgba.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/)
  if (!m) return rgba
  const a = Math.min(max, Number(m[4]) * factor)
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')})`
}

/**
 * Todas as variáveis CSS de cor que uma paleta define num modo. É a fonte
 * única do que `applyPalette` escreve no `:root` e do retrato que o script
 * bloqueante do `index.html` aplica antes do primeiro paint (lib/themeBoot).
 *
 * Os status saem SEMPRE, mesmo quando `c.status` é undefined: `applyPalette`
 * usa `!important` inline, então um valor deixado por uma paleta anterior não
 * seria sobrescrito pelo globals.css ao trocar para uma paleta sem `status`.
 */
export function paletteCssVars(palette: Palette, mode: 'dark' | 'light'): Record<string, string> {
  const c = palette[mode]
  const fallback = DEFAULT_STATUS[mode]
  return {
    // Surfaces
    '--surface-body': c.surfaces.body,
    '--surface-base': c.surfaces.base,
    '--surface-raised': c.surfaces.raised,
    '--surface-overlay': c.surfaces.overlay,
    '--surface-code': c.surfaces.code ?? c.surfaces.raised,
    // Accent
    '--color-accent': c.accent.main,
    '--color-accent-hover': c.accent.hover,
    '--color-accent-muted': c.accent.muted,
    '--color-accent-muted-strong': strongerAlpha(c.accent.muted),
    '--color-accent-strong': c.accent.strong,
    // Amber
    '--color-amber': c.amber.main,
    '--color-amber-hover': c.amber.hover,
    '--color-amber-muted': c.amber.muted,
    '--color-amber-strong': c.amber.strong,
    // Text
    '--color-text-primary': c.text.primary,
    '--color-text-secondary': c.text.secondary,
    '--color-text-tertiary': c.text.tertiary,
    '--color-text-disabled': c.text.disabled,
    '--color-text-accent': c.text.accent,
    '--color-text-inverse': c.text.inverse,
    '--color-text-amber': c.text.amber,
    '--color-text-on-accent': c.text.onAccent,
    '--color-text-on-amber': c.text.onAmber,
    // Borders
    '--color-border': c.borders.default,
    '--color-border-hover': c.borders.hover,
    '--color-border-accent': c.borders.accent,
    // Shadows
    '--shadow-sm': c.shadows.sm,
    '--shadow-md': c.shadows.md,
    '--shadow-lg': c.shadows.lg,
    '--shadow-accent-glow': c.shadows.accentGlow,
    // Backdrop
    '--backdrop-bg': c.backdrop,
    // Status semânticos (PLANO §2.4) — palette-driven.
    '--color-success': c.status?.success ?? fallback.success,
    '--color-warning': c.status?.warning ?? fallback.warning,
    '--color-error': c.status?.error ?? fallback.error,
    '--color-info': c.status?.info ?? fallback.info,
    '--color-neutral-muted': fallback.neutralMuted,
  }
}

export function applyPalette(palette: Palette, mode: 'dark' | 'light') {
  // `!important` inline vence o bloco `html.light` do globals.css (que tem
  // especificidade maior que `:root`).
  const root = document.documentElement
  for (const [prop, value] of Object.entries(paletteCssVars(palette, mode))) {
    root.style.setProperty(prop, value, 'important')
  }
}

export function getPaletteById(id: PaletteId): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}
