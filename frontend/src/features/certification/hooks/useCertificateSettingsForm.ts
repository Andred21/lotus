import { useState } from 'react'
import { useMutationErrors, useResourceState } from '@shared/hooks'
import type { CertificateSettingsData, CertificateSignatureFileData } from '@shared/types/generated'
import {
  useCertificateSettings,
  useRemoveManagerSignature,
  useUpdateCertificateSettings,
  useUploadManagerSignature,
} from '../api/certificateSettingsApi'

type Campos = { manager_name: string; manager_title: string }

/** O que o campo da firma consome: a firma atual e as três ações sobre ela. */
export type ManagerSignatureControl = {
  current: CertificateSignatureFileData | null
  uploading: boolean
  uploadError: string | null
  /** `true` = o servidor aceitou; só nesse caso o seletor é remontado. */
  upload: (file: File) => Promise<boolean>
  confirmingRemove: boolean
  removing: boolean
  removeError: string | null
  askRemove: () => void
  cancelRemove: () => void
  confirmRemove: () => void
}

function toFields(settings: CertificateSettingsData): Campos {
  return { manager_name: settings.manager_name, manager_title: settings.manager_title }
}

/**
 * Configuración › Certificados: nome, cargo e firma da gerente.
 *
 * O form é o servidor MAIS as edições locais (`edits`), e não uma cópia
 * sincronizada por efeito: um refetch ou o retorno da firma não apaga o que o
 * usuário digitou, e o "Guardar" limpa as edições porque o cache já traz o
 * valor salvo. Nome e cargo salvam por PUT; a firma tem rota própria e sobe
 * assim que é confirmada — não espera o "Guardar".
 */
export function useCertificateSettingsForm(onSaved?: () => void) {
  const state = useResourceState(useCertificateSettings())
  const update = useUpdateCertificateSettings()
  const upload = useUploadManagerSignature()
  const remove = useRemoveManagerSignature()
  const [edits, setEdits] = useState<Partial<Campos>>({})
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const form: Campos = { manager_name: '', manager_title: '', ...(state.data && toFields(state.data)), ...edits }
  const { fieldErrors, generalError } = useMutationErrors([update.error])
  const uploadError = useMutationErrors([upload.error]).message
  const removeError = useMutationErrors([remove.error]).message

  const signature: ManagerSignatureControl = {
    current: state.data?.signature ?? null,
    uploading: upload.isPending,
    uploadError,
    upload: (file) =>
      upload
        .mutateAsync(file)
        .then(() => true)
        .catch(() => false),
    confirmingRemove,
    removing: remove.isPending,
    removeError,
    askRemove: () => {
      remove.reset()
      setConfirmingRemove(true)
    },
    cancelRemove: () => setConfirmingRemove(false),
    confirmRemove: () => remove.mutate(undefined, { onSuccess: () => setConfirmingRemove(false) }),
  }

  return {
    state,
    form,
    set: <K extends keyof Campos>(k: K, v: Campos[K]) => setEdits((e) => ({ ...e, [k]: v })),
    submit: () =>
      update.mutate(form, {
        onSuccess: () => {
          setEdits({})
          onSaved?.()
        },
      }),
    saving: update.isPending,
    fieldErrors,
    generalError,
    signature,
  }
}
