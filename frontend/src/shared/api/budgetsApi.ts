import { createCrudResource } from './createCrudResource'
import type { ArchivedBudgetData, BudgetData } from '@shared/types/generated'

/** Cliente REST do recurso `budgets`. Como `BudgetData` já embute `quotes[]` e
 * `files[]` (o backend eager-loada os dois), esta é a ÚNICA leitura do módulo:
 * lista e detalhe descem daqui, e toda mutação de cotação/anexo invalida
 * `keys.all` para repintar totais e status agregado de uma vez.
 *
 * O segundo genérico é o que faz `useArchivedList`/`useRestore` falarem o DTO
 * composto de arquivados. A fábrica já expunha os dois hooks; o que faltava era
 * o tipo (spec D12). */
export const budgetsApi = createCrudResource<BudgetData, ArchivedBudgetData>('budgets')
