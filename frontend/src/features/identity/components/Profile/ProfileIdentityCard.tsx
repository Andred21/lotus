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
    // `pt-9` abaixo de `xl` (medido no navegador, decisão do João em
    // 2026-08-17): o halo do `scale-200` do `AppPhotoField` sobe 34px acima do
    // topo natural do avatar, e com os 16px do `p-4` ele saía 17px PARA FORA do
    // cartão. Enquanto a identidade era o primeiro bloco da coluna, isso caía na
    // folga da página; com a inversão da D-27 ela passou a cair na calha de 16px
    // que a separa do cartão de cima, e o topo do círculo ENCOSTAVA nele — folga
    // medida de −1px, onde toda calha da tela é 16px. 36px põem o halo de volta
    // para dentro. A partir de `xl` o cartão volta a ser o primeiro da coluna e
    // o `p-4` basta. Correção de ESPAÇO, não de geometria: mexer no `scale-200`
    // é a DS-05, fora deste bloco por decisão do João.
    <AppCard variant="sunken" className="p-4 pt-9 xl:pt-4">
      {/* Avatar e nome seguem EMPILHADOS nas duas faixas — `flex-col` abaixo de
          `xl`, fluxo de bloco a partir dele. Quem encurtou o cartão foi o grid de
          campos abaixo, em duas colunas (D-27): medido em 1024x768 com o Admin,
          `Datos personales` saiu de y=829 para y=265 — primeira dobra — e o total
          caiu de 1476px para 1394px. A faixa HORIZONTAL, com o avatar ao lado do
          nome, não entrou porque exigiria a DS-05: o halo do `scale-200` vazaria
          contra a borda lateral do cartão do mesmo jeito que vazava para cima. */}
      <div className="flex flex-col items-center gap-4 xl:block">
        <AppPhotoField name={profile.name} {...photo} />

        <div className="min-w-0 text-center">
          <p className="mt-4 text-base font-semibold" style={{ color: 'var(--text-color)' }}>
            {profile.name}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {profile.role ? t(`roleName.${profile.role}`) : '—'}
          </p>
        </div>
      </div>

      {/* Duas colunas de leitura abaixo de `xl`, uma a partir dele: na faixa há
          largura de sobra, e empilhar dois campos curtos ali só produz altura. */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="sm:col-span-2 xl:col-span-1">
          <FormSection title={t('profile.identity.title')} />
        </div>
        <FormField label={t('profile.identity.email')} readOnly value={profile.email} />
        {/* `font-mono` no RUT (D-29): é o dado técnico do próprio dono, e o token
            já é o que `StudentsTable.tsx:46`, `RedatoresTable.tsx:47` e
            `RedatorCard.tsx:41` usam para o RUT de terceiros. */}
        <FormField
          label={t('profile.identity.rut')}
          readOnly
          value={
            profile.rut ? (
              <span className="font-mono">{profile.rut}</span>
            ) : (
              t('profile.identity.noRut')
            )
          }
        />
        {/* O campo `Perfil` MORREU aqui (D-27). `Redactor` aparecia três vezes
            simultaneamente na tela — header, faixa, e este campo —, e a faixa é
            onde o papel pertence: ao lado do nome de quem o tem. */}
        <p
          className="text-xs sm:col-span-2 xl:col-span-1"
          style={{ color: 'var(--text-color-secondary)' }}
        >
          {t('profile.identity.managedByAdmin')}
        </p>
      </div>
    </AppCard>
  )
}
