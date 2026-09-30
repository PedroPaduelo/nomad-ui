# `TopBarModel` — contrato canônico da barra Nomad (Padrão SSO Nomad §10)

A barra Nomad (TopBar, OrgSwitcher, AppSwitcher, AccountMenu) é renderizada a
partir de **um único objeto** `TopBarModel`. Quem produz o objeto é a **Conta**
(`GET /api/oidc/topbar` no backend da Conta; os apps repassam do endpoint do
próprio backend). Quem consome é cada app: o pacote expõe o tipo TS e o
schema Zod, e o `<TopBar>` aceita o model pronto.

Até a v1.0.x cada app montava os itens por conta própria, gerando divergências
(Conta tinha "Segurança / Aparência / Tema" no menu, loadbalance tinha "Minha
conta"; Conta tinha "Criar empresa" no OrgSwitcher, loadbalance não; etc.).
A v1.5.0 introduz o contrato canônico e zera essa divergência.

## Tipo

```ts
import type { TopBarModel } from '@nomad/ui/topbar'

const model: TopBarModel = {
  apps: [
    { id: 'app-load', slug: 'loadbalance', name: 'Loadbalance', launchUrl: '…' },
    { id: 'app-motor', slug: 'motor',      name: 'Motor',      launchUrl: '…' },
    /* … */
  ],
  organization: { id: 'org-1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'Proprietário' },
  organizations: [
    /* 1+ entradas; o TopBar renderiza o "Trocar de empresa" só se len > 1 */
  ],
  account: {
    profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
    role: 'Proprietário',
    manageAccountHref: 'https://conta.example/account',
  },
  launcherLinks: [
    { id: 'all-apps',  label: 'Todos os aplicativos', href: 'https://conta.example/apps' },
    { id: 'status',    label: 'Status dos serviços',  href: 'https://status.example' },
  ],
  accountLinks: [
    { id: 'security',  label: 'Segurança',  href: 'https://conta.example/security' },
    { id: 'theme',     label: 'Aparência',  href: '#theme' },   /* ação interna */
  ],
  helpLinks: [
    { id: 'help',        label: 'Ajuda',       href: 'https://help.example' },
    { id: 'privacy',     label: 'Privacidade',  href: 'https://example/privacy' },
    { id: 'terms',       label: 'Termos',       href: 'https://example/terms' },
  ],
  createOrgUrl: 'https://conta.example/new',
  notifications: { unread: 3, href: 'https://conta.example/notifications' },
}
```

## Renderizar a barra a partir do model (v1.6.0)

Com o `model`, o `<TopBar>` monta as 3 peças padrão — seletor de empresa, grade
de apps e menu da conta — mais o menu de ajuda (`helpLinks`) e o sino de
notificações (`notifications`), sem nenhum item hard-coded por app. A marca, a
busca e as ações próprias do app continuam nos slots:

```tsx
import { TopBar, TopBarModelBrand, topBarModelSchema } from '@nomad/ui/topbar'

const model = topBarModelSchema.parse(await res.json()) // validado na borda

<TopBar
  model={model}
  brand={<TopBarModelBrand product="Loadbalance" />} // logo do pacote
  currentAppSlug="loadbalance"                        // marca o bloco na grade
  search={<Input aria-label="Buscar" />}              // busca do app (centro)
  actions={<Paleta />}                                 // ações do app (à direita)
  onSwitchOrg={(orgId) => navigate(`/auth/sso?org=${orgId}`)}
  onSignOut={logout}
/>
```

| Peça                                          | Do model                                         | Do app                       |
| --------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| Grade de apps                                 | `apps[]` (links com `?org=&next=/`, aba nova)    | `currentAppSlug`             |
| Rodapé da grade                               | `launcherLinks[]` + "Gerenciar sua Conta"        | —                            |
| Seletor de empresa                            | `organizations[]`, empresa ativa, `createOrgUrl` | `onSwitchOrg`                |
| Menu da conta                                 | `account`, `accountLinks[]`, "Gerenciar", "Sair" | `onSignOut`                  |
| Ajuda                                         | `helpLinks[]`                                    | `topBarLabels.help`          |
| Notificações                                  | `notifications { unread, href }`                 | `onNotificationsClick`       |
| Marca e busca                                 | —                                                | `brand`, `search`, `actions` |
| Tema ("Tema · Escuro", alterna claro/escuro)  | — (embutido; usa o `ThemeProvider` do pacote)    | `labels.themeItem`           |
| "Trocar de empresa" (só com > 1 empresa)      | — (embutido; abre o seletor)                     | —                            |

Tudo opcional: o que não vier no model não aparece (sem `notifications`, sem sino;
sem `helpLinks`, sem menu de ajuda; sem `onSignOut`, sem "Sair"; uma empresa só,
sem "Trocar de empresa"). Quem já monta as peças componente por componente pode
usar `<TopBarModelBar model={…} />` (só o conteúdo, sem a moldura) ou continuar
com os slots antigos (`org`, `apps`, `account`) — o `TopBar` sem `model` se
comporta exatamente como na v1.5.0.

`label` e `icon` dos links são `ReactNode` no tipo do cliente (o app pode embutir
um nó); no JSON são strings (`BarLinkJson`). O pacote não traduz o nome do ícone
("Shield", "Palette") sozinho: quem quiser faz isso antes de montar o model.

## Validação Zod (recomendado)

```ts
import { topBarModelSchema } from '@nomad/ui/topbar'

const raw = await fetch('/api/oidc/topbar').then((r) => r.json())
const model = topBarModelSchema.parse(raw)
```

`topBarModelSchema` aceita também o **shape legado** da v1.0.x (`profile`,
`accountUrl` sem `account`) e monta o `TopBarModel` canônico — apps que já
estão em produção não precisam trocar de payload no servidor, só passar pelo
schema na borda.

## O que vem embutido no TopBar (não vem da Conta)

| Item                                | Por quê                                                              |
|-------------------------------------|---------------------------------------------------------------------|
| "Trocar de empresa" no `AccountMenu` | É a ação do `OrgSwitcher`; só aparece se `organizations.length > 1`. |
| "Tema claro/escuro" no `AccountMenu` | Usa o `ThemeProvider` do pacote. Todos os apps já usam. |
| `OrgSwitcher` com avatar da org     | O mark usa os tokens `--mark-bg` / `--mark-on` da paleta ativa.      |

## Decisões

1. **Nomes**: `apps`, `launcherLinks`, `accountLinks`, `helpLinks`,
   `createOrgUrl`, `activeOrgId`. Compatível com o `TopbarData` da v1.0.x
   (campos legados continuam reconhecidos).
2. **"Trocar de empresa"**: ação embutida do TopBar (abre o `OrgSwitcher`).
3. **Tema claro/escuro**: item embutido no `AccountMenu` (usa `ThemeProvider`).
4. **`manageAccountHref`**: continua aceito (compat) e vira o primeiro
   item de `accountLinks` se a lista não vier preenchida.
5. **`topBarModelSchema`**: exportado para os apps validarem a resposta do
   backend com ele. Compatível com `TopbarData` legado.
6. **`helpLinks`**: opcional — o menu de ajuda só renderiza se vier preenchido.
7. **"Criar empresa"**: abre `createOrgUrl` em nova aba (decisão do app).

## Tipos exportados

| Símbolo                            | Descrição                                         |
|------------------------------------|---------------------------------------------------|
| `TopBarModel`                      | Tipo canônico final (depois do transform).          |
| `TopBarModelInput`                 | Tipo da entrada (aceita shape legado).             |
| `TopBarProfile`, `TopBarAccount`, `TopBarAccountOrg`, `TopBarOrgOption`, `BarLink` | Sub-tipos. |
| `topBarModelSchema`                | Zod schema (recomendado para validar a resposta).  |
| `topBarProfileSchema`, `topBarAccountSchema`, `topBarAccountOrgSchema`, `topBarOrgOptionSchema`, `barLinkSchema` | Schemas auxiliares (para apps que queiram validar partes). |

## Tarefas relacionadas

- `[NUI] [TOPBAR-PARITY-01]` (904e24cf): este contrato + render do `TopBar`
  que consome o model.
- `[CONTA] [TOPBAR-PARITY-02]` (c689a5ec): a Conta implementa o endpoint
  com este contrato.
- Adoção em cada app nas tasks `[LB] NUI-MIG-02b` `76a8741a`,
  `[AP] NUI-MIG-04b` `3807aab1`, `[MOTOR] NUI-MIG-03b`.
