import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { setViewportWidth } from '@shared/testing/viewport'
import { renderWithProviders } from '@shared/testing/providers'
import { RedatoresTable, type RedatorRow } from './RedatoresTable'

/** `t` devolve a chave: o que se prova aqui é a largura mínima da tabela, não
 * texto traduzido. */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const REDATOR: RedatorRow = {
  id: 1,
  name: 'Juan Morales',
  email: 'juan.morales@lotus.cl',
  rut: '12.345.678-5',
  course_ids: [1, 2],
  photo_url: null,
  last_login: null,
} as unknown as RedatorRow

const montar = (mode: 'active' | 'archived' = 'active') =>
  renderWithProviders(
    <RedatoresTable
      redatores={[REDATOR]}
      loading={false}
      onView={() => {}}
      mode={mode}
      onModeChange={() => {}}
      onArchive={() => {}}
      onRestore={() => {}}
      busy={false}
    />,
  )

describe('RedatoresTable — largura mínima da tabela (UI-03)', () => {
  it('usa um piso menor que os 48rem default, para não forçar rolagem em 1024x768 (718px de moldura)', () => {
    // A moldura padrão do AppDataTable (`min-w-[48rem]` = 768px) é maior que os
    // 718px disponíveis em 1024x768 — o piso vence e a tabela é forçada a
    // rolar mesmo sem precisar, e a coluna de ações presa (`right: 0`) passa a
    // cobrir "Último acceso" com 50px de sobreposição (UI-03,
    // `2026-09-04-lotus-ui-review-personas.md`). Redatores reduz o piso para
    // caber nos 718px sem rolagem.
    montar()

    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).not.toContain('min-w-[48rem]')
    expect(tabela.className).toContain('min-w-[42rem]')
  })

  it('mantém o piso reduzido também na visão de arquivados', () => {
    montar('archived')

    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).toContain('min-w-[42rem]')
  })
})

/** Q-1 do review de 2026-09-26 (UI-01 de Pessoas, classe C): em 390x844 a
 * moldura tem 276px e a coluna presa de 12rem (192px) deixava 8px do nome
 * visíveis — só a inicial. Nenhum piso resolve (a coluna precisaria de ~70% da
 * tabela), então abaixo de `sm` as ações colapsam num botão só e a coluna
 * encolhe junto. */
describe('RedatoresTable — ações colapsam no telefone (UI-01)', () => {
  const larguraDaColunaDeAcoes = () =>
    (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

  it('em 390px a linha tem UM botão de ações, e a coluna presa encolhe para ele', () => {
    setViewportWidth(390)
    montar()

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'redator.resendInvitation' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('no desktop, os ícones seguem soltos na linha e a coluna mantém os 12rem', () => {
    montar()

    expect(screen.getByRole('button', { name: 'redator.resendInvitation' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'common.moreActions' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('12rem')
  })
})

describe('RedatoresTable — Último acceso (item 23)', () => {
  it('sai no Timestamp, com o instante do backend no dateTime', () => {
    renderWithProviders(
      <RedatoresTable
        redatores={[{ ...REDATOR, last_login: '2026-09-27T23:24:00Z' } as RedatorRow]}
        loading={false}
        onView={() => {}}
        mode="active"
        onModeChange={() => {}}
        onArchive={() => {}}
        onRestore={() => {}}
        busy={false}
      />,
    )
    expect(document.querySelector('td time')?.getAttribute('dateTime')).toBe('2026-09-27T23:24:00.000Z')
  })
})
