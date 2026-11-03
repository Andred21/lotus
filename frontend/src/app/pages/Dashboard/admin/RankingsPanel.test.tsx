import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { RankingsData } from '@shared/types/generated'
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
