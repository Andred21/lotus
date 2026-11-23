import { describe, expect, it } from 'vitest'
import type { TurmaDocumentType, TurmaStatus } from '@shared/types/generated'
import { podeAnexar, podeRemover } from './evaluacionGate'

const SUBMIT = 'operation.turma.submit_docs'
const CLIENTE = 'operation.turma.submit_client_evaluation'
const CONCLUIDA = 'operation.turma.manage_concluded_docs'

/** Os papéis do seed, com as permissões que o `RolePermissionSeeder` lhes dá. */
const PAPEIS = {
  redator: [SUBMIT],
  admin: [CLIENTE],
  superadmin: [SUBMIT, CLIENTE, CONCLUIDA],
}
type Papel = keyof typeof PAPEIS

const TIPOS: TurmaDocumentType[] = ['MANUAL', 'EVALUACION_REDATOR', 'EVALUACION_ALUNO', 'EVALUACION_CLIENTE']

/** As linhas do data provider de `TurmaEvaluacionUploadMatrixTest` (backend): o
 * código HTTP vira boolean (201/204 = pode; 403/422 = não). */
const ANEXAR: Record<TurmaStatus, Record<Papel, boolean[]>> = {
  em_andamento: {
    redator: [true, true, true, false],
    admin: [false, false, false, true],
    superadmin: [true, true, true, true],
  },
  concluida: {
    redator: [false, false, true, false],
    admin: [false, false, false, true],
    superadmin: [true, true, true, true],
  },
}

const REMOVER: Record<TurmaStatus, Record<Papel, boolean[]>> = {
  em_andamento: {
    redator: [true, true, true, false],
    admin: [false, false, false, true],
    superadmin: [true, true, true, true],
  },
  concluida: {
    redator: [false, false, false, false],
    admin: [false, false, false, false],
    superadmin: [true, true, true, true],
  },
}

const linhas = (matriz: typeof ANEXAR) =>
  (Object.keys(matriz) as TurmaStatus[]).flatMap((status) =>
    (Object.keys(matriz[status]) as Papel[]).flatMap((papel) =>
      TIPOS.map((tipo, i) => [papel, tipo, status, matriz[status][papel][i]] as const),
    ),
  )

const comoPapel = (papel: Papel) => (p: string) => PAPEIS[papel].includes(p)

describe('podeAnexar espelha a matriz do backend', () => {
  it.each(linhas(ANEXAR))('%s anexa %s em %s: %s', (papel, tipo, status, esperado) => {
    expect(podeAnexar(tipo, status, comoPapel(papel))).toBe(esperado)
  })

  it('só manage_concluded_docs, sem submit_docs: anexa MANUAL em turma concluída (o gate aceita qualquer das duas)', () => {
    expect(podeAnexar('MANUAL', 'concluida', (p) => p === CONCLUIDA)).toBe(true)
  })

  it('sem permissão nenhuma: nada', () => {
    for (const tipo of TIPOS) expect(podeAnexar(tipo, 'em_andamento', () => false)).toBe(false)
  })
})

describe('podeRemover espelha a matriz do backend', () => {
  it.each(linhas(REMOVER))('%s remove %s em %s: %s', (papel, tipo, status, esperado) => {
    expect(podeRemover(tipo, status, comoPapel(papel))).toBe(esperado)
  })
})
