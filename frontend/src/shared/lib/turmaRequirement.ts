import type { TurmaRequirement } from '@shared/types/generated'

/**
 * Chave i18n de cada requisito de configuração da turma (além dos documentos).
 *
 * Mesmo desenho de `turmaDocumentType.ts`: o `Record<TurmaRequirement, …>` é o
 * mecanismo — requisito novo no union gerado não compila até ganhar entrada
 * aqui, e `turmaRequirement.test.ts` exige a chave nas 3 locales. As chaves são
 * as que a tela de conclusão já usava; o Cumplimiento do dashboard passa a
 * imprimir a mesma frase, de uma fonte só.
 */
export const TURMA_REQUIREMENT_KEY: Record<TurmaRequirement, string> = {
  redator: 'operation.conclusion.requirement.redator',
  local_aplicacao: 'operation.conclusion.requirement.local_aplicacao',
}

/** Rótulo traduzido de um requisito. `t` por parâmetro: `shared/lib` não
 * conhece i18next. */
export function turmaRequirementLabel(req: TurmaRequirement, t: (key: string) => string): string {
  return t(TURMA_REQUIREMENT_KEY[req])
}

/** Os requisitos que faltam, em uma linha só, na ordem recebida. */
export function turmaRequirementList(reqs: TurmaRequirement[], t: (key: string) => string): string {
  return reqs.map((req) => turmaRequirementLabel(req, t)).join(', ')
}
