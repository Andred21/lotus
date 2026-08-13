import type { Dispatch, SetStateAction } from 'react'
import { useEntityForm, useMutationErrors } from './useEntityForm'
import type { DialogMode } from '@shared/lib'
import type { ProblemDetails } from '@shared/api/axios'

/** Recurso mutável, estrutural — mesmo padrão do `ListableResource` do
 * `useCrudPage`: o teste passa um literal e não precisa de TanStack. */
export type MutableResource<T> = {
  useCreate: () => {
    mutate: (payload: unknown, opts?: { onSuccess?: (created: T) => void }) => void
    isPending: boolean
    error: ProblemDetails | null
  }
  useUpdate: () => {
    mutate: (
      vars: { id: number | string; payload: unknown },
      opts?: { onSuccess?: (updated: T) => void },
    ) => void
    isPending: boolean
    error: ProblemDetails | null
  }
}

/** Chaves do payload que ninguém classificou. Ver `useCrudForm` para o porquê. */
export function unclassifiedPayloadKeys(
  keys: string[],
  mapped: string[],
  summaryOnly: string[],
  excludePrefixes: string[],
): string[] {
  return keys.filter(
    (k) =>
      !mapped.includes(k) &&
      !summaryOnly.includes(k) &&
      !excludePrefixes.some((p) => k.startsWith(p)),
  )
}

/** Chaves classificadas nas DUAS caixas. Ver `useCrudForm` para o porquê. */
export function classificationConflicts(mapped: string[], summaryOnly: string[]): string[] {
  return [...new Set(mapped.filter((k) => summaryOnly.includes(k)))].sort()
}

/**
 * Chaves que NENHUMA classificação salva. `photo_url` é `#[Computed]` nos quatro
 * DTOs que têm foto e carrega URL pré-assinada na saída (o `SignedUrlTransformer`
 * roda na serialização); mandá-la de volta num corpo de escrita devolve **200**,
 * não 422, porque a promoção no construtor do DTO desvia do
 * `CannotSetComputedValue`. Falha silenciosa: o Q-4 dos achados de 2026-08-05.
 *
 * Separado da guarda de classificação de propósito — lá a resposta certa é
 * declarar a chave numa das caixas; aqui nenhuma caixa é resposta certa.
 */
const FORBIDDEN_PAYLOAD_KEYS = ['photo_url']

/** Chaves de saída computada presentes no payload. Ver `FORBIDDEN_PAYLOAD_KEYS`. */
export function forbiddenPayloadKeys(keys: string[]): string[] {
  return keys.filter((k) => FORBIDDEN_PAYLOAD_KEYS.includes(k))
}

export type CrudFormOptions<F extends { id?: number }, T> = {
  entity: F | null
  mode: DialogMode
  empty: F
  toFields?: (entity: F) => F
  toPayload: (form: F, mode: DialogMode) => Record<string, unknown>
  /** Campos que mostram o próprio erro no `FormField` — o resumo os omite. */
  mapped: string[]
  /** Campos cujo 422 é mostrado pelo RESUMO, seja por não terem input, seja
   * por o input não passar `error=`. Não vai para o `FormErrorSummary`. */
  summaryOnly: string[]
  /** Prefixos de campo aninhado que mostram o próprio erro (`contacts.`). */
  excludePrefixes?: string[]
  onDone: () => void
  afterCreate?: (created: T) => void | Promise<void>
}

/**
 * Formulário CRUD completo: estado, submit com a ramificação create/update,
 * `pending` somado e normalização RFC 7807. `useEntityForm` cuidava só do
 * estado, e as outras ~50 linhas estavam copiadas em nove hooks.
 *
 * A classificação de TODA chave de payload é obrigatória (spec D12). O
 * `FormErrorSummary` mostra exatamente as chaves que não estão em `mapped`:
 * chave nova que entre em `mapped` por reflexo some das duas pontas, e chave
 * nova sem classificação nenhuma passa despercebida. Exigir a decisão é o que
 * impede as duas.
 */
export function useCrudForm<F extends { id?: number }, T>(
  resource: MutableResource<T>,
  opts: CrudFormOptions<F, T>,
) {
  const { entity, mode, empty, toFields, toPayload, mapped, summaryOnly, onDone, afterCreate } = opts
  const excludePrefixes = opts.excludePrefixes ?? []

  const { form, setForm, set, readOnly, didReset } = useEntityForm<F>(entity, mode, empty, toFields)

  const create = resource.useCreate()
  const update = resource.useUpdate()

  if (import.meta.env.DEV) {
    const keys = [
      ...new Set([
        ...Object.keys(toPayload(form, 'create')),
        ...Object.keys(toPayload(form, 'edit')),
      ]),
    ]
    const leaked = unclassifiedPayloadKeys(keys, mapped, summaryOnly, excludePrefixes)
    const conflicting = classificationConflicts(mapped, summaryOnly)

    const forbidden = forbiddenPayloadKeys(keys)

    if (forbidden.length > 0) {
      throw new Error(
        `useCrudForm: chave computada no payload de escrita: ${forbidden.join(', ')}. ` +
          'Nenhuma classificação salva esta chave — ela não é campo de formulário. ' +
          'Remova do `toPayload`: liste os campos em vez de espalhar `...form`.',
      )
    }

    if (conflicting.length > 0) {
      throw new Error(
        `useCrudForm: chave classificada em \`mapped\` E em \`summaryOnly\`: ${conflicting.join(', ')}. ` +
          'As duas se contradizem — o resumo mostra exatamente o que NÃO está em ' +
          '`mapped`, então a chave some do resumo e continua prometida por ele. ' +
          'Escolha uma.',
      )
    }

    if (leaked.length > 0) {
      throw new Error(
        `useCrudForm: chave de payload sem classificação: ${leaked.join(', ')}. ` +
          'Declare em `mapped` (o campo mostra o próprio erro), em `summaryOnly` ' +
          '(quem mostra é o FormErrorSummary) ou cubra com `excludePrefixes`.',
      )
    }
  }

  function submit() {
    if (mode === 'create') {
      create.mutate(toPayload(form, 'create'), {
        onSuccess: async (created: T) => {
          await afterCreate?.(created)
          onDone()
        },
      })
      return
    }

    // O id do PUT vem da ENTIDADE, nunca do form: o form é editável e o alvo
    // do update não pode depender do que o usuário digitou (spec D10).
    if (entity?.id == null) return
    update.mutate({ id: entity.id, payload: toPayload(form, 'edit') }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    // Tudo que o diálogo pode consumir vive AQUI dentro, porque os hooks de
    // feature devolvem `crud` inteiro (`return crud`, `{ ...crud, toggle }`).
    crud: {
      form,
      set,
      readOnly,
      didReset,
      submit,
      pending: create.isPending || update.isPending,
      fieldErrors,
      generalError,
      errorSummary: { mapped, excludePrefixes },
    },
    // `setForm` fica FORA do objeto de propósito: quem manipula coleção nested
    // é o hook (`useClientForm`), nunca o componente — a rule nomeia o
    // `patchContact(setForm, ...)` do ClientDialog como contra-exemplo. Dentro
    // de `crud` ele chegaria aos 5 diálogos por spread, de graça e sem ninguém
    // pedir; aqui precisa ser nomeado no destructuring de quem realmente usa.
    setForm: setForm as Dispatch<SetStateAction<F>>,
  }
}
