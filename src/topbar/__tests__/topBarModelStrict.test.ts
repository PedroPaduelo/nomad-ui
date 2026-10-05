/**
 * `topBarModelSchema`: `safeParse` NUNCA lança (devolve `{ success: false }`
 * com issue) e `apps` é validado com o shape real (PKG-FIXES 4fa8bd30,
 * itens #2 e #3 do revisor independente).
 */
import { describe, expect, it } from 'vitest'

import { topBarModelSchema } from '../topBarModel'

const APPS = [
  { id: '1', slug: 'motor', name: 'Motor', iconUrl: null, launchUrl: 'https://m.example/auth/sso' },
]
const BASE = {
  apps: APPS,
  organization: { id: 'o1', name: 'Nommand Labs', slug: 'nomad-labs', role: 'owner' },
  organizations: [
    { id: 'o1', name: 'Nommand Labs', slug: 'nomad-labs', role: 'owner', canOpenApp: true },
  ],
  account: {
    profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
    role: 'owner',
    manageAccountHref: 'https://conta.example/account',
  },
}

describe('topBarModelSchema: safeParse não lança (item #2)', () => {
  it('sem `account` e sem `accountUrl`: devolve { success: false } com issue em account.manageAccountHref', () => {
    const semAccount = { ...BASE, account: undefined }
    let r: ReturnType<typeof topBarModelSchema.safeParse>
    expect(() => {
      r = topBarModelSchema.safeParse(semAccount)
    }).not.toThrow() // o throw dentro do transform escapava do safeParse
    expect(r!.success).toBe(false)
    if (!r!.success) {
      const paths = r!.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('account.manageAccountHref')
    }
  })

  it('`parse` continua lançando (o app que usa parse tem tratamento do erro)', () => {
    const semAccount = { ...BASE, account: undefined }
    expect(() => topBarModelSchema.parse(semAccount)).toThrow()
  })

  it('com o shape completo e o legado, safeParse segue bem-sucedido', () => {
    expect(topBarModelSchema.safeParse(BASE).success).toBe(true)
    const legado = topBarModelSchema.safeParse({
      profile: BASE.account.profile,
      organization: BASE.organization,
      organizations: BASE.organizations,
      apps: APPS,
      accountUrl: 'https://conta.example/account',
    })
    expect(legado.success).toBe(true)
    if (legado.success)
      expect(legado.data.account.manageAccountHref).toBe('https://conta.example/account')
  })
})

describe('topBarModelSchema: apps é validado (item #3)', () => {
  const inválidos: unknown[] = [
    [null],
    ['x'],
    [{}],
    [123],
    [{ id: 'a' }],
    [{ ...APPS[0], launchUrl: '' }],
  ]
  it.each(inválidos.map((a, i) => [i, a]))('rejeita apps[%d] = %j', (_i, apps) => {
    const r = topBarModelSchema.safeParse({ ...BASE, apps })
    expect(r.success).toBe(false)
  })

  it('aceita app completo, com iconUrl/description null e campos extras da Conta', () => {
    const comExtras = [{ ...APPS[0], description: null, category: 'prod' }]
    const r = topBarModelSchema.safeParse({ ...BASE, apps: comExtras })
    expect(r.success).toBe(true)
  })
})
