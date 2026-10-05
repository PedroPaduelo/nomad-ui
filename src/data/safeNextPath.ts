/**
 * Destino interno seguro para depois do login (`?next=`), copiado de
 * `src/lib/authRedirect.ts` do agent-package.
 *
 * O `next` vem da URL, então qualquer um monta um link com ele: só um caminho
 * desta mesma origem é aceito. `//evil.com`, `/\evil.com`, `https://evil.com`
 * e variantes com tab ou quebra de linha (o parser de URL as remove) resolvem
 * para outra origem e viram `/`. O próprio caminho de login também vira `/`.
 */
export function safeNextPath(
  raw: string | null | undefined,
  options: { loginPath?: string; origin?: string } = {},
): string {
  const origin = options.origin ?? window.location.origin
  if (!raw || !raw.startsWith('/')) return '/'
  let url: URL
  try {
    url = new URL(raw, origin)
  } catch {
    return '/'
  }
  if (url.origin !== origin) return '/'
  if (options.loginPath && url.pathname === options.loginPath) return '/'
  return `${url.pathname}${url.search}${url.hash}`
}
