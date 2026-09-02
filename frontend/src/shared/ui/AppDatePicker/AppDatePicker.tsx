import { Calendar } from 'primereact/calendar'
import type { CalendarProps } from 'primereact/calendar'
import { useTranslation } from 'react-i18next'
import { mergePt } from '../mergePt'
import { useFieldBind, useSplitFieldProps } from '../FormField/fieldContext'

export type AppDatePickerProps = Omit<CalendarProps, 'value' | 'onChange' | 'ref'> & {
  /** Data em ISO `YYYY-MM-DD` (o formato que o backend espera). `null` = vazio.
   * Opcionais desde o item 24: dentro de um `Field` o valor e o setter vêm do
   * form pelo `FieldContext`, e o call site não repete nenhum dos dois. Fora
   * dele continuam obrigatórios na prática — sem os dois o campo fica vazio e
   * inerte, que é o mesmo que o wrapper solto sempre fez. */
  value?: string | null
  onChange?: (value: string | null) => void
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

/**
 * Gramática de data por idioma: a MESMA que o `Intl` já produz no resto da tela
 * (`shared/lib/datetime.ts`), escrita no vocabulário do Prime — `yy` é ano de
 * quatro dígitos e `m`/`d` são o número sem zero à esquerda.
 *
 * Fixar `dd/mm/yy` punha duas gramáticas de data na mesma tela: o filtro do
 * Dashboard escrevia `22/08/2025` ao lado de pendências em `7/6/2026`, e
 * `22/08` pode ser lido como 8 de fevereiro por quem acabou de ler a linha de
 * cima. Em módulo com peso legal, data ambígua é o pior tipo de ambiguidade
 * (UI-02 da revisão de 2026-08-22).
 *
 * `locale` é a chave registrada em `registerPrimeLocales` — `en` é o embutido do
 * Prime. Idioma fora do mapa cai no default do produto, como o `fallbackLng` do
 * i18n.
 */
const GRAMATICA: Record<string, { locale: string; dateFormat: string }> = {
  'es-CL': { locale: 'es', dateFormat: 'dd-mm-yy' },
  'pt-BR': { locale: 'pt', dateFormat: 'dd/mm/yy' },
  en: { locale: 'en', dateFormat: 'm/d/yy' },
}

const PADRAO = GRAMATICA['es-CL']

/** Wrapper do Calendar. String ISO in/out para não passar dinheiro-de-tempo por
 * conversão de fuso perigosa. Cores vêm do tema (ADR-16). Sem forwardRef: o
 * Calendar do Prime é class component (categoria AppDropdown). */
export function AppDatePicker({ value: valueProp, onChange: onChangeProp, pt, ...rest }: AppDatePickerProps) {
  // `useTranslation` só pelo `i18n`: o wrapper não tem texto próprio, mas
  // precisa RE-RENDERIZAR na troca de idioma — ler `i18n.language` de um import
  // solto deixaria o calendário no idioma anterior até a próxima mudança de
  // estado do dono da tela.
  const { i18n } = useTranslation()
  const gramatica = GRAMATICA[i18n.language] ?? PADRAO

  // `inputId`: no Calendar o `id` cai no nó raiz e só `inputId` alcança o input
  // focável (`calendar.cjs.js:3900`).
  //
  // O erro vai pelo `pt` do input, e não junto do `inputId`: o Calendar despeja
  // toda prop que não conhece no `<span.p-calendar>` raiz, então `aria-invalid`
  // e `aria-describedby` pousavam na casca e não chegavam ao `combobox` que o
  // leitor de tela anuncia. Ver `useSplitFieldProps`.
  const field = useSplitFieldProps('inputId')
  // O bind entra na FRONTEIRA do wrapper, antes da conversão ISO ↔ `Date`: o
  // que trafega aqui é `string | null`, que é o que o form guarda. `null` passa
  // direto — é campo vazio, não texto nulo.
  const bind = useFieldBind((v: string | null) => v)
  const value = valueProp ?? (bind.value as string | null) ?? null
  const onChange = onChangeProp ?? (bind.onChange as ((v: string | null) => void) | undefined)
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
      onChange={(e) => onChange?.(dateToIso(e.value as Date | null))}
      dateFormat={gramatica.dateFormat}
      locale={gramatica.locale}
      showIcon
      className="w-full"
      {...field.control}
      {...rest}
      pt={calendarPt}
    />
  )
}
