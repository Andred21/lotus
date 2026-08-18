import { useTranslation } from 'react-i18next'
import { AppDetailSkeleton, AppErrorState, InlineLoadState, ModulePage } from '@shared/ui'
import { useProfilePage } from '../../hooks/useProfilePage'
import { ProfileIdentityCard } from './ProfileIdentityCard'
import { ProfilePersonalSection } from './ProfilePersonalSection'
import { ProfileSecuritySection } from './ProfileSecuritySection'
import { ProfileDocumentsSection } from './ProfileDocumentsSection'
import { ProfileSummaryCard } from './ProfileSummaryCard'

/**
 * Mi perfil. Duas colunas com corte por MUTABILIDADE (spec D1): de um lado
 * exatamente o que é self-service, do outro o que o usuário não controla
 * (identidade, papel, resumo). A regra do bloco é a regra visível do layout.
 *
 * **O self-service vem PRIMEIRO, e agora em todas as larguras** (decisão do
 * João, 2026-08-18). A D1 punha o imutável à ESQUERDA em `xl`, e a D-27 punha o
 * self-service em cima abaixo de `xl` — duas ordens visuais para um DOM só, que
 * só se conciliavam com `order-*`. `order` reordena a PINTURA e não a árvore de
 * acessibilidade: em 390px o foco saltava `main.scrollTop` 0 → 1862 → 2230 → 0
 * ao longo do Tab, e em 1024px o `y` do elemento focado ia 1875 → 2383 e voltava
 * para 323 (UI-01 do review de 2026-08-18, WCAG 1.3.2 e 2.4.3). Trocar o lado
 * em `xl` não move o defeito de viewport: a ordem de leitura de duas colunas em
 * LTR é a coluna esquerda inteira e depois a direita, então DOM e pintura
 * coincidem em `xl` E abaixo dele — sem uma classe `order` na tela.
 *
 * O que a D1 perde com a troca é só o LADO, não a marca: quem diz "isto você
 * não edita" é a superfície recuada (D-28), que já era o portador da regra
 * abaixo de `xl` e agora vale nas três larguras.
 *
 * O que ramifica a tela é o DADO que falta, não o `status` da query:
 * `failedWithoutData` é o único que troca o conteúdo pelo erro; falha COM
 * perfil em cache vira aviso ao lado e preserva o que o usuário digitou.
 */
export function ProfilePage() {
  const { t } = useTranslation()
  const { data: profile, isLoading, loadError, errorDetail, failedWithoutData, refetch } =
    useProfilePage()

  // O MESMO predicado que ramifica o corpo (linhas do `profile.redator` abaixo),
  // não uma checagem de role: o backend já decide quem tem perfil profissional,
  // e `usePermissions`/`can()` é conveniência de interface, não autoridade
  // (ADR-07). Enquanto o subtítulo não ramificava, o Admin lia
  // "…y tu documentación profesional" e rolava até o fim para descobrir que a
  // seção não existe — e a frase já enganou uma medição de fechamento (D-26).
  const subtitulo = profile?.redator ? t('profile.subtitleRedator') : t('profile.subtitleAdmin')

  if (isLoading) return <AppDetailSkeleton />

  if (failedWithoutData || !profile) {
    return (
      <ModulePage title={t('userMenu.profile')} description={subtitulo}>
        <AppErrorState
          title={t('profile.loadError')}
          detail={errorDetail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={refetch}
        />
      </ModulePage>
    )
  }

  return (
    <ModulePage title={t('userMenu.profile')} description={subtitulo}>
      <InlineLoadState
        error={loadError ? (errorDetail ?? t('common.loadErrorHint')) : null}
        retryLabel={t('common.retry')}
        onRetry={refetch}
      />

      {/* Duas colunas só a partir de `xl`. Em `lg` (1024px) a coluna fixa de
          22rem consome metade da área útil e o `1fr` resolve em 336px — a
          coluna que recebe TODOS os controles editáveis ficava menor que a de
          leitura, invertendo a hierarquia que a D1 desenhou (UI-04 do review de
          2026-08-16). Nessa faixa, uma coluna só é mais confortável que duas
          iguais.

          O self-service vem primeiro no DOM, e o `1fr` vem primeiro no template:
          é o par que dispensa `order-*` e mantém foco e pintura na mesma ordem
          nas três larguras — ver o docblock. A razão de o self-service ser o
          primeiro é a D-27, medida: em 1024x768 o Admin tinha `Datos personales`
          em y=829 de 1476px e o Redator, `Documentación profesional` em y=1809
          de 2544px — 3,7 dobras, com a primeira contendo só o cartão de
          identidade, cujo único controle é o de foto. */}
      <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-4">
          <ProfilePersonalSection profile={profile} />
          <ProfileSecuritySection email={profile.email} />
          {profile.redator && <ProfileDocumentsSection documentos={profile.redator.documentos} />}
        </div>
        <div className="flex flex-col gap-4">
          <ProfileIdentityCard profile={profile} />
          {profile.redator && <ProfileSummaryCard redator={profile.redator} />}
        </div>
      </div>
    </ModulePage>
  )
}
