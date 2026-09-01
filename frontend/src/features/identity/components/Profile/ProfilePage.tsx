import { useTranslation } from 'react-i18next'
import { AppDetailSkeleton, AppErrorState, InlineLoadState, ModulePage } from '@shared/ui'
import { loadMessage } from '@shared/lib'
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
  const { data: profile, isLoading, loadError, errorDetail, errorHint, failedWithoutData, refetch } =
    useProfilePage()

  // O MESMO predicado que ramifica o corpo (linhas do `profile.redator` abaixo),
  // não uma checagem de role: o backend já decide quem tem perfil profissional,
  // e `usePermissions`/`can()` é conveniência de interface, não autoridade
  // (ADR-07). Enquanto o subtítulo não ramificava, o Admin lia
  // "…y tu documentación profesional" e rolava até o fim para descobrir que a
  // seção não existe — e a frase já enganou uma medição de fechamento (D-26).
  const subtitulo = profile?.redator ? t('profile.subtitleRedator') : t('profile.subtitleAdmin')

  // `ModulePage` nos TRÊS ramos, e o esqueleto DENTRO dele (decisão do João,
  // 2026-08-24). Antes o ramo de carga devolvia `<AppDetailSkeleton />` cru: o
  // cabeçalho — e com ele o `h1` da página — só aparecia depois do GET, então a
  // tela abria sem nível 1 (Q-5 de 2026-08-12) e o título saltava para dentro
  // quando o perfil chegava. Com a moldura fixa, só o corpo troca.
  //
  // O título é `profile.title` (`Mi perfil` / `Meu perfil` / `My profile`), não
  // `userMenu.profile`: o mesmo texto, mas a chave da PÁGINA é dela — o item de
  // menu pode ser reescrito sem arrastar o `h1` junto.
  if (isLoading)
    return (
      <ModulePage title={t('profile.title')} description={subtitulo}>
        <AppDetailSkeleton />
      </ModulePage>
    )

  if (failedWithoutData || !profile) {
    return (
      <ModulePage title={t('profile.title')} description={subtitulo}>
        <AppErrorState
          title={t('profile.loadError')}
          detail={loadMessage({ errorDetail, errorHint }, t)}
          retryLabel={t('common.retry')}
          onRetry={refetch}
        />
      </ModulePage>
    )
  }

  return (
    <ModulePage title={t('profile.title')} description={subtitulo}>
      <InlineLoadState
        error={loadError ? loadMessage({ errorDetail, errorHint }, t) : null}
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

          **O `order-*` mudou de breakpoint em 2026-08-31 (D-32).** Até então o
          DOM nascia `identidade → self-service` e a pintura abaixo de `xl` era o
          inverso — `order` reordena a PINTURA, não a árvore de acessibilidade, e
          o Tab percorria a coluna de leitura antes da de self-service: o foco
          saltava `main.scrollTop` 0 → 1862 → 2230 → 0 em 390px, e em 1024px o
          `y` do elemento focado ia 1875 → 2383 e voltava para 323 (UI-01 do
          review de 2026-08-18, WCAG 1.3.2 e 2.4.3). Agora o DOM nasce na ordem
          de BAIXO de `xl` e o `order-*` só existe em `xl`: onde a violação foi
          medida em 3,7 dobras, DOM e pintura concordam. Em `xl` sobra uma
          divergência menor, porque as duas colunas dividem a mesma dobra.

          Isto NÃO reverte a D1 nem a D-27: a identidade segue à esquerda no
          desktop e o self-service segue vindo primeiro abaixo de `xl`. Só mudou
          qual breakpoint paga a diferença entre pintura e árvore.

          Recusadas: virar as colunas em `xl` (é a correção que existiu e que o
          João reverteu em 2026-08-18, porque tirava a identidade da esquerda no
          desktop); `tabIndex` positivo (trocaria um defeito de ordem por outro);
          e a propriedade CSS `reading-flow`, que resolveria o caso na origem mas
          só existe no Chrome — apoiar acessibilidade num recurso de um motor só
          é regressão silenciosa nos outros. */}
      <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 xl:order-2">
          <ProfilePersonalSection profile={profile} />
          <ProfileSecuritySection email={profile.email} />
          {profile.redator && <ProfileDocumentsSection documentos={profile.redator.documentos} />}
        </div>
        <div className="flex flex-col gap-4 xl:order-1">
          <ProfileIdentityCard profile={profile} />
          {profile.redator && <ProfileSummaryCard redator={profile.redator} />}
        </div>
      </div>
    </ModulePage>
  )
}
