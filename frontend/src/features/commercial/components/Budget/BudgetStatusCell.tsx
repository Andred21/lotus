import { useTranslation } from 'react-i18next'
import { AppTag } from '@shared/ui'
import type { BudgetData } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { turmaTag, turmaTagSeverity } from '../../lib/turmaTag'

/** Célula de status do orçamento: a tag de status e, abaixo, uma tag da turma
 * por cotação aprovada, com o código dela. A coluna `tag` é estreita a 1024px,
 * então cada tag fica no próprio bloco e o texto longo quebra dentro dela em
 * vez de empurrar a coluna. */
export function BudgetStatusCell({ budget }: { budget: BudgetData }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-start gap-1">
      {budget.status && (
        <AppTag value={t(`quoteStatus.${budget.status}`)} severity={quoteStatusSeverity(budget.status)} />
      )}
      {budget.quotes.map((q) => {
        const tag = turmaTag(q)

        return tag && (
          <AppTag
            key={q.id}
            value={`${q.code} · ${t(`quote.turmaTag.${tag}`)}`}
            severity={turmaTagSeverity(tag)}
            className="max-w-full whitespace-normal text-left"
          />
        )
      })}
    </div>
  )
}
