import { useTranslation } from 'react-i18next'
import { technicalDataClass } from '@shared/ui'

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
export function IntervaloDeDatas({ start, end }: { start: string; end: string }) {
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
