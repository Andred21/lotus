import type { TurmaDocumentType } from '@shared/types/generated'

/**
 * Chave i18n de cada tipo de documento de turma.
 *
 * O `Record<TurmaDocumentType, …>` é o MECANISMO, não a documentação: tipo novo
 * no union gerado não compila até ganhar entrada aqui, e a catraca
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
 * Recebe `string` e não `TurmaDocumentType` porque é isso que o contrato
 * entrega: `RedatorTurmaPendenciaData.missing_types`,
 * `TurmaComplianceData.missing_types` e `TurmaData.missing_document_types` são
 * `string[]` no `generated.ts` — o DTO do backend não tipa o array com o enum
 * (divergência declarada, correção de backend fora deste bloco). Código fora do
 * mapa cai no próprio código: errado na tela, mas legível, nunca o caminho da
 * chave.
 *
 * Recebe `t` por parâmetro e mora em `shared/lib`, que não conhece i18next —
 * mesma disciplina do `loadMessage`.
 */
export function turmaDocumentTypeLabel(type: string, t: (key: string) => string): string {
  const key = TURMA_DOCUMENT_TYPE_KEY[type as TurmaDocumentType]
  return key ? t(key) : type
}

/** Os tipos que faltam, em uma linha só. Duas telas do dashboard imprimem esta
 * mesma lista — o separador é um, não dois. */
export function turmaDocumentTypeList(types: string[], t: (key: string) => string): string {
  return types.map((type) => turmaDocumentTypeLabel(type, t)).join(', ')
}
