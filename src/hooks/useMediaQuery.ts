import { useEffect, useState } from 'react'

/**
 * Hook SSR-safe para media queries responsivas.
 * Retorna `false` no primeiro render (compat SSR), depois reage a mudanças.
 *
 * @example
 *   const isDesktop = useMediaQuery('(min-width: 1024px)');
 *   const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia(query)

    // Sincroniza com valor real após montagem
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o matchMedia depois de montar (SSR-safe)
    setMatches(mql.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
