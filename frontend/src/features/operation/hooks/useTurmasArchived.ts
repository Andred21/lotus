import { useArchiveAction, useRestoreAction, useTableUrlState, type ArchiveMode } from '@shared/hooks'
import { useArchiveTurma, useRestoreTurma } from '../api/useTurmas'

/**
 * O modo da visão e as duas ações com toast. A LISTA não mora mais aqui: com
 * a paginação no servidor ela vem de `useTurmasPage(mode, status)`, que
 * troca o endpoint pelo modo. `useArchivedPage` (modo + lista + restore) segue
 * servindo as cinco raízes que não paginam; esta é a composição das peças
 * dele para uma raiz que pagina.
 *
 * O modo mora na URL (`archived=1`, C-3): recarregar ou voltar para a lista
 * reabre as Arquivadas. Só `1` vale — qualquer outro valor é o modo ativo, que
 * é também a URL sem o parâmetro. A página volta à primeira porque a chave da
 * lista muda e o `useServerTable` reage a isso.
 *
 * Os toasts vivem em `shared/` (Q-3 do review de 2026-08-19); aqui o de erro
 * cobre dois 422 próprios: turma concluída na RN-15 ao arquivar, e os gates
 * da spec D1 e do redator arquivado ao restaurar.
 */
export function useTurmasArchived() {
  const url = useTableUrlState({ enabled: true })
  const mode: ArchiveMode = url.read('archived') === '1' ? 'archived' : 'active'
  const setMode = (next: ArchiveMode) => url.write({ archived: next === 'archived' ? '1' : null })

  return {
    mode,
    setMode,
    ...useRestoreAction(useRestoreTurma()),
    ...useArchiveAction(useArchiveTurma()),
  }
}
