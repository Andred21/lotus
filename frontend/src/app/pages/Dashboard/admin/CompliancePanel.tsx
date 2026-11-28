import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AppCard,
  AppCardHeader,
  AppDataTable,
  AppColumn,
  AppEmptyState,
  AppTag,
  narrowFloorTablePt,
  wrappingHeaderTablePt,
} from '@shared/ui'
import { formatIsoDate, turmaDocumentTypeList, turmaRequirementList } from '@shared/lib'
import type { TurmaComplianceData } from '@shared/types/generated'
import { infoText } from '@shared/styles/tokens'
import { IntervaloDeDatas } from './IntervaloDeDatas'
import { complianceWidths } from './panelColumns'

/**
 * O que falta para a turma concluir: documentos, depois requisitos de
 * configuração (redator, local). Vazio quando os dois estão vazios — sem os
 * requisitos a coluna dizia "—" para uma turma que não podia concluir.
 */
function faltante(r: TurmaComplianceData, t: (key: string) => string): string {
  return [turmaDocumentTypeList(r.missing_types, t), turmaRequirementList(r.missing_requirements, t)]
    .filter((parte) => parte !== '')
    .join(', ')
}

/**
 * A coluna "Faltan": o que BLOQUEIA e, abaixo, o aviso das evaluaciones opcionais
 * (bloco 60) em tom informativo — o aviso não impede concluir e não é pendência.
 * O `—` só aparece quando não há bloqueante nem aviso: uma turma concluída que
 * só tem aviso não pode mostrar "—" como se estivesse completa.
 */
function CelulaFaltan({ r }: { r: TurmaComplianceData }) {
  const { t } = useTranslation()
  const bloqueante = faltante(r, t)
  const aviso = turmaDocumentTypeList(r.missing_optional_types, t)

  if (bloqueante === '' && aviso === '') return <span>—</span>

  return (
    <>
      {bloqueante !== '' && <span className="wrap-break-word">{bloqueante}</span>}
      {aviso !== '' && (
        <span className="block wrap-break-word text-xs" style={{ color: infoText }}>
          {t('dashboard.compliance.warning', { types: aviso })}
        </span>
      )}
    </>
  )
}

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
      <AppCardHeader title={t('dashboard.compliance.title')} count={turmas.length} level={3} />
      <AppDataTable
        value={turmas}
        dataKey="turma_id"
        // Piso de 45rem abaixo de `sm`: 390x844 repete a geometria de 1024 (tabela de
        // 718px), onde a soma dos mínimos medidos cabe (`panelColumns.ts`).
        pt={{ ...narrowFloorTablePt('45rem'), ...wrappingHeaderTablePt }}
        emptyMessage={<AppEmptyState icon="certificate" title={t('dashboard.compliance.empty')} />}
        footerCount={t('dashboard.compliance.count', { count: turmas.length })}
      >
        <AppColumn
          field="course_name"
          header={t('dashboard.compliance.course')}
          style={largura.course}
          sortable
          body={(r: TurmaComplianceData) => (
            <>
              <Link to={`/operacion/turmas/${r.turma_id}`} className="no-underline hover:underline focus-visible:underline wrap-break-word" style={{ color: 'var(--brand-ink)' }}>
                {r.course_name}
              </Link>
              {r.concluded && (
                <span className="block pt-1">
                  <AppTag value={t('dashboard.compliance.concluded')} severity="secondary" />
                </span>
              )}
            </>
          )}
        />
        <AppColumn
          header={t('dashboard.compliance.redatores')}
          style={largura.redatores}
          body={(r: TurmaComplianceData) =>
            r.redatores.length === 0 ? (
              <span style={{ color: 'var(--text-color-secondary)' }}>{t('dashboard.compliance.noRedator')}</span>
            ) : (
              <span className="wrap-break-word">{r.redatores.join(', ')}</span>
            )
          }
        />
        <AppColumn
          header={t('dashboard.compliance.range')}
          style={largura.range}
          body={(r: TurmaComplianceData) => (
            <IntervaloDeDatas start={formatIsoDate(r.start_date)} end={formatIsoDate(r.end_date)} />
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
          body={(r: TurmaComplianceData) => <CelulaFaltan r={r} />}
        />
        <AppColumn
          header={t('dashboard.compliance.enabled')}
          style={largura.enabled}
          sortable
          field="habilitada"
          // Concluída não é "não habilitada": `isHabilitada()` exige turma em andamento (bloco 60).
          body={(r: TurmaComplianceData) => (
            <AppTag
              value={r.concluded ? t('dashboard.compliance.concluded') : r.habilitada ? t('common.yes') : t('common.no')}
              severity={r.concluded ? 'secondary' : r.habilitada ? 'success' : 'warning'}
            />
          )}
        />
      </AppDataTable>
    </AppCard>
  )
}
