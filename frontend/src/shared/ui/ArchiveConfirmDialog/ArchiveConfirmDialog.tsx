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
 *
 * O diálogo NOMEIA o registro (C-4): "¿Archivar este registro?" não dizia qual,
 * e o clique errado numa linha vizinha passava sem o usuário ver. E a severidade
 * é `warning`, não `danger` — arquivar tem volta (Restaurar), e `danger` é de
 * quem destrói ou não tem volta (doc do `ConfirmDialog`).
 */
export function ArchiveConfirmDialog({
  target,
  name,
  pending,
  error,
  onArchive,
  onCancel,
}: {
  /** A entidade que o usuário mandou arquivar, ou `null` — o diálogo é o próprio
   * estado, então a página guarda a entidade e não um booleano. */
  target: { id?: number | null } | null
  /** Como o usuário reconhece o registro: folio, código ou nome. Já pronto para
   * exibir; só é lido com `target` presente. */
  name: string
  pending: boolean
  /** O erro do gate (403/422) — o diálogo segue aberto com ele (C-6). */
  error?: string | null
  onArchive: (id: number, options?: { onSuccess?: () => void }) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  if (!target) return null

  return (
    <ConfirmDialog
      visible
      title={t('archive.confirmArchiveTitle', { name })}
      message={t('archive.confirmArchiveBody', { name })}
      confirmLabel={t('archive.archiveAction')}
      severity="warning"
      pending={pending}
      error={error}
      onConfirm={() => target.id != null && onArchive(target.id, { onSuccess: onCancel })}
      onCancel={onCancel}
    />
  )
}
