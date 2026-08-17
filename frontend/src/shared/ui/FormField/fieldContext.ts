import { createContext, useContext } from 'react'

/**
 * O que o `FormField` publica ao ramo que TEM controle. `null` fora dele: um
 * wrapper usado solto — login, filtro de tabela, célula de edição — não recebe
 * nada e continua exatamente como era.
 */
export type FieldContextValue = {
  id: string
  invalid: boolean
  describedBy?: string
}

export const FieldContext = createContext<FieldContextValue | null>(null)

/**
 * Props que o wrapper deve pendurar no PRÓPRIO input.
 *
 * `idProp` existe porque a porta muda com o componente do PrimeReact: `id`
 * alcança o input do `InputText` e do `InputTextarea`, que são nativos; no
 * `Password`, no `Dropdown` e no `Calendar` o `id` cai no nó RAIZ e só `inputId`
 * chega ao input — medido em `password.cjs.js:704/713`, `dropdown.cjs.js:1577` e
 * `calendar.cjs.js:3900`. Pendurar `id` neles associaria a label a uma `<span>`,
 * que é o mesmo defeito com outra roupa.
 *
 * Isto existe porque a P-37 não é um `htmlFor` esquecido: é o `<label>` que
 * envolve rótulo E controle, somando os dois no nome acessível. Corrigir call
 * site a call site custaria 55 edições em 23 arquivos, e o próximo campo escrito
 * voltaria a errar. Aqui o acerto é o default e nenhum call site muda.
 */
export function useFieldProps(idProp: 'id' | 'inputId') {
  const field = useContext(FieldContext)
  if (!field) return {}
  return {
    [idProp]: field.id,
    'aria-invalid': field.invalid || undefined,
    'aria-describedby': field.describedBy,
  }
}
