import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type { ProfileData } from '@shared/types/generated'
import { useUpdateProfile } from '../api/useProfile'

type Campos = { name: string; phone: string }

function toFields(profile: ProfileData): Campos {
  return { name: profile.name, phone: profile.phone ?? '' }
}

/**
 * Nome e telefone — os dois únicos campos que `ProfileUpdateData` aceita.
 *
 * O reset compara o **id**, não a identidade do objeto: um refetch produz um
 * objeto novo com o mesmo id, e resetar ali apagaria o que o usuário digitou.
 * É "adjust state during render", não `useEffect` + `setState`, que é proibido
 * pelo `react-hooks/set-state-in-effect` (molde: `useEntityForm`).
 */
export function useProfileForm(profile: ProfileData, onSaved?: () => void) {
  const update = useUpdateProfile()
  const [form, setForm] = useState<Campos>(() => toFields(profile))
  const [prevId, setPrevId] = useState(profile.id)

  if (profile.id !== prevId) {
    setPrevId(profile.id)
    setForm(toFields(profile))
  }

  const { fieldErrors, generalError } = useMutationErrors([update.error])

  return {
    form,
    set: (k: keyof Campos, v: string) => setForm((f) => ({ ...f, [k]: v })),
    // Telefone em branco é AUSÊNCIA, e o DTO aceita `null`. Mandar `''` gravaria
    // string vazia numa coluna que distingue "sem telefone" de "telefone vazio".
    submit: () =>
      update.mutate({ name: form.name, phone: form.phone.trim() || null }, { onSuccess: onSaved }),
    pending: update.isPending,
    fieldErrors,
    generalError,
  }
}
