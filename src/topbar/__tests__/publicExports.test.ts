/**
 * O sub-path público `@nomad/ui/topbar` precisa exportar o contrato canônico:
 * em 2026-09-30 o barrel esqueceu `topBarModel` e o `import { topBarModelSchema }
 * from '@nomad/ui/topbar'` dos apps vinha `undefined` (PKG-FIXES #6, [CONTA]).
 * Este teste importa pelo MESMO caminho público do consumidor (o barrel).
 */
import { describe, expect, it } from 'vitest'

import * as publicApi from '../index'

describe('@nomad/ui/topbar: contrato canônico no barrel público', () => {
  it('exporta o schema e os tipos do TopBarModel em runtime', () => {
    expect(typeof publicApi.topBarModelSchema).toBe('object')
    expect(typeof publicApi.topBarModelSchema.parse).toBe('function')
    expect(typeof publicApi.topBarModelSchema.safeParse).toBe('function')
    expect(typeof publicApi.topBarProfileSchema?.parse).toBe('function')
    expect(typeof publicApi.topBarAccountSchema?.parse).toBe('function')
    expect(typeof publicApi.topBarAccountOrgSchema?.parse).toBe('function')
    expect(typeof publicApi.topBarOrgOptionSchema?.parse).toBe('function')
    expect(typeof publicApi.barLinkSchema?.parse).toBe('function')
  })

  it('o schema público monta o model a partir do shape legado', () => {
    const model = publicApi.topBarModelSchema.parse({
      profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
      organization: { id: 'o1', name: 'Nommand Labs', slug: 'nomad-labs', role: 'owner' },
      organizations: [
        { id: 'o1', name: 'Nommand Labs', slug: 'nomad-labs', role: 'owner', canOpenApp: true },
      ],
      apps: [],
      accountUrl: 'https://conta.example/',
    })
    expect(model.account.manageAccountHref).toBe('https://conta.example/')
  })

  it('as peças da barra continuam exportadas', () => {
    for (const name of ['TopBar', 'TopBarBrand', 'OrgSwitcher', 'AppSwitcher', 'AccountMenu', 'Popover']) {
      expect(typeof (publicApi as Record<string, unknown>)[name]).toBe('function')
    }
  })
})
