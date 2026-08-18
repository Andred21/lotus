import { Calendar } from 'primereact/calendar'
import type { CalendarProps } from 'primereact/calendar'
import { mergePt } from '../mergePt'
import { useSplitFieldProps } from '../FormField/fieldContext'

export type AppDatePickerProps = Omit<CalendarProps, 'value' | 'onChange' | 'ref'> & {
  /** Data em ISO `YYYY-MM-DD` (o formato que o backend espera). `null` = vazio. */
  value: string | null
  onChange: (value: string | null) => void
}

// `YYYY-MM-DD` → Date à meia-noite LOCAL. Nunca `new Date('YYYY-MM-DD')`, que
// parseia como UTC e recua um dia em fuso negativo (Chile é UTC-3/-4).
function isoToDate(iso: string | null): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// Date → `YYYY-MM-DD` pelos componentes LOCAIS (mesma razão anti-fuso).
function dateToIso(date: Date | null | undefined): string | null {
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Wrapper do Calendar. String ISO in/out para não passar dinheiro-de-tempo por
 * conversão de fuso perigosa. Cores vêm do tema (ADR-16). Sem forwardRef: o
 * Calendar do Prime é class component (categoria AppDropdown). */
export function AppDatePicker({ value, onChange, pt, ...rest }: AppDatePickerProps) {
  // `inputId`: no Calendar o `id` cai no nó raiz e só `inputId` alcança o input
  // focável (`calendar.cjs.js:3900`).
  //
  // O erro vai pelo `pt` do input, e não junto do `inputId`: o Calendar despeja
  // toda prop que não conhece no `<span.p-calendar>` raiz, então `aria-invalid`
  // e `aria-describedby` pousavam na casca e não chegavam ao `combobox` que o
  // leitor de tela anuncia. Ver `useSplitFieldProps`.
  const field = useSplitFieldProps('inputId')
  // `input.root`, com o salto do meio: o `input` do Calendar é um COMPONENTE
  // (InputText), então `ptm('input')` vira o `pt` dele e é o `root` de lá que
  // chega ao `<input>` — mesma forma do `iconField.root` do `AppPassword`. Sem
  // o `.root` o objeto viaja e não pousa em nó nenhum, em silêncio.
  //
  // Chamador por último, como o spread de props abaixo: o contexto é default, a
  // prop do call site vence.
  const calendarPt = mergePt<CalendarProps['pt']>({ input: { root: field.input } }, pt)

  return (
    <Calendar
      value={isoToDate(value)}
      onChange={(e) => onChange(dateToIso(e.value as Date | null))}
      dateFormat="dd/mm/yy"
      locale="es"
      showIcon
      className="w-full"
      {...field.control}
      {...rest}
      pt={calendarPt}
    />
  )
}
