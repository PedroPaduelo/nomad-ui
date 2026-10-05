import { paletteCssVars, type Palette, type PaletteId } from '../theme/palettes'

/**
 * Contrato entre o app e o script bloqueante do `index.html` (FE-03).
 *
 * O script roda antes do CSS e do bundle: lê as preferências persistidas pelo
 * store de tema, resolve o tema ('system' só fica claro quando o SO pede
 * claro, como em `resolveTheme`) e escreve em `<html>` a classe, o
 * `color-scheme` e as variáveis da paleta a partir do retrato gravado aqui.
 * Assim um F5 pinta o tema e a paleta certos desde o primeiro frame, em vez de
 * piscar o padrão escuro até o React montar.
 *
 * No agent-package o script era colado à mão no index.html. Aqui ele sai de
 * `themeBootScript({ storageKey, paletteStorageKey })` com as chaves do app, e
 * o `themeBootPlugin()` (Vite) injeta no `<head>` sozinho. O hash para a CSP
 * (`script-src`) sai de `themeBootCspHash()`; `src/test/theme-boot.test.ts`
 * executa o script contra estas chaves e confere o hash.
 */

/** Chave padrão do `persist` do store de tema (`{ state: { theme, palette } }`). */
export const DEFAULT_THEME_STORAGE_KEY = 'nomad:ui-preferences'

/** Chave padrão do retrato das variáveis CSS da paleta ativa, nos dois modos. */
export const DEFAULT_PALETTE_BOOT_STORAGE_KEY = 'nomad:palette-vars'

export interface ThemeStorageOptions {
  /** Chave do localStorage com `{ state: { theme, palette } }`. Padrão `nomad:ui-preferences`. */
  storageKey?: string
  /** Chave do localStorage com o retrato da paleta. Padrão `nomad:palette-vars`. */
  paletteStorageKey?: string
}

export interface PaletteBootSnapshot {
  palette: PaletteId
  dark: Record<string, string>
  light: Record<string, string>
}

export function paletteBootSnapshot(palette: Palette): PaletteBootSnapshot {
  return {
    palette: palette.id,
    dark: paletteCssVars(palette, 'dark'),
    light: paletteCssVars(palette, 'light'),
  }
}

/**
 * Grava o retrato da paleta para o próximo carregamento. Os dois modos vão
 * juntos porque, com o tema 'system', o SO pode ter mudado entre as visitas.
 * Sem localStorage (modo privado, cota cheia), o boot cai nos defaults do
 * globals.css, que são a paleta padrão: nada quebra, só volta o flash.
 */
export function rememberPaletteForBoot(
  palette: Palette,
  paletteStorageKey: string = DEFAULT_PALETTE_BOOT_STORAGE_KEY,
): void {
  try {
    window.localStorage.setItem(paletteStorageKey, JSON.stringify(paletteBootSnapshot(palette)))
  } catch {
    // Armazenamento indisponível: ver comentário acima.
  }
}

/** A chave entra no script entre aspas simples: nada de aspas, barra invertida ou quebra de linha. */
function assertSafeKey(key: string): string {
  if (!/^[\w:.@/-]+$/.test(key)) {
    throw new Error(`@nomad/ui: chave de localStorage inválida para o script de boot: ${key}`)
  }
  return key
}

/**
 * Texto do script bloqueante (o que vai ENTRE `<script>` e `</script>`), com
 * as chaves do app. É o script do index.html do agent-package, caractere por
 * caractere (inclusive a indentação), só com as chaves como parâmetro: com as
 * chaves `agentpack:*` o hash é o mesmo que a CSP do agent-package já libera.
 *
 * Cole no `<head>` antes de qualquer CSS, ou use `themeBootPlugin()`.
 */
export function themeBootScript(options: ThemeStorageOptions = {}): string {
  const prefsKey = assertSafeKey(options.storageKey ?? DEFAULT_THEME_STORAGE_KEY)
  const varsKey = assertSafeKey(options.paletteStorageKey ?? DEFAULT_PALETTE_BOOT_STORAGE_KEY)
  return `
      (function () {
        var root = document.documentElement;
        var prefs = null;
        var vars = null;
        try {
          prefs = JSON.parse(localStorage.getItem('${prefsKey}') || 'null');
          prefs = prefs && prefs.state;
          vars = JSON.parse(localStorage.getItem('${varsKey}') || 'null');
        } catch (e) {}
        var theme = prefs && prefs.theme;
        var mode = theme === 'light' || theme === 'dark' ? theme
          : window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        root.classList.add(mode);
        root.style.colorScheme = mode;
        var palette = vars && prefs && vars.palette === prefs.palette ? vars[mode] : null;
        if (palette) {
          for (var name in palette) {
            if (name.indexOf('--') === 0 && typeof palette[name] === 'string') root.style.setProperty(name, palette[name], 'important');
          }
        }
      })();
    `
}

/**
 * Valor para a CSP (`script-src`) que libera o script de boot com estas
 * chaves, já com aspas: `'sha256-…'`. Usa a Web Crypto (navegador e Node 22+).
 */
export async function themeBootCspHash(options: ThemeStorageOptions = {}): Promise<string> {
  const bytes = new TextEncoder().encode(themeBootScript(options))
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))
  let binary = ''
  for (const byte of digest) binary += String.fromCharCode(byte)
  return `'sha256-${btoa(binary)}'`
}

/** Formato mínimo de plugin do Vite (sem depender do pacote `vite`). */
export interface ThemeBootVitePlugin {
  name: string
  transformIndexHtml: {
    order: 'pre'
    handler: (html: string) => {
      html: string
      tags: { tag: 'script'; children: string; injectTo: 'head-prepend' }[]
    }
  }
}

/**
 * Plugin do Vite que injeta o script de boot no começo do `<head>` do
 * index.html (antes do CSS). Uso no `vite.config.ts`:
 * `plugins: [react(), tailwindcss(), themeBootPlugin({ storageKey: 'meuapp:ui-preferences' })]`,
 * importado de `@nomad/ui/theme-boot` (entrada sem React).
 */
export function themeBootPlugin(options: ThemeStorageOptions = {}): ThemeBootVitePlugin {
  const children = themeBootScript(options)
  return {
    name: 'nomad-ui:theme-boot',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => ({
        html,
        tags: [{ tag: 'script', children, injectTo: 'head-prepend' }],
      }),
    },
  }
}
