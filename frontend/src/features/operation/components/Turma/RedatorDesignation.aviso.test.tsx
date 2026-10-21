import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { RedatorData, TurmaData } from '@shared/types/generated'
import type { RedatorPickerOption, useRedatorPicker } from '../../hooks/useRedatorPicker'
import { RedatorDesignation } from './RedatorDesignation'

/** Aviso de idoneidade (RN-09) da designação — o resto do componente (RN-15, Q-2)
 * fica em `RedatorDesignation.test.tsx`, separado só pelo limite de linhas. */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (k, o) => (o ? `${k}|${JSON.stringify(o)}` : k),
    }),
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
    options: [], motivosDe: () => [], pendingConfirmation: null,
    pick: vi.fn(() => true), confirmPick: vi.fn(), cancelPick: vi.fn(),
    loadingList: false, loadError: null,
    reloadList: () => Promise.resolve(), remove: () => {},
    pending: false, error: undefined,
  }
})

const INIDONEO = { id: 8, name: 'Diego Soto', email: 'diego@lotus.cl', photo_url: null } as RedatorData
const OPCAO_INIDONEA: RedatorPickerOption = {
  redator: INIDONEO, motivos: ['not_qualified', 'reuf_invalid'],
}

/**
 * RN-09 virou aviso (bloco 39): o picker lista todos, a tag diz o motivo e o
 * inidôneo só é designado depois da confirmação. `motivosDe → null` é a lista
 * não carregada: nenhuma tag, porque "Idóneo" por omissão afirmaria o que o
 * front não sabe.
 */
describe('RedatorDesignation com aviso de idoneidade (RN-09)', () => {
  it('designado inidôneo mostra a tag do motivo, e não a de Idóneo', () => {
    picker.current = { ...picker.current, motivosDe: () => ['reuf_invalid'] }

    render(<RedatorDesignation turma={TURMA} />)

    expect(screen.getByText('operation.redator.motivo.reuf_invalid')).toBeTruthy()
    expect(screen.queryByText('operation.redator.idoneo')).toBeNull()
  })

  it('com a lista não carregada (motivosDe null), nenhuma tag aparece', () => {
    picker.current = { ...picker.current, motivosDe: () => null }

    render(<RedatorDesignation turma={TURMA} />)

    expect(screen.queryByText('operation.redator.idoneo')).toBeNull()
    expect(screen.queryByText(/operation\.redator\.motivo\./)).toBeNull()
  })

  it('no picker aberto, a opção inidônea traz a tag de cada motivo', () => {
    picker.current = { ...picker.current, options: [OPCAO_INIDONEA] }
    render(<RedatorDesignation turma={TURMA} />)

    fireEvent.click(screen.getByRole('button', { name: /operation\.redator\.change/i }))

    expect(screen.getByText('Diego Soto')).toBeTruthy()
    expect(screen.getByText('operation.redator.motivo.not_qualified')).toBeTruthy()
    expect(screen.getByText('operation.redator.motivo.reuf_invalid')).toBeTruthy()
  })

  describe('com confirmação pendente', () => {
    beforeEach(() => {
      picker.current = { ...picker.current, pendingConfirmation: OPCAO_INIDONEA }
    })

    it('o diálogo traz o título e os dois motivos na mensagem', () => {
      render(<RedatorDesignation turma={TURMA} />)

      expect(screen.getByText('operation.redator.confirmIneligibleTitle')).toBeTruthy()
      const mensagem = screen.getByText(/operation\.redator\.confirmIneligibleMessage/)
      expect(mensagem.textContent).toContain('operation.redator.motivo.not_qualified')
      expect(mensagem.textContent).toContain('operation.redator.motivo.reuf_invalid')
    })

    it('confirmar chama confirmPick', () => {
      render(<RedatorDesignation turma={TURMA} />)

      fireEvent.click(screen.getByRole('button', { name: /operation\.redator\.confirmIneligibleAction/ }))

      expect(picker.current.confirmPick).toHaveBeenCalledOnce()
    })

    it('cancelar chama cancelPick', () => {
      render(<RedatorDesignation turma={TURMA} />)

      fireEvent.click(screen.getByRole('button', { name: /common\.cancel/ }))

      expect(picker.current.cancelPick).toHaveBeenCalled()
      expect(picker.current.confirmPick).not.toHaveBeenCalled()
    })
  })
})
