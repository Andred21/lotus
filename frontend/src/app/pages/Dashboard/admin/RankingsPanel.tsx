import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppDropdown, AppEmptyState, AppBarChart } from '@shared/ui'
import type { BarDatum } from '@shared/ui'
import { formatUf } from '@shared/lib'
import type { RankingRowData, RankingsData } from '@shared/types/generated'

type Metrica = 'turmas' | 'matriculas' | 'certificados' | 'uf_aprovada'

const METRICAS: Metrica[] = ['turmas', 'matriculas', 'certificados', 'uf_aprovada']

/**
 * A UF só entra na lista quando ALGUMA linha a traz.
 *
 * `uf_aprovada` é `null` em toda linha exatamente quando o gate comercial está
 * fechado — `rankingRows` a preenche com `'0.0000'` sempre que `includeUf` é
 * verdadeiro (`AnalyticsQuery.php:319`), e `includeUf` é `$canCommercial`
 * (`AdminDashboardAssembler.php:204`). Ofertar a métrica mesmo assim devolvia
 * "sin datos en el período" ao escolhê-la: "não pode ler" renderizado como "não
 * há", que é o zero que mente da D7. O `SeriesPanel` já esconde a série de UF
 * pelo mesmo gate, e as duas ausências têm de falar a mesma língua na mesma
 * seção (Q-2 da revisão de 2026-08-17).
 */
function metricasDisponiveis(rankings: RankingsData): Metrica[] {
  const temUf = [...rankings.courses, ...rankings.clients].some((l) => l.uf_aprovada !== null)

  return temUf ? METRICAS : METRICAS.filter((m) => m !== 'uf_aprovada')
}

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
  // O MESMO rótulo do seletor, e é o ponto: o card diz qual grandeza está
  // desenhando com as palavras que o usuário escolheu no controle acima, que é o
  // que sobrevive ao scroll, ao print e à volta para a tela.
  const rotuloMetrica = t(`dashboard.rankings.metric.${metrica}`)

  return (
    <AppCard>
      <AppCardHeader title={titulo} count={dados.length} subtitle={rotuloMetrica} />
      {dados.length === 0 ? (
        <AppEmptyState icon="pi pi-chart-bar" title={t('dashboard.rankings.empty')} />
      ) : (
        <div className="px-2 pb-2">
          <AppBarChart
            data={dados}
            // O nome acessível do gráfico carrega as DUAS coisas — que ranking é
            // e sobre qual grandeza —, porque para quem ouve não há eixo nem
            // cabeçalho ao lado.
            ariaLabel={`${titulo} — ${rotuloMetrica}`}
            valueLabel={rotuloMetrica}
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

  // `turmas` é o valor inicial e nunca sai da lista — só a UF pode sumir —,
  // então não há estado apontando para opção inexistente a reconciliar.
  const opcoes = metricasDisponiveis(rankings).map((m) => ({
    value: m,
    label: t(`dashboard.rankings.metric.${m}`),
  }))

  return (
    <div className="space-y-3">
      {/* Sem `AppCardToolbar`: o toolbar carrega o `px-4` do card, e este seletor
        * não está dentro de card nenhum — ele comanda os DOIS cards abaixo. Com o
        * recuo, ele partia de x=296 enquanto o seletor de período, irmão dele na
        * mesma seção, partia de x=280, junto com as `section` e todos os cards
        * (UI-03 da revisão de 2026-08-17). A largura é a mesma do outro seletor:
        * 14rem. */}
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
      <div className="grid gap-4 xl:grid-cols-2">
        <Ranking titulo={t('dashboard.rankings.courses')} linhas={rankings.courses} metrica={metrica} inkIndex={0} />
        <Ranking titulo={t('dashboard.rankings.clients')} linhas={rankings.clients} metrica={metrica} inkIndex={2} />
      </div>
    </div>
  )
}
