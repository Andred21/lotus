import { useTranslation } from 'react-i18next'
import { AppInputText, type FieldComponent } from '@shared/ui'
import type { StudentFormFields } from '../../hooks/useStudentForm'

/** Os quatro campos de identificação do aluno, em duas colunas a partir de
 * `sm`: Nome │ RUT e E-mail │ Teléfono (bloco 43). A empresa fica fora deste
 * componente, em linha inteira abaixo da foto (`StudentClientField`).
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o redator tem o acesso abaixo do telefone; o aluno, a
 * empresa fora do grid), e unificá-los mudaria o que três telas renderizam.
 *
 * Sem escape nenhum aqui — os quatro campos colapsam inteiros no `Field`. */
export function StudentIdentityFields({
  Field,
}: {
  Field: FieldComponent<StudentFormFields>
}) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label={t('student.name')}>
        <AppInputText className="w-full" />
      </Field>

      <Field name="rut" label={t('common.rut')}>
        <AppInputText className="w-full" />
      </Field>

      <Field name="email" label={t('common.email')}>
        <AppInputText className="w-full" />
      </Field>

      <Field name="phone" label={t('common.phone')}>
        <AppInputText className="w-full" />
      </Field>
    </div>
  )
}
