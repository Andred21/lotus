import type { TurmaDocumentType } from '@shared/types/generated'

/**
 * Chave i18n de cada tipo de documento de turma.
 *
 * O `Record<TurmaDocumentType, …>` é o MECANISMO, não a documentação: tipo novo
 * no union gerado não compila até ganhar entrada aqui — e, desde a D-57, o
 * acesso ao mapa também não tem escapatória, porque `turmaDocumentTypeLabel`
 * recebe o enum e não `string`. A catraca
 * (`turmaDocumentType.test.ts`) exige que a chave exista nas 3 locales. Antes
 * disto, quatro sítios montavam a chave por template
 * (`t('operation.documents.type.' + tipo)`) e um tipo sem tradução imprimia o
 * CAMINHO da chave na tela, sem nada reprovar — a falha ficava mais silenciosa
 * do que o código cru que a correção do UI-07 tinha ido consertar.
 */
export const TURMA_DOCUMENT_TYPE_KEY: Record<TurmaDocumentType, string> = {
  MANUAL: 'operation.documents.type.MANUAL',
  PRUEBAS: 'operation.documents.type.PRUEBAS',
  EVALUACION_REDATOR: 'operation.documents.type.EVALUACION_REDATOR',
}

/**
 * Rótulo traduzido de um tipo de documento de turma.
 *
 * Recebe `TurmaDocumentType` e não `string`: desde a D-57 (2026-08-25) o
 * contrato entrega o enum — `RedatorTurmaPendenciaData.missing_types`,
 * `TurmaComplianceData.missing_types`/`present_types` e
 * `TurmaData.missing_document_types` são `TurmaDocumentType[]` no
 * `generated.ts`. O fallback `? key : type` que existia aqui era a compensação
 * de o `tsc` não alcançar o call site; com o parâmetro estreito, tipo novo no
 * union não compila até ganhar entrada no mapa, e não há mais como um código
 * cru chegar à tela.
 *
 * Recebe `t` por parâmetro e mora em `shared/lib`, que não conhece i18next —
 * mesma disciplina do `loadMessage`.
 */
export function turmaDocumentTypeLabel(type: TurmaDocumentType, t: (key: string) => string): string {
  return t(TURMA_DOCUMENT_TYPE_KEY[type])
}

/** Os tipos que faltam, em uma linha só. Duas telas do dashboard imprimem esta
 * mesma lista — o separador é um, não dois. */
export function turmaDocumentTypeList(types: TurmaDocumentType[], t: (key: string) => string): string {
  return types.map((type) => turmaDocumentTypeLabel(type, t)).join(', ')
}
