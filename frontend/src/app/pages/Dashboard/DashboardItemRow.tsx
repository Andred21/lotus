import { Link } from 'react-router-dom'
import { AppTag } from '@shared/ui'
import { formatIsoDate } from '@shared/lib'
import type { DashboardSeverity } from '@shared/types/generated'

/** D15: a escala do contrato mapeia para a severidade do `AppTag` que já existe.
 * Sem componente novo em `shared/ui` — um átomo promovido sem segundo consumidor
 * medido é especulação.
 *
 * NÃO exportado de propósito: o único consumidor é a linha logo abaixo. O
 * `export` custava um `eslint-disable` de `react-refresh/only-export-components`
 * e o precedente do `AppToast` não o cobria — lá o `useToast` é consumido por
 * features de fora (Q-2, review de 2026-08-16). */
function severityTagProps(severity: DashboardSeverity): { severity: 'danger' | 'warning' | 'info' } {
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
      <AppTag value={tagLabel} {...severityTagProps(severity)} className="order-1 sm:order-0" />
      {/* `basis-full` abaixo de `sm` para o rótulo receber a linha inteira: com
        * tudo numa linha só, os elementos `shrink-0` (tag, data, chevron) somam
        * mais que a metade dos 295px úteis do mobile e o rótulo colapsava a
        * ~33px de 154–201px necessários (UI-01 da revisão de 2026-08-16). O
        * `title` recupera o texto no hover onde a faixa 1024–1279 ainda trunca —
        * o do link é "Abrir", e o mais interno é o que vence. */}
      <span className="order-3 min-w-0 basis-full sm:order-0 sm:flex-1 sm:basis-0">
        <span className="block truncate text-sm font-medium" title={label}>
          {label}
        </span>
        <span className="block truncate text-xs" title={detail} style={{ color: 'var(--text-color-secondary)' }}>
          {detail}
        </span>
      </span>
      {date && (
        <span
          className="order-2 ml-auto shrink-0 font-mono text-xs sm:order-0 sm:ml-0"
          style={{ color: 'var(--text-color-secondary)' }}
        >
          {formatIsoDate(date)}
        </span>
      )}
    </>
  )

  // A borda mora SÓ no <li> e o layout SÓ no filho. Pôr `border-b` no <li> e
  // `border-b-0` no <a> pareceria resolver e não resolve: com duas utilities da
  // mesma propriedade, quem vence é a ordem no CSS gerado, não a ordem na
  // string de classes.
  const layout = 'flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:flex-nowrap'

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
          <i className="pi pi-angle-right order-2 shrink-0 sm:order-0" aria-hidden="true" />
        </Link>
      )}
    </li>
  )
}
