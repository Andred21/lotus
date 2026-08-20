import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'

/**
 * As ações da linha de uma tabela que alterna entre ativos e arquivados:
 * restaurar de um lado, arquivar e ver do outro.
 *
 * Nasceu do Q-3 do review de 2026-08-19. Seis roots tinham o MESMO componente
 * copiado — 397 linhas ao todo —, diferindo em duas strings de permissão, no tipo
 * do DTO e na presença do botão de arquivar. Copiar tinha custo real: o `busy`
 * que impede o clique duplo (Q-2 do review de 2026-08-18) e o `disabled` do
 * arquivar teriam de ser corrigidos em seis sítios, sem nada que reprovasse o
 * esquecimento no sétimo root.
 *
 * As permissões chegam como BOOLEANOS, não como strings de permissão, e isso não
 * é preguiça: `shared/ui` não importa `shared/hooks` (mesma nota do
 * `ArchiveSwitch`), então quem chama `can()` é o adaptador da feature. Ele
 * também é quem sabe que `identity.access.manage` guarda as DUAS ações do staff
 * (spec D7) e que orçamento não tem botão de arquivar na tabela.
 *
 * Esconder o botão é conveniência de interface — a autorização real é da API
 * (ADR-07).
 */
export function ArchiveRowActions({
  archived,
  busy,
  canRestore,
  canArchive = false,
  onRestore,
  onArchive,
  onView,
}: {
  archived: boolean
  /** Mutation em voo: sem isto o clique duplo dispara dois POSTs (Q-2). */
  busy: boolean
  canRestore: boolean
  canArchive?: boolean
  onRestore: () => void
  onArchive?: () => void
  /** Ausente = sem olho. Na visão de arquivados ele SAI sempre: as rotas de
   * detalhe usam binding padrão e não enxergam soft-deletado — o botão levaria
   * a uma tela de 404. Restaurar primeiro, abrir depois. */
  onView?: () => void
}) {
  const { t } = useTranslation()

  if (archived) {
    return canRestore ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={onRestore}
      />
    ) : null
  }

  return (
    <div className="flex justify-end gap-1">
      {canArchive && onArchive && (
        <AppButton
          icon="pi pi-inbox"
          text
          rounded
          aria-label={t('archive.archiveAction')}
          disabled={busy}
          onClick={onArchive}
        />
      )}
      {onView && (
        <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={onView} />
      )}
    </div>
  )
}
