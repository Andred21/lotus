import { useTranslation } from 'react-i18next'
import { formatDate, formatTime } from '@shared/lib'

/**
 * Um instante — data E hora juntas — em duas linhas: relógio com a hora, e
 * calendário com a data embaixo. Nasceu no item 23 por pedido do João
 * (2026-09-27) e vale só onde a tela já mostrava as duas juntas: o relógio do
 * cabeçalho e o "Último acceso" de Usuarios e Redactores. Campo só de data
 * segue com `formatDate`/`formatIsoDate` puro.
 *
 * A máscara é a de `formatTime`/`formatDate`, no idioma ativo (27-09-2026 em
 * es-CL, 27/09/2026 em pt-BR, 9/27/2026 em en, com AM/PM em en). O ano segue
 * com 4 dígitos: é o que o relógio já mostrava, e máscara nova seria uma
 * terceira grafia de data na aplicação.
 *
 * `useTranslation` é inscrição, não tradução: os formatadores leem o idioma a
 * cada render, e sem a inscrição o texto só mudaria no reload (lição D-P12 do
 * `Clock`).
 *
 * Só os ÍCONES têm cor própria, a primária do tema (`#25a5e4` nos dois). São
 * decorativos (`aria-hidden`), então os 2,8:1 sobre branco não são régua de
 * texto; sobre o navy do cabeçalho dão 5,3:1. O texto herda a cor de quem
 * posiciona — branco no cabeçalho, a da célula na tabela.
 *
 * O `{' '}` entre as linhas é para o leitor de tela, que sem ele leria
 * "14:0511-08-2026". Na grade ele não vira item: espaço em branco solto não é
 * renderizado num contêiner grid.
 */
export function Timestamp({ value }: { value: Date }) {
  const { i18n } = useTranslation()

  return (
    <time
      dateTime={value.toISOString()}
      lang={i18n.language}
      className="inline-grid grid-cols-[auto_auto] items-center gap-x-1.5 text-sm leading-tight tabular-nums"
    >
      <i className="pi pi-clock text-xs text-(--primary-color)" aria-hidden="true" />
      <span className="font-semibold">{formatTime(value)}</span>{' '}
      <i className="pi pi-calendar text-xs text-(--primary-color)" aria-hidden="true" />
      <span className="opacity-75">{formatDate(value)}</span>
    </time>
  )
}
