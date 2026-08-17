import { useTranslation } from 'react-i18next'
import { AppTag } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { DocumentValidityStatus } from '@shared/types/generated'

/**
 * `ausente` é NEUTRO, não `danger` (spec D10): o perfil não recebe idoneidade no
 * DTO e não a calcula, então pintar ausência de vermelho seria emitir veredito
 * de compliance que este contrato não fornece — ela aparece como ação pendente,
 * pelo botão de envio.
 */
const SEVERIDADE: Record<DocumentValidityStatus, 'success' | 'warning' | 'danger' | 'secondary'> = {
  vigente: 'success',
  vence_em_breve: 'warning',
  vencido: 'danger',
  ausente: 'secondary',
}

export type ProfileDocumentSlotHeaderProps = {
  tipo: string
  status: DocumentValidityStatus
  validUntil: string | null
}

/**
 * Cabeçalho do slot: o tipo documental à esquerda, status e validade à direita.
 *
 * Status e validade na MESMA linha, validade em tinta de CORPO (D-21): é o dado
 * de peso legal — por ela o redator sabe quando renovar — e saía `text-xs`
 * secundária na última linha do slot, abaixo da nota administrativa, enquanto o
 * status que o backend deriva A PARTIR dela era a pílula do topo. O ruído era
 * real: três dos quatro slots têm `valid_until` nulo e imprimiam "Sin fecha de
 * vencimiento" — linha que só diz que não há informação. Ela deixou de ser
 * renderizada.
 *
 * Extraído do `ProfileDocumentSlot` porque ele bateu nas 150 linhas pela SEGUNDA
 * vez no mesmo bloco, e a régua manda extrair o bloco coeso, não comprimir prosa
 * de novo (`.claude/rules/frontend-fsliced.md`). Movimento literal: o nó
 * devolvido é o mesmo `div` que estava lá, então o `mt-2` do irmão abaixo
 * continua medindo contra a mesma borda.
 */
export function ProfileDocumentSlotHeader({
  tipo,
  status,
  validUntil,
}: ProfileDocumentSlotHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-medium">{tipo}</p>
      <div className="flex flex-wrap items-center gap-2">
        <AppTag value={t(`profile.docStatus.${status}`)} severity={SEVERIDADE[status]} />
        {validUntil && (
          <span className="font-mono text-sm" style={{ color: 'var(--text-color)' }}>
            {t('profile.documents.validUntil', {
              // `valid_until` vem só-data (`YYYY-MM-DD`) e `new Date` a lê como
              // meia-noite UTC: num fuso a oeste ela VOLTA um dia. `T00:00:00`
              // ancora no fuso local; o `formatDate` resolve o idioma ativo —
              // sem ele o `Intl` cai no do navegador (UI-01).
              date: formatDate(new Date(`${validUntil}T00:00:00`)),
            })}
          </span>
        )}
      </div>
    </div>
  )
}
