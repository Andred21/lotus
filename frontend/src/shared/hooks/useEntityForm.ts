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
 *
 * `dirty` compara o `form` com o valor inicial do ÚLTIMO reset (guardado em
 * `baseline`, um objeto à parte do `form`), então desfazer a mudança à mão
 * volta a limpo, e o reset zera. Um refetch com o mesmo id não reseta — e
 * portanto não mexe no baseline.
 */
/** Igualdade estrutural de valores JSON-like (o que o form carrega). Chave
 * `undefined` vale como ausente: o `Optional` do DTO chega assim e o form o
 * normaliza sem que isso seja edição do usuário. */
function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => sameValue(v, b[i]))
  }
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  return [...keys].every((k) => sameValue(left[k], right[k]))
}

export function useEntityForm<T extends { id?: number }>(
  entity: T | null,
  mode: DialogMode,
  empty: T,
  toFields: (entity: T) => T = (e) => structuredClone(e),
) {
  const initial = () => (entity ? toFields(entity) : structuredClone(empty))

  const [form, setForm] = useState<T>(initial)
  // Segundo `initial()`, e não o mesmo objeto: o form é editado a partir dele, e
  // um baseline compartilhado mudaria junto com ele.
  const [baseline, setBaseline] = useState<T>(initial)
  const [prev, setPrev] = useState({ id: entity?.id ?? null, mode })

  // Ajuste de estado durante o render — o padrão do React para "resetar estado
  // quando uma prop muda". Um useEffect com setState é proibido pela regra
  // react-hooks/set-state-in-effect nesta versão do eslint-plugin-react-hooks.
  const currentId = entity?.id ?? null
  const didReset = currentId !== prev.id || mode !== prev.mode
  if (didReset) {
    setPrev({ id: currentId, mode })
    setForm(initial)
    setBaseline(initial)
  }

  const set = <K extends keyof T>(k: K, v: T[K]) => setForm((f) => ({ ...f, [k]: v }))

  return {
    form,
    setForm,
    set,
    readOnly: mode === 'view',
    didReset,
    dirty: !sameValue(form, baseline),
  }
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
