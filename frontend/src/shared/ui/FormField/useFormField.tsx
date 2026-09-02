import { useRef, type ReactNode } from 'react'
import { FormField } from './FormField'

/**
 * O que um formulário precisa publicar para os campos se ligarem sozinhos.
 *
 * É um SUBCONJUNTO ESTRUTURAL do que os hooks de form já devolvem
 * (`useRedatorForm`, `useTurmaConfigForm`, `useClientForm`…): o diálogo passa o
 * próprio retorno do hook, sem adaptador.
 */
export type FormBundle<T> = {
  form: T
  set: <K extends keyof T>(k: K, v: T[K]) => void
  fieldErrors?: Record<string, string[]> | null
  /** Ausente nos formulários que não têm modo de leitura (troca de senha,
   * dados do perfil). Ausente = editável. */
  readOnly?: boolean
}

export type FieldProps<T> = {
  /** A chave do form E a chave do erro do backend. Checada contra `keyof T`. */
  name: keyof T & string
  label: string
  /** Escape para o 422 cuja chave não é o nome do campo — hoje um sítio:
   * `legal_name ?? name` no `ClientGeneralFields`. Vence o `fieldErrors`. */
  error?: string
  /** Escape para o campo cujo modo de leitura NÃO é o do formulário
   * (`StudentClientField`: `mode !== 'create'`; `RoleDialog`: input desabilitado
   * em vez de texto). Vence o `readOnly` do bundle. */
  readOnly?: boolean
  /** O valor de APRESENTAÇÃO em leitura, montado por quem tem o vocabulário de
   * domínio: `t('clientType.'+form.type)`, `readDate(form.start_date)`. Sem ele,
   * leitura mostra o valor cru do form. */
  value?: ReactNode
  children?: ReactNode
}

export type FieldComponent<T> = (props: FieldProps<T>) => ReactNode

/**
 * Devolve o campo ligado ao formulário: `<Field name="rut" label={t('common.rut')}>`
 * no lugar de `label` + `error` + `readOnly` + `value` no campo E `value` +
 * `onChange` no controle.
 *
 * **A identidade do componente é estável (`useRef`, criado uma vez).** Componente
 * recriado a cada render é um TIPO novo para o React, que desmonta e remonta a
 * subárvore — o input perde o foco a cada tecla. `useRef` e não `useMemo`: o
 * `useMemo` é dica de cache, e o React pode descartá-la; a estabilidade aqui é
 * requisito de correção, não otimização.
 *
 * O bundle atual chega ao `Field` por `ref` reescrito a cada render — o `Field`
 * lê `ref.current` no PRÓPRIO render, que acontece depois do render do dono, e
 * por isso nunca vê bundle velho.
 *
 * Não vive em `shared/hooks` porque monta JSX: `shared/hooks` não depende de
 * `shared/ui` (ver `useFilePreview.ts`, `useServerTable.ts`).
 *
 * **Os `eslint-disable` de `react-hooks/refs` são o preço medido do §4.2 da
 * spec.** A regra proíbe ler e escrever `ref.current` durante o render, e é
 * exatamente isso que a identidade estável exige: o componente nasce UMA vez e o
 * bundle atual chega por ref reescrito a cada render. As alternativas medidas
 * durante a execução — componente de módulo devolvido pelo hook, bundle por
 * contexto — ou continuam batendo na mesma regra, ou custam o `keyof T` que o
 * §4.4 comprou. A regra segue viva em todo o resto do repositório.
 */
export function useFormField<T>(bundle: FormBundle<T>): FieldComponent<T> {
  const atual = useRef(bundle)
  // eslint-disable-next-line react-hooks/refs -- identidade estável (§4.2 da spec): ver o bloco acima
  atual.current = bundle

  const componente = useRef<FieldComponent<T> | null>(null)
  // `== null` e não `!componente.current`: é a saída que a própria regra
  // `react-hooks/refs` documenta — só a comparação explícita com `null`
  // dispensa o disable neste ponto; os outros dois abaixo continuam
  // inevitáveis (ver o docblock acima).
  if (componente.current == null) {
    componente.current = function Field({ name, label, error, readOnly, value, children }: FieldProps<T>) {
      const { form, set, fieldErrors, readOnly: leituraDoForm } = atual.current
      const bruto = form[name as keyof T]

      return (
        <FormField
          label={label}
          error={error ?? fieldErrors?.[name]?.[0]}
          readOnly={readOnly ?? leituraDoForm ?? false}
          value={value ?? (bruto as ReactNode)}
          bind={{
            value: bruto,
            onChange: (v: unknown) => set(name as keyof T, v as T[keyof T]),
          }}
        >
          {children}
        </FormField>
      )
    }
  }
  // eslint-disable-next-line react-hooks/refs -- idem
  return componente.current
}
