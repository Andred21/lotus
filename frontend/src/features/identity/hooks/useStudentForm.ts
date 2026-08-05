import { useCrudForm } from '@shared/hooks'
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

export function useStudentForm(
  student: StudentData | null,
  mode: DialogMode,
  onDone: () => void,
  afterCreate?: (created: StudentData) => Promise<void>,
) {
  const entity: StudentFormFields | null = student
    ? { id: student.id, name: student.name, rut: student.rut, email: student.email, phone: student.phone ?? null, client_id: student.current_client_id ?? null }
    : null

  const crud = useCrudForm<StudentFormFields, StudentData>(studentsApi, {
    entity,
    mode,
    empty: EMPTY,
    toPayload: (f, m) =>
      m === 'create'
        ? { name: f.name, rut: f.rut, email: f.email, phone: f.phone, client_id: f.client_id }
        // client_id não vai no update: trocar de empresa é ato da matrícula (D3).
        : { name: f.name, rut: f.rut, email: f.email, phone: f.phone },
    mapped: ['name', 'rut', 'email', 'client_id'],
    // `StudentDialog` não tem FormErrorSummary: um 422 em `phone` não aparece
    // em lugar nenhum hoje. Classificar expõe a lacuna sem mudar a tela —
    // construir o resumo que falta é débito registrado (spec D14).
    summaryOnly: ['phone'],
    onDone,
    afterCreate,
  })

  return crud
}
