import { useState } from 'react'
import type { ProblemDetails } from '@shared/api/axios'
import type { DialogMode } from '@shared/lib'

/**
 * Núcleo de um formulário de entidade num dialog unificado (view/edit/create).
 *
 * O reset compara o **id** da entidade e o modo, não a identidade do objeto: a
 * entidade vem derivada da lista (ver useCrudPage), então um refetch produz um
 * objeto novo com o mesmo id — resetar ali apagaria o que o usuário digitou.
 *
 * `structuredClone` garante que editar o form nunca mute o objeto cacheado pelo
 * TanStack Query.
 *
 * `toFields` permite projetar a entidade só nos campos editáveis (o redator
 * exclui `documents`, que são geridos por mutações próprias).
 */
export function useEntityForm<T extends { id?: number }>(
  entity: T | null,
  mode: DialogMode,
  empty: T,
  toFields: (entity: T) => T = (e) => structuredClone(e),
) {
  const initial = () => (entity ? toFields(entity) : structuredClone(empty))

  const [form, setForm] = useState<T>(initial)
  const [prev, setPrev] = useState({ id: entity?.id ?? null, mode })

  // Ajuste de estado durante o render — o padrão do React para "resetar estado
  // quando uma prop muda". Um useEffect com setState é proibido pela regra
  // react-hooks/set-state-in-effect nesta versão do eslint-plugin-react-hooks.
  const currentId = entity?.id ?? null
  const didReset = currentId !== prev.id || mode !== prev.mode
  if (didReset) {
    setPrev({ id: currentId, mode })
    setForm(initial)
  }

  const set = <K extends keyof T>(k: K, v: T[K]) => setForm((f) => ({ ...f, [k]: v }))

  return { form, setForm, set, readOnly: mode === 'view', didReset }
}

/**
 * Normaliza os erros de uma ou mais mutações: 422 traz erros por campo; outros
 * status trazem só a mensagem geral.
 *
 * `message` existe para quem NÃO tem um input por campo onde pendurar o erro
 * (um dialog de confirmação, um botão de upload). Sem ele, um 422 cujo mapa
 * `errors` não casa com nenhum campo da tela — como o `errors.status` de
 * "cotação aprovada não pode ser excluída" — zerava `generalError` e sumia
 * da tela. Formulários com campos continuam usando `fieldErrors`/`generalError`.
 */
export function useMutationErrors(errors: Array<ProblemDetails | null | undefined>) {
  const first = errors.find(Boolean) ?? null
  const fieldErrors = first?.errors
  const generalError = first && !first.errors ? first.detail : null

  return {
    fieldErrors,
    generalError,
    message: generalError ?? Object.values(fieldErrors ?? {})[0]?.[0] ?? null,
  }
}
