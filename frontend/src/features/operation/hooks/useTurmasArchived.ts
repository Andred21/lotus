import { useState } from 'react'
import { useArchiveAction, useRestoreAction, type ArchiveMode } from '@shared/hooks'
import { useArchiveTurma, useRestoreTurma } from '../api/useTurmas'

/**
 * O modo da visão e as duas ações com toast. A LISTA não mora mais aqui: com
 * a paginação no servidor ela vem de `useTurmasPage(mode, status)`, que
 * troca o endpoint pelo modo. `useArchivedPage` (modo + lista + restore) segue
 * servindo as cinco raízes que não paginam; esta é a composição das peças
 * dele para uma raiz que pagina.
 *
 * Os toasts vivem em `shared/` (Q-3 do review de 2026-08-19); aqui o de erro
 * cobre dois 422 próprios: turma concluída na RN-15 ao arquivar, e os gates
 * da spec D1 e do redator arquivado ao restaurar.
 */
export function useTurmasArchived() {
  const [mode, setMode] = useState<ArchiveMode>('active')

  return {
    mode,
    setMode,
    ...useRestoreAction(useRestoreTurma()),
    ...useArchiveAction(useArchiveTurma()),
  }
}
