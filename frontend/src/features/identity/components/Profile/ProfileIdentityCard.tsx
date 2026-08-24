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
 * **A superfície recuada saiu (decisão do João, 2026-08-24).** Ela era a marca
 * do corte da D-28: `variant="sunken"` dissolvia este cartão no fundo da
 * aplicação para que sobrasse cartão elevado só onde há o que fazer. Na tela,
 * porém, o bloco lia como buraco ao lado dos cartões de formulário, e a foto —
 * que É self-service e mora aqui — ficava sem moldura. Agora ele usa a MESMA
 * superfície dos cartões de dados (`variant` default: `--surface-card` com
 * borda), e quem carrega a regra da spec D1 volta a ser a posição horizontal em
 * `xl` mais a ordem vertical abaixo dela.
 *
 * **Custo declarado:** abaixo de 1280px a única marca do corte é a ordem, e
 * ordem sem marca visual não lê como regra — é o débito que a D-28 pagava. O
 * `AppCard variant="sunken"` continua existindo para quem precisar dele.
 */
export function ProfileIdentityCard({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation()
  const photo = useProfilePhoto(profile.photo_url)

  return (
    // `p-4` simétrico, sem o antigo `pt-9 xl:pt-4`. Aquele padding compensava o
    // `transform scale-200` do `AppPhotoField`, cujo halo subia 32px acima da
    // própria caixa e era cortado pelo `overflow-hidden` do `AppCard`. O avatar
    // agora tem diâmetro REAL (`AppPhotoField`), então não há o que compensar —
    // e é isso que faz o topo deste cartão coincidir com o do `Datos personales`
    // ao lado, que também é `p-4`.
    <AppCard className="p-4">
      {/* Avatar e nome seguem EMPILHADOS nas duas faixas — `flex-col` abaixo de
          `xl`, fluxo de bloco a partir dele. Quem encurtou o cartão foi o grid de
          campos abaixo, em duas colunas (D-27): medido em 1024x768 com o Admin,
          `Datos personales` saiu de y=829 para y=265 — primeira dobra — e o total
          caiu de 1476px para 1394px. A faixa HORIZONTAL, com o avatar ao lado do
          nome, não entrou porque o halo do `scale-200` vazaria contra a borda
          lateral do cartão do mesmo jeito que vazava para cima — impedimento que
          o diâmetro real removeu, mas o arranjo empilhado segue por desenho. */}
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
