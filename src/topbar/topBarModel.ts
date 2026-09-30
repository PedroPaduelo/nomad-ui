/**
 * TopBarModel — modelo de dados canônico da barra Nomad.
 *
 * Fonte da verdade do conteúdo da barra (Padrão SSO Nomad §10). A barra
 * inteira é renderizada a partir de UM objeto `TopBarModel`: o backend da
 * Conta (`GET /api/oidc/topbar`, tarefa `[CONTA] [TOPBAR-PARITY-02]
 * c689a5ec`) devolve esse JSON, os apps validam com `topBarModelSchema`
 * (Zod 4) e passam para `<TopBar model={...} />`. Itens hardcoded por app
 * (Launcher extras, Conta menu, Aparência, Trocar de empresa) saem.
 *
 * Decisões do contrato (orquestrador-1f, 2026-09-30):
 * 1. Nomes: `apps`, `launcherLinks`, `accountLinks`, `helpLinks`, `createOrgUrl`,
 *    `activeOrgId`. Compatível com o `TopbarData` da v1.0.x (só acrescenta).
 * 2. "Trocar de empresa" é ação embutida do TopBar (abre o OrgSwitcher) — só
 *    aparece quando `organizations.length > 1`. NÃO vem da Conta.
 * 3. Tema claro/escuro é item embutido no menu da conta, usando o
 *    `ThemeProvider` do pacote. NÃO vem da Conta.
 * 4. `manageAccountHref` (compat) continua aceito e vira o primeiro item do
 *    `accountLinks` se `accountLinks` não vier.
 * 5. Schema exportado para os apps validarem a resposta do backend.
 * 6. `helpLinks` é opcional — só renderiza o menu de ajuda se vier preenchido.
 * 7. "Criar empresa" abre `createOrgUrl` numa aba nova (decisão do app).
 * 8. `notifications` (v1.6.0): sino padrão à direita da barra, com contador
 *    de não lidas e destino na central da Conta. Vem da Conta como os
 *    demais itens; busca e paleta continuam no slot `actions` do app.
 *
 * Papel (`role`): o `AccountMenu` e o `OrgSwitcher` formatam para PT-BR com
 * `roleLabel()` (`owner` → "Proprietário"). A resposta da Conta já traz o
 * papel em português; `roleLabel` devolve o texto desconhecido como veio, os
 * dois formatos renderizam igual.
 */
import type { ReactNode } from 'react'
import { z } from 'zod'

import type { LauncherApp } from './AppSwitcher'
import type { TopbarOrganization } from './OrgSwitcher'

/** Link genérico (geral do launcher, conta ou ajuda). */
export interface BarLink {
  id: string
  /** Texto visível. O JSON traz string; um app pode embutir um nó React. */
  label: ReactNode
  /** URL absoluta (`https://...`) ou relativa (`/apps/...`). */
  href: string
  /** Ícone opcional do lucide-react ou componente qualquer (JSON: nome do ícone). */
  icon?: ReactNode
  /** Abre em nova aba (default true para links que saem do app). */
  newTab?: boolean
}

/**
 * Link vindo do backend (JSON): `label` é string e `icon` é o NOME do ícone
 * (ex.: "Shield"); o app pode traduzir o nome para um componente. O tipo
 * `BarLink` (saída do schema) aceita nós React para quem monta o model no
 * cliente — por isso os dois tipos.
 */
export interface BarLinkJson {
  id: string
  label: string
  href: string
  icon?: string
  newTab?: boolean
}

export const barLinkSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
  icon: z.string().optional(),
  newTab: z.boolean().optional(),
}) satisfies z.ZodType<BarLinkJson, BarLinkJson>

/** Conta ativa (vem de `TopbarData.organization`). */
export interface TopBarAccountOrg {
  id: string
  name: string
  slug: string
  /** Papel exibido no card do `AccountMenu` ("Proprietário", "Admin", …). */
  role: string
}

export const topBarAccountOrgSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  role: z.string().min(1),
}) satisfies z.ZodType<TopBarAccountOrg>

/** Empresa disponível para troca (vem de `TopbarData.organizations`). */
export interface TopBarOrgOption extends TopbarOrganization {
  slug: string
  role: string
  /** Esta empresa pode abrir o app atual (alguns apps bloqueiam outras empresas). */
  canOpenApp: boolean
}

export const topBarOrgOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  role: z.string().min(1),
  canOpenApp: z.boolean(),
}) satisfies z.ZodType<TopBarOrgOption>

/** Perfil do usuário (vem de `TopbarData.profile`). */
export interface TopBarProfile {
  name: string | null
  email: string | null
  /** URL do avatar (a Conta resolve via SSO; alguns apps têm fallback local). */
  picture: string | null
}

export const topBarProfileSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  picture: z.string().nullable(),
}) satisfies z.ZodType<TopBarProfile>

