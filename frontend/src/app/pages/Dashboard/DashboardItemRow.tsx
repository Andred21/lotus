import { Link } from 'react-router-dom'
import { AppTag } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { DashboardSeverity } from '@shared/types/generated'

/** D15: a escala do contrato mapeia para a severidade do `AppTag` que já existe.
 * Sem componente novo em `shared/ui` — um átomo promovido sem segundo consumidor
 * medido é especulação. */
// eslint-disable-next-line react-refresh/only-export-components -- helper puro do mesmo módulo da linha (sem estado próprio para justificar arquivo à parte)
export function severityTagProps(severity: DashboardSeverity): { severity: 'danger' | 'warning' | 'info' } {
  if (severity === 'high') return { severity: 'danger' }
  if (severity === 'medium') return { severity: 'warning' }
  return { severity: 'info' }
}

export interface DashboardItemRowProps {
  /** Texto do tag. Pendência mostra o módulo; alerta mostra a severidade. */
  tagLabel: string
  severity: DashboardSeverity
  /** Rótulo do tipo, traduzido (D17). */
  label: string
  /** Frase do backend, em es-CL (D17). */
  detail: string
  /** Data ISO (`YYYY-MM-DD`) ou null. */
  date: string | null
  /** Rota do módulo dono, ou `null` para item sem link. */
  to: string | null
  openLabel: string
}

export function DashboardItemRow({
  tagLabel,
  severity,
  label,
  detail,
  date,
  to,
  openLabel,
}: DashboardItemRowProps) {
  const corpo = (
    <>
      <AppTag value={tagLabel} {...severityTagProps(severity)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {detail}
        </span>
      </span>
      {date && (
        // Ancorado ao meio-dia: `new Date('2026-03-01')` é lido como UTC e, num
        // fuso a oeste, volta um dia — a data exibida trocaria na virada. Mesma
        // razão do `formatMonthYear` em shared/lib/datetime.ts.
        <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {formatDate(new Date(`${date}T12:00:00`))}
        </span>
      )}
    </>
  )

  // A borda mora SÓ no <li> e o layout SÓ no filho. Pôr `border-b` no <li> e
  // `border-b-0` no <a> pareceria resolver e não resolve: com duas utilities da
  // mesma propriedade, quem vence é a ordem no CSS gerado, não a ordem na
  // string de classes.
  const layout = 'flex items-center gap-3 px-4 py-3'

  return (
    <li className="border-b last:border-b-0" style={{ borderColor: 'var(--surface-border)' }}>
      {/* Item sem link não vira link inerte: `navigation` sem a chave esperada
        * significa que não há para onde ir, e um link que só falha depois do
        * clique é pior que link nenhum. */}
      {to === null ? (
        <div className={layout}>{corpo}</div>
      ) : (
        <Link
          to={to}
          title={openLabel}
          className={`${layout} no-underline hover:bg-(--surface-section)`}
          style={{ color: 'var(--text-color)' }}
        >
          {corpo}
          <i className="pi pi-angle-right shrink-0" aria-hidden="true" />
        </Link>
      )}
    </li>
  )
}
