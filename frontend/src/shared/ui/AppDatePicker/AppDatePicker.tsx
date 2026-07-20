import { Calendar } from 'primereact/calendar'
import type { CalendarProps } from 'primereact/calendar'

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
export function AppDatePicker({ value, onChange, ...rest }: AppDatePickerProps) {
  return (
    <Calendar
      value={isoToDate(value)}
      onChange={(e) => onChange(dateToIso(e.value as Date | null))}
      dateFormat="dd/mm/yy"
      locale="es"
      showIcon
      className="w-full"
      {...rest}
    />
  )
}
