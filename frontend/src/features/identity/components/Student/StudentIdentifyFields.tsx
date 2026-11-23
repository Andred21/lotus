import { useTranslation } from 'react-i18next'
import { AppInputText, PhoneInput, RutInput, type FieldComponent } from '@shared/ui'
import { formatPhoneDisplay } from '@shared/lib'
import { TETOS_IMPRESSOS } from '@shared/config/tetosImpressos'
import type { StudentFormFields } from '../../hooks/useStudentForm'

/** Os quatro campos de identificação do aluno, em duas colunas a partir de
 * `sm`: Nome │ RUT e E-mail │ Teléfono (bloco 43) — estes dois em linha inteira
 * abaixo de `xl` (bloco 60). A empresa fica fora deste
 * componente, em linha inteira abaixo da foto (`StudentClientField`).
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o redator tem o acesso abaixo do telefone; o aluno, a
 * empresa fora do grid), e unificá-los mudaria o que três telas renderizam.
 *
 * Sem escape nenhum aqui — os quatro campos colapsam inteiros no `Field`. */
export function StudentIdentityFields({
  Field,
  form,
}: {
  Field: FieldComponent<StudentFormFields>
  form: StudentFormFields
}) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label={t('student.name')}>
        <AppInputText className="w-full" maxLength={TETOS_IMPRESSOS.nomeAluno} />
      </Field>

      <Field name="rut" label={t('common.rut')}>
        <RutInput className="w-full" />
      </Field>

      {/* Abaixo de `xl`, meia linha deixava o número com 26px a 640px: email e
          telefone tomam a linha inteira até lá (pedido do João, bloco 60). */}
      <div className="sm:col-span-2 xl:col-span-1">
        <Field name="email" label={t('common.email')}>
          <AppInputText className="w-full" />
        </Field>
      </div>

      <div className="sm:col-span-2 xl:col-span-1">
        <Field name="phone" label={t('common.phone')} value={formatPhoneDisplay(form.phone)}>
          <PhoneInput />
        </Field>
      </div>
    </div>
  )
}
