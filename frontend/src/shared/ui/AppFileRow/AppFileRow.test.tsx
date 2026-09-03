import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { formatDate } from '@shared/lib'
import { AppFileRow } from './AppFileRow'

// O idioma da INTERFACE, não o do runtime: em jsdom o detector resolve pelo
// `navigator.language` (en-US), e é justamente a divergência entre os dois que
// o D-18 relata. Pinado aqui, a guarda vale com qualquer TZ da máquina.
beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

describe('AppFileRow', () => {
  it('expoe o nome inteiro em title, porque a linha trunca', () => {
    // UI-01: a 390px o nome sai truncado sem hover e sem quebra — o valor
    // some da tela sem nenhum caminho para lê-lo.
    render(<AppFileRow name="certificado-de-titulo-profesional-2026.pdf" mime="application/pdf" />)

    expect(screen.getByText('certificado-de-titulo-profesional-2026.pdf').getAttribute('title'))
      .toBe('certificado-de-titulo-profesional-2026.pdf')
  })

  it('formata a data no idioma da INTERFACE, nao no do navegador', () => {
    // D-18: `new Date(createdAt).toLocaleDateString()` sem locale cai no idioma
    // do navegador. `created_at` é data-hora completa, então NÃO carrega o
    // problema de fuso do `valid_until` só-data — o defeito aqui é de idioma.
    const createdAt = '2026-08-01T10:00:00Z'
    render(<AppFileRow name="cv.pdf" size={1024} createdAt={createdAt} />)

    const esperado = formatDate(new Date(createdAt))
    expect(screen.getByText(new RegExp(esperado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy()
  })

  it('deixa o grupo de acoes CAIR de linha em vez de vazar o container', () => {
    // D-19, o unico C da revisao: em 390px o cartao media clientWidth 227
    // contra scrollWidth 311, o rotulo saia cortado em "Reem" e o nome do
    // arquivo ficava com largura 0. A quebra e dirigida pelo CONTAINER: o
    // componente serve quatro larguras diferentes na MESMA viewport
    // (comercial, turma, redator, perfil), e um breakpoint de viewport
    // acertaria uma e erraria tres.
    const { container } = render(
      <AppFileRow name="cv.pdf" actions={<button type="button">Reemplazar</button>} />,
    )

    expect(container.firstElementChild?.className).toContain('flex-wrap')
  })

  it('mantem o truncamento ANTES da quebra', () => {
    // A quebra nao substitui o truncamento: o bloco de nome continua
    // `min-w-0 flex-1`, senao o nome volta a empurrar a linha inteira.
    render(<AppFileRow name="certificado-de-titulo-profesional-2026.pdf" />)

    const nome = screen.getByText('certificado-de-titulo-profesional-2026.pdf')
    expect(nome.className).toContain('truncate')
    expect(nome.parentElement?.className).toContain('min-w-0')
  })

  it('da BASE ao bloco de nome, senao a quebra nunca acontece', () => {
    // jsdom nao faz layout, entao o que se guarda aqui e a classe: sem base, o
    // `min-w-0` deixa o nome encolher sem limite e o grupo de acoes fica ao
    // lado para sempre. Medido no gate do BD-16, em 390px, no slot do REUF
    // (o unico sem botao de upload): 66px de nome e a data partida em tres
    // linhas antes; 178px, nome inteiro e data numa linha depois.
    render(<AppFileRow name="reuf-juan-morales.pdf" actions={<button type="button">Ver</button>} />)

    const nome = screen.getByText('reuf-juan-morales.pdf')
    expect(nome.parentElement?.className).toContain('basis-40')
  })

  it('ancora a linha a direita, senao o grupo que QUEBROU volta para a esquerda', () => {
    // D-22 medida de novo no gate, agora em 390px: o slot do REUF punha `Ver` em
    // x=122 e os outros dois, que ainda cabiam ao lado do nome, em x=248 — a
    // coluna de acao deixava de ser coluna assim que UM slot quebrava. Inerte
    // enquanto tudo cabe numa linha: o bloco de nome e `flex-1` e nao sobra
    // folga para distribuir (1440px, com e sem a classe: `Ver` em x=1290).
    const { container } = render(
      <AppFileRow name="cv.pdf" actions={<button type="button">Ver</button>} />,
    )

    expect(container.firstElementChild?.className).toContain('justify-end')
  })

  it('usa font-mono na linha de metadados', () => {
    // D-29: data e tamanho sao dado tecnico, e o token ja existe
    // (`index.css`). Alcanca comercial, turma e redator, que e consistencia.
    render(<AppFileRow name="cv.pdf" size={1024} createdAt="2026-08-01T10:00:00Z" />)

    // `formatFileSize(1024)` devolve exatamente "1 KB" (`shared/lib/upload.ts:13-17`:
    // abaixo de 1 MiB e' `${Math.round(bytes / 1024)} KB`). Casar pelo tamanho e nao
    // pela data porque a data depende da locale ativa, que a Task 4 acabou de mudar.
    const meta = screen.getByText(/\b1 KB\b/)
    expect(meta.className).toContain('font-mono')
  })
})
