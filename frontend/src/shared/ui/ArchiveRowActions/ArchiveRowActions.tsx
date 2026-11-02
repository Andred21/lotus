import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'
import { RowActions, type RowAction } from '../RowActions'

/**
 * As ações da linha de uma tabela que alterna entre ativos e arquivados:
 * restaurar de um lado, ver e arquivar do outro.
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
 *
 * `collapsed` é o do `useCollapsibleActionsColumn` da tabela: abaixo de `sm` a
 * linha ativa vira o menu do `RowActions`, e restaurar perde o rótulo visível
 * (Q-1 do review de 2026-09-26). Desde o item 23 toda tabela que usa isto liga
 * o hook; o default `false` fica para quem monta a peça fora de tabela.
 */
export function ArchiveRowActions({
  archived,
  busy,
  canRestore,
  canArchive = false,
  onRestore,
  onArchive,
  onView,
  collapsed = false,
  extra = [],
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
  collapsed?: boolean
  /** Ações próprias da feature, entre ver e arquivar, na mesma linha ou no
   * mesmo menu — o "Reenviar invitación" de Redactores. Só na lista ativa: na
   * de arquivados a linha só restaura. */
  extra?: RowAction[]
}) {
  const { t } = useTranslation()

  if (archived) {
    if (!canRestore) return null
    // Ação única: `RowActions` centraliza na célula e dá a dica (também com o
    // botão apagado pelo `busy`). Colapsada o rótulo não cabe e vira só o
    // nome acessível; fora do colapso o restaurar segue rotulado.
    return collapsed ? (
      <RowActions
        collapsed
        actions={[{ label: t('archive.restoreAction'), icon: 'pi pi-undo', onClick: onRestore, disabled: busy }]}
      />
    ) : (
      <div className="flex justify-center">
        <AppButton
          label={t('archive.restoreAction')}
          icon="pi pi-undo"
          text
          size="small"
          disabled={busy}
          onClick={onRestore}
        />
      </div>
    )
  }

  // Ver → próprias da feature → arquivar: a destrutiva por último.
  const actions: RowAction[] = []
  if (onView) {
    actions.push({ label: t('common.view'), icon: 'pi pi-eye', onClick: onView })
  }
  actions.push(...extra)
  if (canArchive && onArchive) {
    actions.push({ label: t('archive.archiveAction'), icon: 'pi pi-inbox', onClick: onArchive, disabled: busy })
  }

  return <RowActions actions={actions} collapsed={collapsed} />
}
