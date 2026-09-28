import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, IdentityCell, AppTag, AppEmptyState, ConfirmDialog, narrowFloorTablePt, stickyActionsColumn, useCollapsibleActionsColumn } from '@shared/ui'
import { enrollmentWidths } from './enrollmentColumns'
import { useTableFilter, usePermissions } from '@shared/hooks'
import type { EnrollmentData } from '@shared/types/generated'
import { enrollmentStatusLabelKey, enrollmentStatusSeverity } from '@shared/lib'
import { RegisterResultDialog } from './RegisterResultDialog'
import { EnrollmentRowActions } from './EnrollmentRowActions'

type Props = {
  turmaId: number
  /** RN-15: registro acadêmico fechado (turma concluída). Chega como booleano
   * porque esta tabela recebe `turmaId`, não a turma — derivar aqui exigiria um
   * dado que ela não tem, e o dono da regra é `lib/turmaStatus`. */
  registroBloqueado: boolean
  enrollments: EnrollmentData[]
  loading: boolean
  onRemove: (enrollmentId: number, options?: { onSuccess?: () => void }) => void
  removing: boolean
  removeError?: string
  onResetRemove: () => void
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}
// Sem coluna CLIENTE: EnrollmentData não expõe cliente (a turma tem um único
// cliente, já mostrado no cabeçalho da página) — desvio consciente da spec
// (§3), não uma lacuna.
export function EnrollmentTable({
  turmaId, registroBloqueado, enrollments, loading, onRemove, removing, removeError,
  onResetRemove, error, onRetry,
}: Props) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const [pending, setPending] = useState<EnrollmentData | null>(null)
  // Alvo do diálogo de resultado: estado local, igual ao `pending` da
  // remoção acima — os dois são ação por LINHA, então a linha que abre o
  // diálogo é quem sabe qual matrícula está em jogo (EnrollmentSection só
  // guarda o estado dos diálogos que não dependem de uma linha: Agregar e
  // Importar).
  const [resultTarget, setResultTarget] = useState<EnrollmentData | null>(null)
  const canManage = can('operation.enrollment.manage')
  // Aba sem busca (decisão do protótipo): o hook entra pelo estado de página e
  // pelo clamp, que estavam copiados aqui linha a linha.
  const table = useTableFilter(enrollments)
  const largura = enrollmentWidths(!registroBloqueado)
  const colunaDeAcoes = useCollapsibleActionsColumn('9rem')
  return (
    <>
      <AppDataTable
        value={table.rows}
        loading={loading}
        error={error}
        onRetry={onRetry}
        first={table.first}
        onPage={table.onPage}
        // Piso de 390 medido (item 23, audit §5): 292px de 1ª coluna contra 204px livres.
        pt={narrowFloorTablePt('31.5rem')}
        footerCount={t('operation.enrollment.footerCount', { count: table.rows.length })}
        emptyMessage={
          // Sem ação: matricular é o botão da toolbar, logo acima.
          <AppEmptyState
            icon="pi pi-users"
            title={t('operation.enrollment.empty')}
            description={t('operation.enrollment.emptyHint')}
          />
        }
      >
        <AppColumn
          header={t('operation.enrollment.table.name')}
          body={(e: EnrollmentData) => (
            /* `email` é nullable no DTO. Sem rótulo de ausência: a célula
             * simplesmente não abre a segunda linha, o que evita chave de
             * i18n nova e mantém a altura da linha estável. */
            <IdentityCell title={e.name} description={e.email} image={e.photo_url} />
          )}
          style={largura.name}
        />
        <AppColumn header={t('operation.enrollment.table.rut')} field="rut" style={largura.rut} />
        <AppColumn
          header={t('operation.enrollment.table.status')}
          body={(e: EnrollmentData) =>
            e.approval_status ? (
              <AppTag
                value={t(enrollmentStatusLabelKey(e.approval_status))}
                severity={enrollmentStatusSeverity(e.approval_status)}
              />
            ) : null
          }
          style={largura.status}
        />
        {/* A coluna inteira sai, não só os botões: `RecordEnrollmentResultAction`
          * e `RemoveEnrollmentAction` recusam a escrita com 422 no registro
          * fechado, e uma faixa de 6rem vazia em toda linha só rouba largura das
          * colunas de dado, que é o que sobra para ler. O `sticky` da UI-02 acompanha a coluna. */}
        {!registroBloqueado && (
          <AppColumn
            body={(e: EnrollmentData) => (
              <EnrollmentRowActions
                canManage={canManage}
                removing={removing}
                onResult={() => setResultTarget(e)}
                onRemove={() => setPending(e)}
                collapsed={colunaDeAcoes.collapsed}
              />
            )}
            style={stickyActionsColumn(colunaDeAcoes.width)}
          />
        )}
      </AppDataTable>

      <ConfirmDialog
        visible={pending !== null}
        title={t('operation.enrollment.removeTitle')}
        message={t('operation.enrollment.removeConfirm', { name: pending?.name ?? '' })}
        confirmLabel={t('operation.enrollment.remove')}
        severity="danger"
        pending={removing}
        error={removeError}
        onConfirm={() => {
          if (pending?.id == null || removing) return
          onRemove(pending.id, { onSuccess: () => setPending(null) })
        }}
        onCancel={() => {
          onResetRemove()
          setPending(null)
        }}
      />

      <RegisterResultDialog
        turmaId={turmaId}
        enrollment={resultTarget}
        visible={resultTarget !== null}
        onHide={() => setResultTarget(null)}
      />
    </>
  )
}
