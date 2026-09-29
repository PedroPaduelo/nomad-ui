/**
 * Endereço para abrir um app a partir do launcher (Padrão SSO Nomad, CONTA-23): o `launchUrl` do app
 * (`<app>/auth/sso`) com `org=<empresa ativa>` e `next=<rota do app>`. O app manda para a Conta com
 * `org_hint`, a Conta devolve o code sem tela e a pessoa entra logada na empresa certa.
 * A query que o `launchUrl` já tiver é preservada; `org` e `next` só entram quando informados.
 */
export function launchHref(
  launchUrl: string,
  opts: { org?: string | null; next?: string | null } = {},
): string {
  let url: URL
  try {
    url = new URL(launchUrl)
  } catch {
    return launchUrl
  }
  if (opts.org) url.searchParams.set('org', opts.org)
  if (opts.next) url.searchParams.set('next', opts.next)
  return url.toString()
}
