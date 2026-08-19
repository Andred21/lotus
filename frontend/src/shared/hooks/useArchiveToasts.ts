import { useTranslation } from 'react-i18next'
import type { ProblemDetails } from '@shared/api/axios'
import { problemMessage } from '@shared/api/problemMessage'
// Caminho FUNDO e não o barrel `@shared/ui`: `shared/ui/index.ts` reexporta
// `FormPhotoRow`, que importa o barrel `@shared/hooks` — pelo barrel, este
// arquivo fecharia um ciclo de módulos com ele mesmo. O `AppToast` não importa
// nada de `hooks`.
import { useToast } from '@shared/ui/AppToast'

/**
 * O par de toasts do arquivamento, num lugar só.
 *
 * Nasceu do Q-3 do review de 2026-08-19: seis hooks de página tinham a MESMA
 * função `falhou` copiada, com o mesmo `problemMessage` e o mesmo par de chaves
 * `archive.*`. O `onError` não é conveniência em nenhum deles — é ele que dá
 * corpo ao 403 de quem não tem `*.restore` e ao 422 dos gates (turma concluída,
 * redator com turma em andamento, cotação sob orçamento arquivado). Copiado seis
 * vezes, era exatamente o que a sétima esqueceria.
 */
export function useArchiveToasts() {
  const { t } = useTranslation()
  const toast = useToast()

  return {
    archived: () => toast.success(t('archive.archivedToast')),
    restored: () => toast.success(t('archive.restoredToast')),
    /** Silencioso só quando o problema não traz nada exibível. */
    failed: (problem: ProblemDetails) => {
      const message = problemMessage(problem)
      if (message) toast.error(message)
    },
  }
}
