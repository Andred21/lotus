export type ChartDataColumn = { key: string; label: string }

export type ChartDataTableProps = {
  /** Nome acessível da tabela, e portanto do gráfico que ela acompanha. */
  caption: string
  columns: ChartDataColumn[]
  rows: Record<string, string | number>[]
}

/**
 * Os mesmos dados do gráfico, em tabela, só para quem não enxerga o desenho.
 *
 * O SVG do Recharts não diz nada a um leitor de tela: `role="img"` com um
 * rótulo só dava o NOME do gráfico e escondia os valores. Os wrappers marcam o
 * desenho `aria-hidden` e põem esta tabela ao lado; o `caption` é o nome, a
 * primeira coluna é o cabeçalho de linha (o mês, o curso) e o resto são os
 * valores, já formatados pelo chamador.
 */
export function ChartDataTable({ caption, columns, rows }: ChartDataTableProps) {
  const [rotulo, ...valores] = columns

  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((linha, i) => (
          <tr key={`${linha[rotulo.key]}-${i}`}>
            <th scope="row">{linha[rotulo.key]}</th>
            {valores.map((c) => (
              <td key={c.key}>{linha[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
