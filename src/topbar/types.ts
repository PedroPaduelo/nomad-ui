import type { LauncherApp } from './AppSwitcher'
import type { TopbarOrganization } from './OrgSwitcher'

/** Resposta de `GET <Conta>/api/oidc/topbar` (o backend do app repassa ao front em `GET /api/auth/oidc/topbar`). */
export type TopbarData = {
  profile: { name: string | null; email: string | null; picture: string | null }
  organization: { id: string; name: string; slug: string; role: string }
  organizations: (TopbarOrganization & { slug: string; role: string; canOpenApp: boolean })[]
  apps: LauncherApp[]
  /** Página inicial da Conta Nommand ("Gerenciar sua Conta Nommand"). */
  accountUrl: string
}
