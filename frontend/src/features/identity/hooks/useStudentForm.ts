import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { StudentData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { studentsApi } from '@shared/api/studentsApi'

/** Só os campos que o formulário edita. Os derivados de leitura
 * (`current_client_*`, `enrollments_count`) ficam de fora. */
export type StudentFormFields = Pick<StudentData, 'id' | 'name' | 'rut' | 'email' | 'phone'> & {
  client_id: number | null
}

const EMPTY: StudentFormFields = {
  id: undefined, name: '', rut: '', email: '', phone: null, client_id: null,
}

export function useStudentForm(student: StudentData | null, mode: DialogMode, onDone: () => void) {
  const entity: StudentFormFields | null = student
    ? { id: student.id, name: student.name, rut: student.rut, email: student.email, phone: student.phone ?? null, client_id: student.current_client_id ?? null }
    : null

  const { form, set, readOnly } = useEntityForm<StudentFormFields>(entity, mode, EMPTY)

  const create = studentsApi.useCreate()
  const update = studentsApi.useUpdate()

  function submit() {
    if (mode === 'create') {
      create.mutate(
        { name: form.name, rut: form.rut, email: form.email, phone: form.phone, client_id: form.client_id },
        { onSuccess: onDone },
      )
      return
    }
    // client_id não vai no update: trocar de empresa é ato da matrícula (D3).
    update.mutate(
      { id: student!.id as number, payload: { name: form.name, rut: form.rut, email: form.email, phone: form.phone } },
      { onSuccess: onDone },
    )
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, readOnly, submit,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
