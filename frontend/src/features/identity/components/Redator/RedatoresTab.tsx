import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppButton, ArchiveConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { RedatorData } from '@shared/types/generated'
import { useRedatoresPage } from '../../hooks/useRedatoresPage'
import { useRedatoresArchived } from '../../hooks/useRedatoresArchived'
import { RedatoresTable } from './RedatoresTable'
import { RedatorDialog } from './RedatorDialog'

/**
 * A aba de redatores, dona do PRÓPRIO dado.
 *
 * Isto não é decomposição estética: com o hook no corpo da `PeoplePage`, acima
 * das abas, o `renderActiveOnly` do TabView (default `true`) não alcançava a
 * chamada, e abrir a tela buscava as DUAS abas (D-04). Aqui o hook vive dentro
 * do que só monta quando a aba está ativa — o mesmo desenho que a
 * `CertificatesPage` já usava.
 *
 * O deep link `?redator=` desce junto: a aba 0 é a ativa por default, então o
 * link chega com este componente montado.
 */
export function RedatoresTab() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const page = useRedatoresPage()
  const redatoresArchived = useRedatoresArchived()
  const [toArchive, setToArchive] = useState<RedatorData | null>(null)
  const archived = redatoresArchived.mode === 'archived'

  const [params, setParams] = useSearchParams()
  const deepLinkId = params.get('redator')
  const [consumed, setConsumed] = useState<string | null>(null)

  // Abrir o diálogo é mudança de estado: vai no corpo do render (o padrão da
  // casa), nunca num useEffect — `react-hooks/set-state-in-effect` proíbe.
  if (deepLinkId !== null && deepLinkId !== consumed) {
    setConsumed(deepLinkId)
    const id = Number(deepLinkId)
    if (Number.isInteger(id) && id > 0) page.openViewById(id)
  }

  // Limpar a URL é efeito colateral de navegação, não setState: aqui o effect é
  // o lugar certo. `replace` para o botão Voltar não reabrir o diálogo.
  useEffect(() => {
    if (deepLinkId === null) return
    const next = new URLSearchParams(params)
    next.delete('redator')
    setParams(next, { replace: true })
  }, [deepLinkId, params, setParams])

  return (
    <>
      <RedatoresTable
        redatores={archived ? redatoresArchived.items : page.items}
        loading={archived ? redatoresArchived.loading : page.loading}
        error={archived ? redatoresArchived.error : page.error}
        onRetry={archived ? redatoresArchived.refetch : page.refetch}
        mode={redatoresArchived.mode}
        onModeChange={redatoresArchived.setMode}
        onArchive={setToArchive}
        onRestore={(r) => r.id != null && redatoresArchived.restore(r.id)}
        busy={redatoresArchived.restoring || redatoresArchived.archiving}
        onView={page.openView}
        actions={
          can('identity.user.create')
            ? <AppButton variant="brandIcon" label={t('redator.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
            : undefined
        }
      />

      {/* Em `view` sem entidade (deep link enquanto o GET não voltou, ou id
          inexistente) não há o que mostrar: um diálogo de campos vazios é pior
          que nenhum. `create` não tem entidade por definição. */}
      {page.dialog && (page.dialog.mode === 'create' || page.dialog.entity) && (
        <RedatorDialog
          visible
          mode={page.dialog.mode}
          redator={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}

      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      <ArchiveConfirmDialog
        target={toArchive}
        pending={redatoresArchived.archiving}
        onArchive={redatoresArchived.archive}
        onCancel={() => setToArchive(null)}
      />
    </>
  )
}