/** Conta exibida no `AccountMenu` (avatar, papel, gerenciar). */
export interface TopBarAccount {
  profile: TopBarProfile
  role: string
  /**
   * Página "Gerenciar sua Conta Nommand" — atalho padrão. Pode estar vazio
   * no shape intermediário: o transform garante que o `TopBarModel` final tem
   * `manageAccountHref` não-vazio (vindo do `account` novo OU do legado `accountUrl`).
   */
  manageAccountHref: string
}

export const topBarAccountSchema = z
  .object({
    profile: topBarProfileSchema,
    role: z.string().min(1),
    // Aceita string vazia aqui: o transform abaixo garante que o
    // `TopBarModel` final tem `manageAccountHref` não-vazio.
    manageAccountHref: z.string(),
  })
  .transform((raw): TopBarAccount => raw)

/**
 * Modelo canônico da barra Nomad. Compatível com o `TopbarData` da v1.0.x
 * (campos legados `profile`, `organization`, `organizations`, `apps`,
 * `accountUrl` continuam reconhecidos — `accountUrl` vira o
 * `account.manageAccountHref` se o app passar só `accountUrl`).
 */
export interface TopBarModel {
  /** Apps do launcher (gradiente da Conta). */
  apps: LauncherApp[]
  /** Conta ativa (exibida no card). */
  organization: TopBarAccountOrg
  /** Empresas disponíveis para troca (uma ou mais → ativa o OrgSwitcher). */
  organizations: TopBarOrgOption[]
  /** Conta do usuário logado (avatar + papel + atalho "Gerenciar"). */
  account: TopBarAccount
  /** Links extras do launcher (ex.: "Todos os aplicativos", "Status dos serviços"). */
  launcherLinks?: BarLink[]
  /** URL para abrir em nova aba quando o usuário escolhe "Criar empresa". */
  createOrgUrl?: string
  /** Rótulo do item "Criar empresa" (padrão: "Criar empresa"; a Conta pode dizer "Nova empresa"). */
  createOrgLabel?: string
  /** Links do menu da conta (ex.: Segurança, Aparência). "Gerenciar" entra se não vier. */
  accountLinks?: BarLink[]
  /** Links do menu de ajuda (ex.: Ajuda, Privacidade, Termos). Opcional. */
  helpLinks?: BarLink[]
  /** Sino de notificações da Conta (contador + destino). Opcional. */
  notifications?: TopBarNotifications
}

/**
 * Notificações da Conta (v1.6.0): o sino padrão à direita da barra. `unread`
 * = não lidas (0 esconde o contador); `href` = central de notificações na
 * Conta. O app pode interceptar o clique com `onNotificationsClick` para
 * abrir um drawer próprio.
 */
export interface TopBarNotifications {
  unread: number
  href: string
}

export const topBarNotificationsSchema = z.object({
  unread: z.number().int().min(0),
  href: z.string().min(1),
}) satisfies z.ZodType<TopBarNotifications>

/**
 * Schema Zod para a resposta de `GET /api/oidc/topbar`. Compatível com o
 * `TopbarData` legado (`accountUrl` como alias de `account.manageAccountHref`)
 * para não quebrar apps que já estão em produção na v1.0.x. Os apps
 * validam o JSON do backend com ele antes de passar para o `<TopBar>`.
 */
export const topBarModelSchema = z
  .object({
    apps: z.array(z.unknown()).transform((apps) => apps as LauncherApp[]),
    organization: topBarAccountOrgSchema,
    organizations: z.array(topBarOrgOptionSchema),
    account: topBarAccountSchema.optional(),
    accountUrl: z.string().min(1).optional(),
    profile: topBarProfileSchema.optional(),
    launcherLinks: z.array(barLinkSchema).optional(),
    createOrgUrl: z.string().min(1).optional(),
    createOrgLabel: z.string().min(1).optional(),
    accountLinks: z.array(barLinkSchema).optional(),
    helpLinks: z.array(barLinkSchema).optional(),
    notifications: topBarNotificationsSchema.optional(),
  })
  .transform((raw): TopBarModel => {
    // Resolve a forma canônica a partir do shape da Conta (v1.0.x → v1.5.0):
    // se `account` não vier, monta com `profile` + `accountUrl` legados.
    const account: TopBarAccount =
      raw.account ??
      ({
        profile: raw.profile ?? { name: null, email: null, picture: null },
        role: raw.organization.role,
        manageAccountHref: raw.accountUrl ?? '',
      } satisfies TopBarAccount)
    if (!account.manageAccountHref) {
      throw new Error(
        '[topBarModelSchema] falta `account.manageAccountHref` (ou o legado `accountUrl`)',
      )
    }
    return {
      apps: raw.apps,
      organization: raw.organization,
      organizations: raw.organizations,
      account,
      launcherLinks: raw.launcherLinks,
      createOrgUrl: raw.createOrgUrl,
      createOrgLabel: raw.createOrgLabel,
      accountLinks: raw.accountLinks,
      helpLinks: raw.helpLinks,
      notifications: raw.notifications,
    }
  })

/**
 * Tipo de entrada do schema — o que o backend pode mandar (incluindo
 * `accountUrl` legado). Útil para o backend tipar a resposta antes de validar.
 */
export type TopBarModelInput = z.input<typeof topBarModelSchema>
