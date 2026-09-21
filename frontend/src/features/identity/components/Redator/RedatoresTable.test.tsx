import { describe, expect, it, vi } from 'vitest'
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
