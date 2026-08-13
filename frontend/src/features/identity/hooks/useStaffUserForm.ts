import { useCrudFormWithPhoto } from '@shared/hooks'
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

export function useStaffUserForm(
  user: UserData | null,
  mode: DialogMode,
  onDone: () => void,
) {
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

  const { crud } = useCrudFormWithPhoto<StaffUserFormFields, UserData>(usersApi, {
    entity,
    mode,
    empty: EMPTY,
    toFields,
    toPayload: (f, m) => {
      const base = {
        name: f.name,
        email: f.email,
        rut: f.rut || null,
        phone: f.phone || null,
        role: f.role,
        is_active: f.is_active,
      }
      // No create a senha é obrigatória; no update, vazia significa "mantém a
      // atual" e a chave não pode ir no corpo.
      if (m === 'create') return { ...base, password: f.password }
      return f.password ? { ...base, password: f.password } : base
    },
    mapped: ['name', 'rut', 'email', 'password', 'role'],
    // `phone` (StaffUserDialog:83) e `is_active` (:105) TÊM input, mas nenhum
    // passa `error=` ao FormField — quem mostra o 422 deles é o resumo.
    summaryOnly: ['phone', 'is_active'],
    onDone,
    photo: {
      resource: 'users',
      invalidateKey: usersApi.keys.all,
      url: user?.photo_url,
    },
  })

  return crud
}
