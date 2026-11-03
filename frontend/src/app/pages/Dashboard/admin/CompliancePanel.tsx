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
  technicalDataClass,
  wrappingHeaderTablePt,
} from '@shared/ui'
import { formatIsoDate, turmaDocumentTypeList, turmaRequirementList } from '@shared/lib'
import type { TurmaComplianceData } from '@shared/types/generated'
import { complianceWidths } from './panelColumns'

/**
 * O que falta para a turma concluir: documentos, depois requisitos de
 * configuração (redator, local). `—` só quando os dois estão vazios — sem os
 * requisitos a coluna dizia "—" para uma turma que não podia concluir.
 */
function faltante(r: TurmaComplianceData, t: (key: string) => string): string {
  const partes = [
    turmaDocumentTypeList(r.missing_types, t),
    turmaRequirementList(r.missing_requirements, t),
  ].filter((parte) => parte !== '')

  return partes.length === 0 ? '—' : partes.join(', ')
}

/** Marcadores das duas datas na tradução do intervalo: uso privado do Unicode, que
 * nenhum locale escreve. */
const MARCA_DATA = { start: '\uE000', end: '\uE001' } as const

/**
 * O intervalo "início — fim" com cada data inteira (D-73 do bloco 54).
 *
 * Inteiro em `whitespace-nowrap`, ele media 182px numa coluna de 103px e cobria o
 * contador vizinho; solto, a coluna partia UMA data em quatro linhas ("06-07- /
 * 2026 — / 31-07- / 2026", UI-10 de 2026-08-17). O meio-termo é quebrar só ENTRE
 * as datas. As datas entram na tradução como marcadores e voltam como nós, para a
 * ordem e o separador seguirem vindo do locale.
 */
function IntervaloDeDatas({ start, end }: { start: string; end: string }) {
  const { t } = useTranslation()
  const datas: Record<string, string> = { [MARCA_DATA.start]: start, [MARCA_DATA.end]: end }

  return (
    <span className={`${technicalDataClass} text-xs`}>
      {t('dashboard.agenda.range', MARCA_DATA)
        .split(new RegExp(`(${MARCA_DATA.start}|${MARCA_DATA.end})`))
        .map((parte, i) =>
          datas[parte] === undefined ? (
            parte
          ) : (
            <span key={i} className="whitespace-nowrap">
              {datas[parte]}
            </span>
          ),
        )}
    </span>
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
      <AppCardHeader title={t('dashboard.compliance.title')} count={turmas.length} />
      <AppDataTable
        value={turmas}
        dataKey="turma_id"
        // Piso de 45rem abaixo de `sm`: 390x844 repete a geometria de 1024 (tabela de
        // 718px), onde a soma dos mínimos medidos cabe (`panelColumns.ts`).
        pt={{ ...narrowFloorTablePt('45rem'), ...wrappingHeaderTablePt }}
        emptyMessage={<AppEmptyState icon="pi pi-verified" title={t('dashboard.compliance.empty')} />}
        footerCount={t('dashboard.compliance.count', { count: turmas.length })}
      >
        <AppColumn
          field="course_name"
          header={t('dashboard.compliance.course')}
          style={largura.course}
          sortable
          body={(r: TurmaComplianceData) => (
            <Link to={`/operacion/turmas/${r.turma_id}`} className="no-underline wrap-break-word" style={{ color: 'var(--text-color)' }}>
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
          body={(r: TurmaComplianceData) => <span className="wrap-break-word">{faltante(r, t)}</span>}
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
