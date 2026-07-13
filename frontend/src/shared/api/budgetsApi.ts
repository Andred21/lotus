import { createCrudResource } from './createCrudResource'
import type { BudgetData } from '@shared/types/generated'

/** Cliente REST do recurso `budgets`. Como `BudgetData` já embute `quotes[]` e
 * `files[]` (o backend eager-loada os dois), esta é a ÚNICA leitura do módulo:
 * lista e detalhe descem daqui, e toda mutação de cotação/anexo invalida
 * `keys.all` para repintar totais e status agregado de uma vez. */
export const budgetsApi = createCrudResource<BudgetData>('budgets')
