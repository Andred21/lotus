import { useCrudPage } from '@shared/hooks'
import { redatoresApi } from '@shared/api/redatoresApi'

/** Alias de página do recurso de redatores.
 *
 * Parece delegação vazia e não é: `useCrudPage` chama `resource.useList()` por
 * dentro, então **este arquivo é o que mantém a query fora do componente**.
 * Eliminá-lo moveria `redatoresApi` para dentro de `PeoplePage` — regressão
 * da fronteira zerada em 2026-08-03, e que passaria no lint antigo, porque o
 * seletor casava `redatoresApi.useList()` e não `useCrudPage(redatoresApi)`.
 * Esse escape foi fechado em 2026-08-04 (spec D5); o alias é o caminho suportado.
 *
 * `staleTime` de 30s: com o `renderActiveOnly` do TabView, trocar de aba
 * DESMONTA a anterior, e o default `0` do `AppProviders` com `refetchOnMount`
 * ligado faria cada volta pagar um GET novo — ida-e-volta 3× custaria 4 GETs
 * contra os 2 de antes da D-04. Trinta segundos é a janela de alternância de um
 * operador; criação e edição invalidam por `queryKey` e atravessam a janela,
 * então ela nunca segura dado que a própria sessão escreveu. */
export function useRedatoresPage() {
  return useCrudPage(redatoresApi, { staleTime: 30_000 })
}
