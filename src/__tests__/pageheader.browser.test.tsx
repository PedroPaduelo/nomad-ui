// PageHeader em viewport estreito: o <h1> não pode ser espremido pelo `action`.
//
// Existe porque o `action` vinha com `shrink-0` e o container **sem** `flex-wrap`:
// a 390px o título caía para 207px de 390 e quebrava em duas linhas (62.4px de
// altura), espremido ao lado dos botões. Medido nesta sandbox em 2026-10-03,
// em A/B no mesmo harness e no mesmo Chromium:
//
//   sem o conserto:  coluna=207px  container=nowrap  h1=62.4px (2 linhas)
//   com o conserto:  coluna=390px  container=wrap    h1=31.2px (1 linha)
//
// ⚠️ **Nenhum gate pegava**, porque o `vitest.a11y.config.ts` roda em **uma**
// instância de 1440×900: layout estreito não era medido em lugar nenhum. E o
// `gates` ainda podia passar sem rodar nada nenhum (ver `passWithNoTests`).
//
// ⚠️ A asserção é **geométrica**, não de fonte nem de cor: o CI roda com o
// Chromium do Playwright, e medir `fontSize` mediria o carregamento da fonte,
// não o layout. O que se mede é "o título tem a largura do container".

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from '../components/ui/PageHeader'
import '../theme/globals.css'

const LARGURA = 390

/** Action longo: dois botões com rótulo — o caso que espremia o título. */
const ActionLongo = () => (
  <div className="flex gap-2">
    <button type="button">Cancelar</button>
    <button type="button">Salvar alterações</button>
  </div>
)

/** A coluna do título é a avó do <h1>: h1 > div.min-w-0 > div.flex-1. */
function colunaDoTitulo(h1: HTMLElement): HTMLElement {
  return (h1.closest('div') as HTMLElement).parentElement as HTMLElement
}

describe('PageHeader — action longo em tela estreita', () => {
  it('o título usa a largura toda quando o action não cabe ao lado', () => {
    const { container } = render(
      <div style={{ width: `${LARGURA}px` }}>
        <PageHeader title="Editar grupo de chaves" action={<ActionLongo />} />
      </div>,
    )

    const h1 = container.querySelector('h1') as HTMLElement
    const coluna = colunaDoTitulo(h1)

    // 207px de 390 era o sintoma medido. Com o conserto a coluna toma a linha
    // inteira e o action desce para baixo.
    expect(coluna.clientWidth).toBeGreaterThanOrEqual(LARGURA - 1)

    // O <h1> não pode transbordar: `scrollWidth > clientWidth` é conteúdo mais
    // largo que a caixa, que é o mesmo defeito em outra forma.
    expect(h1.scrollWidth).toBeLessThanOrEqual(h1.clientWidth + 1)

    // Uma linha só. Com o título espremido ele quebrava em duas (62.4px). A
    // altura da linha vem do próprio elemento, então a asserção não depende
    // de a fonte ter carregado.
    const alturaDaLinha = parseFloat(getComputedStyle(h1).lineHeight)
    expect(Number.isNaN(alturaDaLinha) || alturaDaLinha > 0).toBe(true)
    expect(h1.getBoundingClientRect().height).toBeLessThan(alturaDaLinha * 1.5)
  })

  it('sem action, o título ocupa a largura toda do container', () => {
    const { container } = render(
      <div style={{ width: `${LARGURA}px` }}>
        <PageHeader title="Editar grupo de chaves" />
      </div>,
    )
    const h1 = container.querySelector('h1') as HTMLElement
    expect(colunaDoTitulo(h1).clientWidth).toBeGreaterThanOrEqual(LARGURA - 1)
  })
})
