import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppCard, AppCardToolbar } from './AppCard'

afterEach(cleanup)

function card() {
  return screen.getByTestId('conteudo').parentElement as HTMLElement
}

describe('AppCard', () => {
  it('default sobre --surface-card, com borda visivel', () => {
    render(<AppCard><span data-testid="conteudo">x</span></AppCard>)

    const style = card().getAttribute('style') ?? ''
    expect(style).toContain('var(--surface-card)')
    expect(style).toContain('var(--surface-border)')
  })

  it('sunken RECUA para o fundo da aplicacao e apaga a borda', () => {
    // D-28: a unica ideia estrutural de /perfil -- leitura de um lado,
    // self-service do outro -- so existia como posicao horizontal acima de
    // 1280px. Recuada, a coluna de leitura se dissolve no fundo (o AppLayout ja
    // e bg-(--surface-ground)) e sobra cartao so onde ha o que fazer.
    render(<AppCard variant="sunken"><span data-testid="conteudo">x</span></AppCard>)

    const style = card().getAttribute('style') ?? ''
    expect(style).toContain('background: var(--surface-ground)')
    // Mesma cor do fundo, nao `border: none`: o anel some sem mexer no box
    // model, entao nada se desloca ao trocar de variante.
    expect(style).toContain('border-color: var(--surface-ground)')
  })

  it('sunken NAO carrega padding proprio, ao contrario do stat', () => {
    // O `stat` traz `px-4 py-3.5` acoplado; os cartoes de /perfil passam
    // `className="p-4"` e reusar o stat mudaria o espacamento junto.
    render(<AppCard variant="sunken" className="p-4"><span data-testid="conteudo">x</span></AppCard>)

    expect(card().className).toContain('p-4')
    expect(card().className).not.toContain('py-3.5')
  })

  it('sunken com tone mantem a superficie e so publica a tinta', () => {
    // Variante decide a SUPERFICIE, tone decide o ACENTO -- mesma ortogonalidade
    // que o stat ja estabelece (ele tambem forca --surface-card).
    render(<AppCard variant="sunken" tone="danger"><span data-testid="conteudo">x</span></AppCard>)

    const style = card().getAttribute('style') ?? ''
    expect(style).toContain('background: var(--surface-ground)')
    expect(style).toContain('--app-card-tone-text')
  })

  it('stat continua com trilho e padding proprios', () => {
    render(<AppCard variant="stat" tone="info"><span data-testid="conteudo">x</span></AppCard>)

    expect(card().getAttribute('style')).toContain('border-inline-start-width: 3px')
    expect(card().className).toContain('py-3.5')
  })
})

describe('AppCardToolbar', () => {
  it('o slot end quebra linha em vez de espremer a acao primaria', () => {
    // UI-01 da run de Comercial (2026-08-25): em 390x844 o botao "Nuevo
    // presupuesto" caia para 44px e vazava 3px da viewport, porque o slot
    // era `shrink-0` numa linha unica ao lado do grupo Activos/Archivados.
    const { container } = render(
      <AppCardToolbar start={<span>busca</span>} end={<button>Nuevo presupuesto</button>} />,
    )

    const end = container.querySelector('button')?.parentElement

    expect(end?.className).toContain('flex-wrap')
    expect(end?.className).not.toContain('shrink-0')
  })
})
