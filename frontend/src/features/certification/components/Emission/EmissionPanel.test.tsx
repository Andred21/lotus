import { beforeAll, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import type { EmissionPanelEnrollmentData, EmissionPanelTurmaData } from '@shared/types/generated'
import type { useEmissionPanelState } from '../../hooks/useEmissionPanelState'
import { EmissionPanel } from './EmissionPanel'

/** `t` devolve a chave: o que se prova é QUAL texto o rótulo escolhe, não a
 * tradução (isso é do `parity.test.ts`). `i18n` junto do `t` porque o
 * `AppDropdown` remonta na troca de idioma e lê `i18n.language`. */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type PanelState = ReturnType<typeof useEmissionPanelState>

const estado = vi.hoisted<{ current: Partial<PanelState> }>(() => ({ current: {} }))
vi.mock('../../hooks/useEmissionPanelState', () => ({
  useEmissionPanelState: () => estado.current as PanelState,
}))

/** Sem turma escolhida: é o estado em que o placeholder ainda está na tela e
 * mascara a falta do rótulo — exatamente o que o UI-02 mede. */
function montar(over: Partial<PanelState> = {}) {
  estado.current = {
    turmaId: null,
    selected: null,
    options: [{ label: 'Alta tensión · Enel', value: 1 }],
    setTurmaId: () => {},
    desde: '2025-08-28',
    setDesde: () => {},
    loadError: null,
    loading: false,
    managerSignatureMissing: false,
    ...over,
  } as unknown as PanelState

  // O painel monta os diálogos junto (`ConfirmIssueDialog` e `BatchIssueDialog`
  // usam mutations), então o provider é obrigatório mesmo sem query viva.
  return renderWithProviders(<EmissionPanel />)
}

// O `AppDatePicker` da janela passa `locale="es"` ao Calendar do Prime; sem o
// boot (`main.tsx`), o botão do ícone estoura em `localeOption('chooseDate',
// 'es')`. A mesma nota de `fieldAssociation.test.tsx`.
beforeAll(registerPrimeLocales)

describe('EmissionPanel — o seletor de turma', () => {
  it('tem rótulo visível associado ao dropdown, e não só o placeholder', () => {
    // O nome acessível vinha do PLACEHOLDER, por acidente de implementação do
    // PrimeReact (ele o usa como texto do botão que abre a lista) — não por
    // desenho, e sem `<label>` nenhum. É a mesma forma que os três filtros de
    // estado irmãos já corrigiram.
    montar()

    expect(screen.getByLabelText('certificate.turmaConcluida')).toBeTruthy()
  })

  it('mostra o seletor da janela com rótulo associado e o default preenchido', () => {
    montar()

    const seletor = screen.getByLabelText('certificate.concludedSince') as HTMLInputElement
    expect(seletor).toBeTruthy()
    // `dd-mm-yy` é a gramática de `es-CL` do AppDatePicker.
    expect(seletor.value).toBe('28-08-2025')
  })
})

const ALUNO: EmissionPanelEnrollmentData = {
  enrollment_id: 10, student_name: 'Ana Torres', student_rut: '11.111.111-1', approval_status: 'aprobado',
  attendance_pct: '90', nota_final: '6.5', certificate: null, student_photo_url: null,
}

function turmaCom(hasFirma: boolean): EmissionPanelTurmaData {
  return {
    turma_id: 1, course_name: 'Alta tensión', client_name: 'Enel', end_date: '2026-07-24',
    emission_blocked: null, enrollments: [ALUNO], manager_signature_missing: false,
    redatores: [{ redator_id: 7, name: 'María Relatora', has_firma: hasFirma }],
  }
}

describe('EmissionPanel — avisos de assinatura (D6)', () => {
  it('mostra o aviso da firma da gerente quando falta', () => {
    montar({ managerSignatureMissing: true })

    expect(screen.getByText('certificate.warnings.managerSignatureMissing')).toBeTruthy()
  })

  it('não mostra o aviso da gerente quando a assinatura está cadastrada', () => {
    montar()

    expect(screen.queryByText('certificate.warnings.managerSignatureMissing')).toBeNull()
  })

  it('diálogo de emissão avisa relator sem firma e não bloqueia o botão', () => {
    const turma = turmaCom(false)
    montar({
      turmaId: 1, selected: turma, issuing: ALUNO,
      counts: { total: 1, aprobados: 1, emitidos: 0, pendientes: 1 },
      setIssuing: () => {}, setBatchIssuing: () => {}, batchIssuing: false,
      viewingCertificateId: null, openIssuedCertificate: () => {},
    })

    expect(screen.getByText('certificate.warnings.redatorWithoutFirma')).toBeTruthy()
    // Aviso, não bloqueio: o relator único já vem escolhido e o CTA segue ativo.
    const confirmar = screen.getByRole('button', { name: 'certificate.confirmEmit' }) as HTMLButtonElement
    expect(confirmar.disabled).toBe(false)
  })

  it('diálogo de emissão não avisa quando o relator tem firma', () => {
    montar({
      turmaId: 1, selected: turmaCom(true), issuing: ALUNO,
      counts: { total: 1, aprobados: 1, emitidos: 0, pendientes: 1 },
      setIssuing: () => {}, setBatchIssuing: () => {}, batchIssuing: false,
      viewingCertificateId: null, openIssuedCertificate: () => {},
    })

    expect(screen.queryByText('certificate.warnings.redatorWithoutFirma')).toBeNull()
  })
})
