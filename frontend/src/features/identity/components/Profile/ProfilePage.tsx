import { useTranslation } from 'react-i18next'
import { AppDetailSkeleton, AppErrorState, InlineLoadState, ModulePage } from '@shared/ui'
import { useProfilePage } from '../../hooks/useProfilePage'
import { ProfileIdentityCard } from './ProfileIdentityCard'
import { ProfilePersonalSection } from './ProfilePersonalSection'
import { ProfileSecuritySection } from './ProfileSecuritySection'
import { ProfileDocumentsSection } from './ProfileDocumentsSection'
import { ProfileSummaryCard } from './ProfileSummaryCard'

/**
 * Mi perfil. Duas colunas com corte por MUTABILIDADE (spec D1): à esquerda o
 * que o usuário não controla (identidade, papel, resumo), à direita exatamente
 * o que é self-service. A regra do bloco é a regra visível do layout.
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

          Abaixo de `xl`, o self-service vem PRIMEIRO (D-27). Em 1024x768 o Admin
          tinha `Datos personales` em y=829 e 1476px de total; o Redator,
          `Documentación profesional` em y=1809 e 2544px — 3,7 dobras, com a
          primeira contendo só o cartão de identidade, cujo único controle é o de
          foto. A ordem em `xl` fica intocada: ali a posição horizontal já
          carrega a regra, e quem a carrega abaixo disso é a superfície recuada
          (D-28), que precisou vir antes — reordenar sem marca visual só troca
          qual metade fica por último.

          **O custo do `order-*` está medido e aceito (decisão do João,
          2026-08-18).** `order` reordena a PINTURA, não a árvore de
          acessibilidade: abaixo de `xl` o Tab percorre a coluna de leitura
          antes da de self-service, e o foco salta `main.scrollTop`
          0 → 1862 → 2230 → 0 em 390px; em 1024px o `y` do elemento focado vai
          1875 → 2383 e volta para 323 (UI-01 do review de 2026-08-18, WCAG
          1.3.2 e 2.4.3). A correção existiu e foi revertida: virar as colunas
          em `xl` alinharia DOM e pintura nas três larguras, ao preço de tirar
          a identidade da esquerda no desktop, e o layout venceu. Nada de
          `tabIndex` positivo aqui — trocaria um defeito de ordem por outro. O
          débito é o **D-32** do `backlog.md`. */}
      <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="order-2 flex flex-col gap-4 xl:order-1">
          <ProfileIdentityCard profile={profile} />
          {profile.redator && <ProfileSummaryCard redator={profile.redator} />}
        </div>
        <div className="order-1 flex flex-col gap-4 xl:order-2">
          <ProfilePersonalSection profile={profile} />
          <ProfileSecuritySection email={profile.email} />
          {profile.redator && <ProfileDocumentsSection documentos={profile.redator.documentos} />}
        </div>
      </div>
    </ModulePage>
  )
}
