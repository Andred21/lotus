import { useCrudForm, type CrudFormOptions, type MutableResource } from './useCrudForm'
import { useEntityPhoto } from './useEntityPhoto'
import type { PhotoResource } from '@shared/api/photoResource'

export type CrudFormPhotoOptions = {
  resource: PhotoResource
  /** Query key a invalidar depois de subir/remover (a do recurso pai). */
  invalidateKey: readonly unknown[]
  /** `photo_url` vindo do DTO. */
  url?: string | null
}

/**
 * `useCrudForm` mais a foto do diálogo, na ordem certa: o `flush` da foto
 * bufferizada roda no `afterCreate`, antes do `afterCreate` do chamador e antes
 * do `onDone`.
 *
 * Por que um hook irmão e não uma opção do `useCrudForm`: `useEntityPhoto` chama
 * `useQueryClient` e dois `useMutation`. Montá-lo condicionalmente violaria as
 * regras dos hooks, e montá-lo sempre faria `useCrudForm` exigir
 * `QueryClientProvider` — os testes dele rodam sem Provider de propósito, com um
 * `MutableResource` literal. Quem não tem foto (`useBudgetForm`, `useRoleForm`)
 * continua no `useCrudForm` puro.
 *
 * `pending` NÃO soma `photo.pending`: o botão de salvar giraria por upload de
 * foto, anunciando um salvamento que não está acontecendo. Quem precisa dos dois
 * juntos — `closeBlocked` e `disabled` do `CrudDialog` — usa `busy`.
 */
export function useCrudFormWithPhoto<F extends { id?: number }, T extends { id?: number }>(
  resource: MutableResource<T>,
  opts: CrudFormOptions<F, T> & { photo: CrudFormPhotoOptions },
) {
  const photo = useEntityPhoto({
    resource: opts.photo.resource,
    // Em `create` não há entidade para pendurar a foto: o arquivo é
    // bufferizado e sobe no `flush` abaixo.
    id: opts.mode === 'create' ? null : (opts.entity?.id ?? null),
    mode: opts.mode,
    url: opts.photo.url,
    invalidateKey: opts.photo.invalidateKey,
  })

  const { crud, setForm } = useCrudForm<F, T>(resource, {
    ...opts,
    afterCreate: async (created: T) => {
      await photo.flush(created.id as number)
      await opts.afterCreate?.(created)
    },
  })

  return {
    crud: { ...crud, photo, busy: crud.pending || photo.pending },
    setForm,
  }
}
