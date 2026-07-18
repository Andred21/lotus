import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { UserData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { usersApi } from '@shared/api/usersApi'

/** Campos editáveis do form de staff. `password` é local (nunca vem no GET);
 * vazio no update = manter a senha atual. */
export type StaffUserFormFields = Pick<UserData, 'id' | 'name' | 'email' | 'role' | 'is_active'> & {
  rut: string
  phone: string
  password: string
}

const EMPTY: StaffUserFormFields = {
  id: undefined, name: '', email: '', role: '', is_active: true, rut: '', phone: '', password: '',
}

const toFields = (f: StaffUserFormFields): StaffUserFormFields => structuredClone(f)

export function useStaffUserForm(user: UserData | null, mode: DialogMode, onDone: () => void) {
  // `rut`/`phone` chegam `string | null | undefined` do contrato (Optional na
  // entrada); normaliza para string vazia antes de entrar no form — mesmo
  // padrão do `entity` normalizado em useCourseForm.
  const entity: StaffUserFormFields | null = user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        rut: user.rut ?? '',
        phone: user.phone ?? '',
        password: '',
      }
    : null
  const { form, set, readOnly } = useEntityForm<StaffUserFormFields>(entity, mode, EMPTY, toFields)

  const create = usersApi.useCreate()
  const update = usersApi.useUpdate()

  function submit() {
    const base = {
      name: form.name,
      email: form.email,
      rut: form.rut || null,
      phone: form.phone || null,
      role: form.role,
      is_active: form.is_active,
    }

    if (mode === 'create') {
      create.mutate({ ...base, password: form.password }, { onSuccess: onDone })
      return
    }

    const payload = form.password ? { ...base, password: form.password } : base
    update.mutate({ id: user!.id!, payload }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, readOnly, submit,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
