import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppDataTable, AppColumn, AppEmptyState, AppTag } from '@shared/ui'
import { formatIsoDate, turmaDocumentTypeList } from '@shared/lib'
import type { TurmaComplianceData } from '@shared/types/generated'
import { complianceWidths } from './panelColumns'

/**
 * Compliance documental das turmas. Tabela de verdade e não lista compacta
 * (D9): são 8 campos por linha, e em linha compacta metade trunca.
 *
 * `AppDataTable` sem `SearchableTableFrame`: dashboard é visão, busca é do
 * módulo dono. O wrapper já resolve vazio, ordenação e o rodapé de contagem — e
 * reescrever esse rodapé à mão rendeu, em 6 cópias, paginador duplicado e
 * vazio falso.
 *
 * A janela histórica NÃO alcança esta seção: compliance é estado ATUAL (D3 do
 * bloco A), e é por isso que ela mora fora da seção de análise.
 */
export function CompliancePanel({ turmas }: { turmas: TurmaComplianceData[] }) {
  const { t } = useTranslation()
  const largura = complianceWidths()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.compliance.title')} count={turmas.length} />
      <AppDataTable
        value={turmas}
        dataKey="turma_id"
        emptyMessage={<AppEmptyState icon="pi pi-verified" title={t('dashboard.compliance.empty')} />}
        footerCount={t('dashboard.compliance.count', { count: turmas.length })}
      >
        <AppColumn
          field="course_name"
          header={t('dashboard.compliance.course')}
          style={largura.course}
          sortable
          body={(r: TurmaComplianceData) => (
            <Link to={`/operacion/turmas/${r.turma_id}`} className="no-underline" style={{ color: 'var(--text-color)' }}>
              {r.course_name}
            </Link>
          )}
        />
        <AppColumn
          header={t('dashboard.compliance.redatores')}
          style={largura.redatores}
          body={(r: TurmaComplianceData) =>
            r.redatores.length === 0 ? (
              <span style={{ color: 'var(--text-color-secondary)' }}>{t('dashboard.compliance.noRedator')}</span>
            ) : (
              r.redatores.join(', ')
            )
          }
        />
        <AppColumn
          header={t('dashboard.compliance.range')}
          style={largura.range}
          body={(r: TurmaComplianceData) => (
            // O intervalo empurra a rolagem em vez de se despedaçar: comprimida
            // até 1024, a coluna quebrava UMA data em quatro linhas
            // ("06-07- / 2026 — / 31-07- / 2026"), que é o formato de data
            // deixando de ser legível como data (UI-10 da revisão de
            // 2026-08-17).
            <span className="font-mono text-xs whitespace-nowrap">
              {t('dashboard.agenda.range', {
                start: formatIsoDate(r.start_date),
                end: formatIsoDate(r.end_date),
              })}
            </span>
          )}
        />
        <AppColumn header={t('dashboard.compliance.present')} style={largura.present} body={(r: TurmaComplianceData) => r.present_types.length} />
        <AppColumn
          header={t('dashboard.compliance.missing')}
          style={largura.missing}
          // O código do enum não vai à tela: `EVALUACION_REDATOR` é identificador
          // de banco, e o mesmo dado já aparece traduzido no módulo de Operação,
          // pelas mesmas chaves (UI-07 da revisão de 2026-08-22). A frase da
          // PENDÊNCIA continua vindo pronta do backend (D17) — a correção é desta
          // coluna, que é montada aqui. O rótulo vem do mapa de `shared/lib`, que
          // é o que reprova tipo novo sem tradução (Q-4 do review de 2026-08-24).
          body={(r: TurmaComplianceData) =>
            r.missing_types.length === 0 ? '—' : turmaDocumentTypeList(r.missing_types, t)
          }
        />
        <AppColumn
          header={t('dashboard.compliance.enabled')}
          style={largura.enabled}
          sortable
          field="habilitada"
          body={(r: TurmaComplianceData) => (
            <AppTag
              value={r.habilitada ? t('common.yes') : t('common.no')}
              severity={r.habilitada ? 'success' : 'warning'}
            />
          )}
        />
      </AppDataTable>
    </AppCard>
  )
}
