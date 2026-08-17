import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppCardToolbar, AppDropdown, AppEmptyState, AppBarChart } from '@shared/ui'
import type { BarDatum } from '@shared/ui'
import { formatUf } from '@shared/lib'
import type { RankingRowData, RankingsData } from '@shared/types/generated'

type Metrica = 'turmas' | 'matriculas' | 'certificados' | 'uf_aprovada'

const METRICAS: Metrica[] = ['turmas', 'matriculas', 'certificados', 'uf_aprovada']

/** Uma métrica por vez, e não 4 barras agrupadas: `uf_aprovada` é decimal em UF
 * e as outras três são contagem — no mesmo eixo, uma achata a outra. Mesma
 * razão que separou os dois gráficos de série. */
function valor(linha: RankingRowData, metrica: Metrica): number {
  // `uf_aprovada` é `string | null` (`generated.ts:352-359`): `null` é o gate
  // comercial fechado, e vira ausência — a linha some do gráfico, não vira 0.
  if (metrica === 'uf_aprovada') return linha.uf_aprovada === null ? NaN : Number(linha.uf_aprovada)
  return linha[metrica]
}

function barras(linhas: RankingRowData[], metrica: Metrica): BarDatum[] {
  return linhas
    .map((l) => ({ label: l.name, value: valor(l, metrica) }))
    .filter((b) => !Number.isNaN(b.value))
    .sort((a, b) => b.value - a.value)
}

function Ranking({
  titulo,
  linhas,
  metrica,
  inkIndex,
}: {
  titulo: string
  linhas: RankingRowData[]
  metrica: Metrica
  inkIndex: number
}) {
  const { t } = useTranslation()
  const dados = barras(linhas, metrica)

  return (
    <AppCard>
      <AppCardHeader title={titulo} count={dados.length} />
      {dados.length === 0 ? (
        <AppEmptyState icon="pi pi-chart-bar" title={t('dashboard.rankings.empty')} />
      ) : (
        <div className="px-2 pb-2">
          <AppBarChart
            data={dados}
            ariaLabel={titulo}
            inkIndex={inkIndex}
            formatValue={metrica === 'uf_aprovada' ? (v) => formatUf(v.toFixed(4)) : undefined}
          />
        </div>
      )}
    </AppCard>
  )
}

/**
 * Os dois rankings, cursos e clientes, sobre a mesma métrica escolhida. Ambos
 * respeitam a janela histórica (D3 do bloco A) e por isso vivem na seção de
 * análise, junto do seletor.
 *
 * A métrica mora em `useState` local: não cruza fronteira nenhuma — nem para a
 * página, que já tem a janela, nem para o servidor, que manda as 4 grandezas
 * de uma vez.
 */
export function RankingsPanel({ rankings }: { rankings: RankingsData }) {
  const { t } = useTranslation()
  const [metrica, setMetrica] = useState<Metrica>('turmas')

  const opcoes = METRICAS.map((m) => ({ value: m, label: t(`dashboard.rankings.metric.${m}`) }))

  return (
    <div className="space-y-3">
      <AppCardToolbar
        start={
          <div className="w-full sm:w-56">
            <AppDropdown
              value={metrica}
              options={opcoes}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setMetrica(e.value as Metrica)}
              aria-label={t('dashboard.rankings.metric.label')}
            />
          </div>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Ranking titulo={t('dashboard.rankings.courses')} linhas={rankings.courses} metrica={metrica} inkIndex={0} />
        <Ranking titulo={t('dashboard.rankings.clients')} linhas={rankings.clients} metrica={metrica} inkIndex={2} />
      </div>
    </div>
  )
}
