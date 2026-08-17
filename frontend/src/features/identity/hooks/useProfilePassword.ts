import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type { ProfilePasswordData } from '@shared/types/generated'
import { useChangePassword } from '../api/useProfile'

const VAZIO: ProfilePasswordData = {
  current_password: '',
  password: '',
  password_confirmation: '',
}

/**
 * Troca da própria senha. Sem seed: senha não se lê do servidor.
 *
 * Limpa os campos SÓ no sucesso. Limpar sempre obrigaria o usuário a redigitar
 * a senha atual que ele já tinha acertado quando o 422 foi sobre a nova.
 */
export function useProfilePassword(onChanged?: () => void) {
  const change = useChangePassword()
  const [form, setForm] = useState<ProfilePasswordData>(VAZIO)

  const { fieldErrors, generalError } = useMutationErrors([change.error])

  return {
    form,
    set: (k: keyof ProfilePasswordData, v: string) => setForm((f) => ({ ...f, [k]: v })),
    submit: () =>
      change.mutate(form, {
        onSuccess: () => {
          setForm(VAZIO)
          onChanged?.()
        },
      }),
    pending: change.isPending,
    fieldErrors,
    generalError,
  }
}
