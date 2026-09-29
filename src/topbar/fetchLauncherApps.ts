import type { LauncherApp } from './AppSwitcher'

export type FetchLauncherOptions = {
  /** URL completa do endpoint. Padrão: `/api/apps/launcher` (mesma origem da Conta Nommand). */
  url?: string
  /** Cabeçalhos extras, ex.: `{ Authorization: 'Bearer <token>' }`. */
  headers?: Record<string, string>
  /** `include` para mandar o cookie de sessão entre domínios. Padrão: `include`. */
  credentials?: RequestCredentials
  signal?: AbortSignal
}

/**
 * Busca os apps que o usuário pode abrir na empresa ativa
 * (`GET /api/apps/launcher` → `{ apps: LauncherApp[] }`). Lança Error com mensagem em PT-BR.
 */
export async function fetchLauncherApps(
  options: FetchLauncherOptions = {},
): Promise<LauncherApp[]> {
  const { url = '/api/apps/launcher', headers = {}, credentials = 'include', signal } = options
  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', ...headers },
      credentials,
      signal,
    })
  } catch {
    throw new Error('Não foi possível falar com a Conta Nommand.')
  }
  if (!res.ok)
    throw new Error(
      res.status === 401
        ? 'Sua sessão expirou. Entre de novo.'
        : 'Erro ao carregar os aplicativos.',
    )
  const data = (await res.json()) as { apps?: LauncherApp[] }
  return Array.isArray(data.apps) ? data.apps : []
}
