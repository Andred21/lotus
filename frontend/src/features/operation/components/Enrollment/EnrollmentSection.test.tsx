import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { TurmaData } from '@shared/types/generated'
import type { useEnrollmentSection } from '../../hooks/useEnrollmentSection'
import type { useEnrollmentsArchived } from '../../hooks/useEnrollmentsArchived'
import { EnrollmentSection } from './EnrollmentSection'

/**
 * O caminho da D5 — o switch LOCAL da aba Alumnos — não tinha teste nenhum:
 * `TurmaDetailPage.test.tsx` mocka o detalhe e nunca chega a montar esta
 * seção. O irmão já mergeado (`QuotesList.test.tsx`) tem o seu.
 */
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

// Os dois diálogos abrem query própria e não têm parte nesta prova.
vi.mock('./EnrollStudentForm', () => ({ EnrollStudentForm: () => null }))
vi.mock('./ImportDialog', () => ({ ImportDialog: () => null }))

type Section = ReturnType<typeof useEnrollmentSection>
type Archived = ReturnType<typeof useEnrollmentsArchived>

const section = vi.hoisted<{ current: Partial<Section> }>(() => ({ current: {} }))
const archived = vi.hoisted<{ current: Partial<Archived> }>(() => ({ current: {} }))

vi.mock('../../hooks/useEnrollmentSection', () => ({
  useEnrollmentSection: () => section.current as Section,
}))
vi.mock('../../hooks/useEnrollmentsArchived', () => ({
  useEnrollmentsArchived: () => archived.current as Archived,
}))

const TURMA = { id: 1, client_name: 'Transelec' } as TurmaData

/** A `EnrollmentTable` monta o `RegisterResultDialog`, que abre mutation
 * própria — o provider entra para a árvore montar, não porque a prova dependa
 * de rede. */
function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <EnrollmentSection turma={TURMA} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  section.current = {
    enrollments: [], loading: false, remove: () => {}, removing: false,
    resetRemove: () => {}, reload: () => {}, error: undefined, loadError: null,
  }
  archived.current = {
    mode: 'active', setMode: () => {}, items: [], loading: false,
    error: undefined, refetch: () => Promise.resolve(), restore: () => {}, restoring: false,
  }
})

afterEach(() => {
  cleanup()
})

describe('EnrollmentSection e o switch local da D5', () => {
  it('o switch aparece mesmo sem matrícula ativa', () => {
    montar()

    expect(screen.getByRole('button', { name: /archive\.archived/i })).toBeTruthy()
  })

  it('em arquivados, o erro de uma REMOÇÃO que falhou não fica pendurado', () => {
    // O `resetRemove` mora no diálogo do `EnrollmentTable`, que na visão de
    // arquivadas nem está montado: sem a guarda, o banner não teria como sair.
    section.current = { ...section.current, error: 'No se pudo quitar al alumno' }
    archived.current = { ...archived.current, mode: 'archived' }

    montar()

    expect(screen.queryByText('No se pudo quitar al alumno')).toBeNull()
  })

  it('na visão ativa, o MESMO erro aparece', () => {
    section.current = { ...section.current, error: 'No se pudo quitar al alumno' }

    montar()

    expect(screen.getByText('No se pudo quitar al alumno')).toBeTruthy()
  })
})
