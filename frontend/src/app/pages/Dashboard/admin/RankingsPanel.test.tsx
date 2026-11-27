import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { RankingRowData, RankingsData } from '@shared/types/generated'
import { RankingsPanel } from './RankingsPanel'
import { secoesVisiveis } from './secoes'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const RANKINGS: RankingsData = {
  courses: [{ id: 1, name: 'Alpha', turmas: 2, matriculas: 0, certificados: 0, uf_aprovada: '800.0000' }],
  clients: [{ id: 1, name: 'Cliente Uno', turmas: 3, matriculas: 2, certificados: 1, uf_aprovada: '1400.0000' }],
}

const SEM_DADO: RankingsData = { courses: [], clients: [] }

const ABERTO = { operation: true, commercial: true, certification: true, identity: true }

/**
 * Abre o seletor de métrica e devolve os rótulos da LISTA ofertada. Clica no
 * gatilho (o `input` só ganha foco) e lê `li[role=option]` do painel: o
 * `<select>` escondido do PrimeReact só carrega a opção selecionada, e ler dele
 * faria "não ofertada" passar por qualquer motivo.
 */
function opcoesOfertadas(): string[] {
  const gatilho = screen.getByRole('button', { expanded: false })
  fireEvent.click(gatilho)
  return Array.from(document.body.querySelectorAll('li[role="option"]')).map((o) => o.getAttribute('aria-label') ?? '')
}

describe('RankingsPanel — a opção de UF', () => {
  it('com o comercial fechado (ufMetrica=false), a métrica uf_aprovada não é ofertada', () => {
    render(<RankingsPanel rankings={RANKINGS} secoes={secoesVisiveis({ ...ABERTO, commercial: false })} />)

    const opcoes = opcoesOfertadas()

    // As três contagens, e só elas: a lista abriu de verdade e a UF não está nela.
    expect(opcoes).toEqual([
      'dashboard.rankings.metric.turmas',
      'dashboard.rankings.metric.matriculas',
      'dashboard.rankings.metric.certificados',
    ])
  })

  it('com o comercial aberto, a métrica uf_aprovada é ofertada', () => {
    render(<RankingsPanel rankings={RANKINGS} secoes={secoesVisiveis(ABERTO)} />)

    expect(opcoesOfertadas()).toEqual([
      'dashboard.rankings.metric.turmas',
      'dashboard.rankings.metric.matriculas',
      'dashboard.rankings.metric.certificados',
      'dashboard.rankings.metric.uf_aprovada',
    ])
  })
})

describe('RankingsPanel — gate aberto e coleção vazia', () => {
  it('com rankings vazios mostra "sem dados" nos dois cards, não os esconde', () => {
    render(<RankingsPanel rankings={SEM_DADO} secoes={secoesVisiveis(ABERTO)} />)

    expect(screen.getAllByText('dashboard.rankings.empty')).toHaveLength(2)
    expect(screen.getByText('dashboard.rankings.courses')).toBeTruthy()
    expect(screen.getByText('dashboard.rankings.clients')).toBeTruthy()
  })
})

const linha = (name: string, turmas: number, matriculas: number): RankingRowData => ({
  id: Math.abs(name.split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 7)),
  name,
  turmas,
  matriculas,
  certificados: 0,
  uf_aprovada: null,
})

/** Nomes das barras do primeiro ranking (cursos), na ordem em que desenham. */
function nomesDoPrimeiroRanking(): string[] {
  const tabela = screen.getAllByRole('table')[0]
  return within(tabela)
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.children[0].textContent ?? '')
}

const escolher = (rotulo: string) => {
  fireEvent.click(screen.getByRole('button', { expanded: false }))
  fireEvent.click(document.body.querySelector(`li[role="option"][aria-label="${rotulo}"]`) as HTMLElement)
}

describe('RankingsPanel — top 10', () => {
  // 30 cursos: `turmas` cresce com o índice, `matriculas` decresce.
  const TRINTA = Array.from({ length: 30 }, (_, i) => linha(`Curso ${String(i + 1).padStart(2, '0')}`, i + 1, 100 - i))

  it('ranking mostra no máximo 10 barras da métrica escolhida', () => {
    render(<RankingsPanel rankings={{ courses: TRINTA, clients: [] }} secoes={secoesVisiveis(ABERTO)} />)

    expect(nomesDoPrimeiroRanking()).toEqual(
      ['30', '29', '28', '27', '26', '25', '24', '23', '22', '21'].map((n) => `Curso ${n}`),
    )

    escolher('dashboard.rankings.metric.matriculas')

    // Trocar a métrica troca QUEM entra no top 10, não só a ordem.
    expect(nomesDoPrimeiroRanking()).toEqual(
      ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map((n) => `Curso ${n}`),
    )
  })

  it('empate na décima posição desempata por nome e o top 10 não depende da ordem de entrada', () => {
    // 9 linhas acima do empate e 5 empatadas em 5 disputando UMA vaga.
    const acima = Array.from({ length: 9 }, (_, i) => linha(`Topo ${i + 1}`, 50 + i, 0))
    const empatadas = ['Zeta', 'Beta', 'Eta', 'Alfa', 'Delta'].map((n) => linha(n, 5, 0))
    const entrada = [...acima, ...empatadas]

    const primeira = render(
      <RankingsPanel rankings={{ courses: entrada, clients: [] }} secoes={secoesVisiveis(ABERTO)} />,
    )
    const direta = nomesDoPrimeiroRanking()
    primeira.unmount()

    render(
      <RankingsPanel rankings={{ courses: [...entrada].reverse(), clients: [] }} secoes={secoesVisiveis(ABERTO)} />,
    )

    expect(nomesDoPrimeiroRanking()).toEqual(direta)
    expect(direta).toHaveLength(10)
    expect(direta[9]).toBe('Alfa')
  })
})
