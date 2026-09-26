import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { RoleData } from '@shared/types/generated'
import { RolesTable } from './RolesTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const roles: RoleData[] = [
  { id: 1, name: 'redator', permissions: ['a'], is_system: true },
  { id: 2, name: 'auditor', permissions: [], is_system: false },
]

describe('RolesTable', () => {
  it('o nome do role de sistema sai traduzido, e o customizado sai como foi digitado (UI-01)', () => {
    renderWithProviders(<RolesTable roles={roles} loading={false} onView={() => {}} />)
    expect(screen.getByText('roleName.redator')).toBeTruthy()
    expect(screen.queryByText('redator')).toBeNull()
    expect(screen.getByText('auditor')).toBeTruthy()
  })

  it('usa um piso menor que os 48rem default, para não forçar rolagem em 1024x768 (UI-02)', () => {
    // Mesma raiz do UI-03 de Pessoas (RedatoresTable): o piso default do
    // AppDataTable (min-w-[48rem] = 768px) é maior que os 718px de moldura em
    // 1024x768 — o piso vence, força rolagem, e o cabeçalho "Permisos" fica
    // cortado sob a coluna de ações presa.
    renderWithProviders(<RolesTable roles={roles} loading={false} onView={() => {}} />)
    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).not.toContain('min-w-[48rem]')
    expect(tabela.className).toContain('min-w-[42rem]')
  })
})
