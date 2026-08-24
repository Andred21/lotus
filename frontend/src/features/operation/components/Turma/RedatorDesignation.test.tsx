import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { TurmaData } from '@shared/types/generated'
import type { useRedatorPicker } from '../../hooks/useRedatorPicker'
import { RedatorDesignation } from './RedatorDesignation'

/**
 * Catraca do UI-01: numa turma concluída o registro acadêmico inteiro está
 * trancado (RN-15), e `DesignateRedatorAction`/`RemoveRedatorAction` recusam a
 * escrita com 422. A aba oferecia `Quitar` por redator e `Cambiar` mesmo assim.
 * A prova mora aqui, no componente que DECIDE o render — a `TurmaDetailPage`
 * monta só o painel ativo (`renderActiveOnly` do TabView) e nunca chega nesta
 * aba.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type Picker = ReturnType<typeof useRedatorPicker>

/** `Partial<>` e não `Record<string, unknown>`: os NOMES dos campos do hook
 * seguem checados, então renomear um lá quebra aqui em vez de passar batido. */
const picker = vi.hoisted<{ current: Partial<Picker> }>(() => ({ current: {} }))
vi.mock('../../hooks/useRedatorPicker', () => ({
  useRedatorPicker: () => picker.current as Picker,
}))

const REDATOR = { id: 4, name: 'Carla Núñez', email: 'carla@lotus.cl', photo_url: null }

const TURMA = {
  id: 1, course_id: 9, status: 'em_andamento', redatores: [REDATOR],
} as TurmaData
/** Mesma turma, registro acadêmico fechado (RN-15). */
const TURMA_CONCLUIDA = { ...TURMA, status: 'concluida' } as TurmaData

/** O RBAC real vem da sessão (`usePermissions` lê o store) — mockar o hook
 * testaria o mock, não a fiação. Molde do `EnrollmentSection.test.tsx`. */
function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

beforeEach(() => {
  comPermissoes(['operation.turma.assign_redator'])
  picker.current = {
    eligible: [], loadingList: false, loadError: null,
    reloadList: () => Promise.resolve(), designate: () => {}, remove: () => {},
    pending: false, error: undefined,
  }
})

afterEach(() => {
  cleanup()
})

describe('RedatorDesignation numa turma concluída (UI-01)', () => {
  it('em curso, os dois controles de escrita estão lá — é o que a turma concluída precisa esconder', () => {
    render(<RedatorDesignation turma={TURMA} />)

    expect(screen.getByRole('button', { name: /operation\.redator\.remove/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /operation\.redator\.change/i })).toBeTruthy()
  })

  it('concluída, o Quitar de cada redator e o Cambiar somem', () => {
    render(<RedatorDesignation turma={TURMA_CONCLUIDA} />)

    expect(screen.queryByRole('button', { name: /operation\.redator\.remove/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /operation\.redator\.change/i })).toBeNull()
    // `Designar` é o MESMO botão com outro rótulo (turma sem redator): esconder
    // um e deixar o outro seria trocar o texto do buraco.
    expect(screen.queryByRole('button', { name: /operation\.redator\.designate/i })).toBeNull()
  })

  it('concluída, a leitura permanece: redator, tag Idóneo e nota de rodapé', () => {
    render(<RedatorDesignation turma={TURMA_CONCLUIDA} />)

    expect(screen.getByText('Carla Núñez')).toBeTruthy()
    expect(screen.getByText('operation.redator.idoneo')).toBeTruthy()
    expect(screen.getByText('operation.redator.helpNote')).toBeTruthy()
  })

  it('concluída e SEM redator designado, também não há Designar', () => {
    render(<RedatorDesignation turma={{ ...TURMA_CONCLUIDA, redatores: [] } as TurmaData} />)

    expect(screen.queryByRole('button', { name: /operation\.redator\.designate/i })).toBeNull()
    expect(screen.getByText('operation.redator.none')).toBeTruthy()
  })
})

/**
 * Catraca do Q-2 (review de 2026-08-24): `operation.turma.assign_redator` é a
 * permissão que o controller exige nos DOIS métodos (`designateRedator`,
 * `removeRedator`), e a aba escondia só pela RN-15. Quem chega aqui sem ela —
 * o redator vindo da pendência do dashboard — recebia dois controles que só
 * rendem 403.
 */
describe('RedatorDesignation sem permissão de designação (Q-2)', () => {
  it('turma em curso, mas sem `operation.turma.assign_redator`: nem Quitar nem Cambiar', () => {
    comPermissoes(['operation.turma.view'])

    render(<RedatorDesignation turma={TURMA} />)

    expect(screen.queryByRole('button', { name: /operation\.redator\.remove/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /operation\.redator\.change/i })).toBeNull()
  })

  it('sem a permissão e sem redator designado, também não há Designar', () => {
    comPermissoes([])

    render(<RedatorDesignation turma={{ ...TURMA, redatores: [] } as TurmaData} />)

    expect(screen.queryByRole('button', { name: /operation\.redator\.designate/i })).toBeNull()
    // A leitura permanece: quem não designa ainda precisa saber que não há redator.
    expect(screen.getByText('operation.redator.none')).toBeTruthy()
  })
})
