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
function ariaProps(field: FieldContextValue) {
  return {
    'aria-invalid': field.invalid || undefined,
    'aria-describedby': field.describedBy,
  }
}

/**
 * `invalid` é a única porta para `.p-invalid` no PrimeReact, e é prop do
 * COMPONENTE — no Calendar ela não viaja pelo `pt.input`, viaja com o
 * `inputId`. Sem ela a invalidez existia só para o leitor de tela (f4 UI-02,
 * run de 2026-08-28). `undefined` e não `false` para a prop do chamador
 * continuar vencendo pelo spread.
 */
function invalidProp(field: FieldContextValue) {
  return { invalid: field.invalid || undefined }
}

export function useFieldProps(idProp: 'id' | 'inputId') {
  const field = useContext(FieldContext)
  if (!field) return {}
  return { [idProp]: field.id, ...invalidProp(field), ...ariaProps(field) }
}

/**
 * As duas metades SEPARADAS, para o wrapper cujo componente do Prime não
 * encaminha `aria-*` ao input.
 *
 * A P-37 tem duas pontas — o `id` do rótulo e o erro —, e a porta do erro não é
 * a mesma do `id`. O Dropdown pesca `aria-*` do resto das props e as põe no
 * input focável (`reduceKeys(otherProps, ARIA_PROPS)`, `dropdown.cjs.js:1689`),
 * e o Password entrega ao input TODAS as outras props
 * (`PasswordBase.getOtherProps`, `password.cjs.js:699/711`) — nos dois o spread
 * direto basta. O Calendar não: ele copia para dentro só `inputId`,
 * `ariaLabelledBy` e `ariaLabel` (`calendar.cjs.js:3899-3924`) e despeja o resto
 * no `<span.p-calendar>` RAIZ (`:4127`). O `aria-invalid` pousava lá, e um
 * atributo de invalidez na casca não chega ao leitor de tela, que anuncia o
 * `combobox`. Mesmo defeito do `id` que a P-37 veio pagar, uma camada adiante —
 * medido no navegador com um 422 real, não deduzido.
 *
 * `control` vai no componente; `input` vai pelo `pt` do input, que é a única
 * porta que o Calendar deixa aberta.
 */
export function useSplitFieldProps(idProp: 'id' | 'inputId') {
  const field = useContext(FieldContext)
  if (!field) return { control: {}, input: {} }
  return { control: { [idProp]: field.id, ...invalidProp(field) }, input: ariaProps(field) }
}
