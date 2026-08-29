import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AppCard,
  AppPassword,
  FormErrorBanner,
  FormErrorSummary,
  FormField,
  FormSection,
  useToast,
} from '@shared/ui'
import { useProfilePassword } from '../../hooks/useProfilePassword'

const MAPEADOS = ['current_password', 'password', 'password_confirmation']

/**
 * Troca de senha inline, na coluna self-service (spec D4).
 *
 * O aviso fica ACIMA do botão, onde é lido antes de agir: trocar a senha
 * encerra as outras sessões do usuário (D3 do bloco 1) e a atual sobrevive.
 *
 * É `<form>`, não `div`: sem ele não há envio por Enter — quem digitava as três
 * senhas e apertava Enter não via nada acontecer — e o gerenciador de senhas
 * perde a semântica que usa para preencher e para oferecer gravar a nova (o
 * Chrome reclamava três vezes no console, "Password field is not contained in a
 * form", UI-05 do review de 2026-08-16). O `autoComplete` é a outra metade: sem
 * ele o gerenciador não distingue a senha atual da nova.
 */
export function ProfileSecuritySection({ email }: { email: string }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { form, set, submit, pending, fieldErrors, generalError } = useProfilePassword(() =>
    toast.success(t('profile.security.saved')),
  )

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.security.title')} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="mt-3 flex flex-col gap-3"
      >
        {/* O gerenciador de senhas precisa saber DE QUEM é a senha para gravar
            a nova — sem campo de usuário o Chrome avisa "Password forms should
            have (optionally hidden) username fields". A conta não se troca
            aqui, então o campo é somente-leitura, fora da ordem de tabulação e
            fora da árvore de acessibilidade: existe para o navegador, não para
            o usuário. `sr-only` e não `display:none`, que alguns navegadores
            ignoram para este fim. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />

        <FormErrorBanner message={generalError} />
        <FormErrorSummary errors={fieldErrors} mapped={MAPEADOS} />

        {/* `disabled` durante o PUT (spec §7). Aqui não é só cosmética: o
            sucesso limpa o formulário inteiro (`setForm(VAZIO)`), então o que
            fosse digitado no meio do voo era APAGADO sem aviso — e o que se
            digita neste formulário é senha, que não se recupera relendo a
            tela. */}
        <FormField
          label={t('profile.security.currentPassword')}
          error={fieldErrors?.current_password?.[0]}
        >
          <AppPassword
            autoComplete="current-password"
            value={form.current_password}
            disabled={pending}
            onChange={(e) => set('current_password', e.target.value)}
          />
        </FormField>

        <FormField label={t('profile.security.newPassword')} error={fieldErrors?.password?.[0]}>
          <AppPassword
            autoComplete="new-password"
            value={form.password}
            disabled={pending}
            onChange={(e) => set('password', e.target.value)}
          />
        </FormField>

        <FormField
          label={t('profile.security.confirmPassword')}
          error={fieldErrors?.password_confirmation?.[0]}
        >
          <AppPassword
            autoComplete="new-password"
            value={form.password_confirmation}
            disabled={pending}
            onChange={(e) => set('password_confirmation', e.target.value)}
          />
        </FormField>

        <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.security.warning')}
        </p>

        <div>
          <AppButton
            variant="primary"
            type="submit"
            label={t('profile.security.save')}
            icon="pi pi-lock"
            loading={pending}
          />
        </div>
      </form>
    </AppCard>
  )
}
