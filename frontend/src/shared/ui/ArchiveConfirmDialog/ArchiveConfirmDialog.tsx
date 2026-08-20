import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../ConfirmDialog'

/**
 * A confirmação de arquivar, com a cópia e a mecânica num lugar só.
 *
 * Cinco páginas tinham o mesmo bloco copiado — mesmo título, mesmo corpo, mesmo
 * `severity`, e o mesmo detalhe que é fácil perder de vista na sexta cópia: o
 * diálogo só fecha no SUCESSO (`onSuccess: onCancel`), para o 403 e os 422 dos
 * gates terem onde pousar. Fechar no clique deixaria o toast de erro sozinho
 * sobre uma lista que não mudou (Q-3 do review de 2026-08-19).
 *
 * RESTAURAR não pede confirmação: não é destrutivo (molde D9). Por isso este
 * componente é só do arquivar.
 */
export function ArchiveConfirmDialog({
  target,
  pending,
  onArchive,
  onCancel,
}: {
  /** A entidade que o usuário mandou arquivar, ou `null` — o diálogo é o próprio
   * estado, então a página guarda a entidade e não um booleano. */
  target: { id?: number | null } | null
  pending: boolean
  onArchive: (id: number, options?: { onSuccess?: () => void }) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  if (!target) return null

  return (
    <ConfirmDialog
      visible
      title={t('archive.confirmArchiveTitle')}
      message={t('archive.confirmArchiveBody')}
      confirmLabel={t('archive.archiveAction')}
      severity="danger"
      pending={pending}
      onConfirm={() => target.id != null && onArchive(target.id, { onSuccess: onCancel })}
      onCancel={onCancel}
    />
  )
}
