import { useTranslation } from 'react-i18next'
import { AppCard, AppPhotoField, FormField, FormSection } from '@shared/ui'
import type { ProfileData } from '@shared/types/generated'
import { useProfilePhoto } from '../../hooks/useProfilePhoto'

/**
 * Coluna esquerda: o que o usuário NÃO controla (spec D1). Papel, e-mail e RUT
 * são leitura de verdade — `FormField readOnly` renderiza texto e devolve `—`
 * quando vazio. Input desabilitado corta o valor e derruba o contraste, e é
 * lint (BD-3 §4).
 *
 * A foto é a exceção deliberada nesta coluna: ela É self-service, mas mora ao
 * lado do nome porque é assim que o usuário a reconhece como sua.
 *
 * **A superfície recuada é a marca do corte (D-28).** A regra da spec D1 —
 * leitura de um lado, self-service do outro — era expressa só por posição
 * horizontal, que existe a partir de 1280px; abaixo disso virava ordem vertical,
 * e ordem sem marca não lê como regra. Recuado, este cartão se dissolve no fundo
 * da aplicação e sobra cartão elevado só onde há o que fazer.
 *
 * **Custo declarado e aceito:** a foto É self-service e mora aqui. A superfície
 * marca a natureza DOMINANTE do bloco; o botão de foto carrega a própria
 * afordância por ser botão com rótulo. Mover a foto para a coluna de
 * self-service contradiria a decisão da spec D1, que a pôs ao lado do nome
 * porque é assim que o usuário a reconhece como sua.
 */
export function ProfileIdentityCard({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation()
  const photo = useProfilePhoto(profile.photo_url)

  return (
    <AppCard variant="sunken" className="p-4">
      <AppPhotoField name={profile.name} {...photo} />

      <p className="mt-4 text-center text-base font-semibold" style={{ color: 'var(--text-color)' }}>
        {profile.name}
      </p>
      <p className="text-center text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {profile.role ? t(`roleName.${profile.role}`) : '—'}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <FormSection title={t('profile.identity.title')} />
        <FormField label={t('profile.identity.email')} readOnly value={profile.email} />
        <FormField
          label={t('profile.identity.rut')}
          readOnly
          value={profile.rut ?? t('profile.identity.noRut')}
        />
        <FormField
          label={t('profile.identity.role')}
          readOnly
          value={profile.role ? t(`roleName.${profile.role}`) : null}
        />
        <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.identity.managedByAdmin')}
        </p>
      </div>
    </AppCard>
  )
}
