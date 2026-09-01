/**
 * O `detail` que pode ir à tela — e só vai o que o FRONT escreveu.
 *
 * **A razão original foi paga e esta política sobreviveu a ela.** O
 * `ProblemDetails` do backend devolvia `title` e `detail` literais em
 * português; desde o bloco `hardening-i18n-e-erros-api` (2026-08-29) o
 * envelope inteiro sai de `lang/` e responde ao `Accept-Language`. O que
 * ainda não foi decidido é se o `detail` do SERVIDOR deve substituir a dica
 * do i18n em erro de CARGA — é mudança de política de tela, não de backend, e
 * está registrada como pendência própria.
 *
 * Os envelopes que o PRÓPRIO front sintetiza (rede caída, corpo não-parseável)
 * seguem indo à tela: eles já são i18n e dizem coisa distinta da dica genérica
 * — `common.unexpectedErrorHint` é "não deu para processar a resposta", que o
 * `common.loadErrorHint` ("verifique sua conexão") não diz.
 *
 * **A exceção declarada é uma só:** o `CertificateViewDialog` imprime o `detail`
 * cru, porque `CorruptedSnapshotException` implementa `PublicDetail` de
 * propósito para o suporte descobrir QUAIS campos do snapshot faltam (D8 da
 * spec de certificação). Ele não chama esta função, e isso está comentado lá.
 */

/**
 * A forma mínima que a política lê. **Estrutural de propósito:**
 * `shared/ui/AppDataTable` tipa o `error` dele assim justamente para não
 * importar de `shared/api` (decisão registrada em `AppDataTable.tsx:16-18`), e a
 * política não pode ser o que quebra essa fronteira. `ProblemDetails` a satisfaz.
 */
export interface ScreenDetailSource {
  detail?: string | null
  localDetail?: true
  /** Status HTTP do envelope. Só a DICA o lê — o `detail` do servidor segue
   * calado, mas a CAUSA da falha continua vindo dele. */
  status?: number
}

export function screenDetail(problem: ScreenDetailSource | null | undefined): string | undefined {
  if (!problem?.localDetail) return undefined

  // `''` devolvido cru não dispara o `?? hint` do chamador, e a tela mostraria
  // um erro sem texto. Erro nunca é só cor nem só ícone (peso legal).
  return problem.detail?.trim() ? problem.detail : undefined
}

/** As dicas que uma falha de CARGA pode mostrar. Chave, não texto: a tradução é
 * de quem imprime (`t(loadErrorHint(problema))`), e assim a política não precisa
 * importar o i18n dentro de `shared/lib`. */
export type LoadErrorHintKey =
  | 'common.loadErrorHint'
  | 'common.forbiddenHint'
  | 'common.notFoundHint'
  | 'common.invalidDataHint'

/**
 * A dica que acompanha a falha, escolhida pelo STATUS.
 *
 * `screenDetail` cala o `detail` do servidor porque ele não é localizado — mas
 * o envelope distingue mais que língua: distingue CAUSA. Com uma dica única,
 * um 403, um 404 e um 422 saíam todos como "revise sua conexão", que é
 * instrução errada e deixa quem lê sem ação. O default segue sendo a dica de
 * conexão: é a certa para rede caída, 500 e para tudo que não se sabe nomear.
 *
 * 401 não entra: sessão expirada não chega a virar estado de carga — o
 * interceptor do `shared/api/axios.ts` redireciona para o login.
 */
export function loadErrorHint(problem: ScreenDetailSource | null | undefined): LoadErrorHintKey {
  switch (problem?.status) {
    case 403:
      return 'common.forbiddenHint'
    case 404:
      return 'common.notFoundHint'
    case 422:
      return 'common.invalidDataHint'
    default:
      return 'common.loadErrorHint'
  }
}

/**
 * A mensagem que a tela imprime numa falha de carga: o detalhe que sobreviveu ao
 * `screenDetail`, ou a dica traduzida quando ele calou.
 *
 * As duas metades já nasciam num lugar só; a JUNÇÃO delas estava escrita à mão
 * em 13 sítios de 8 componentes, e o par `?? t(...)` é justamente onde a
 * política some se alguém trocar a ordem ou esquecer o `??` — a tela mostra
 * erro sem texto, que é proibido (peso legal).
 *
 * Recebe `t` por parâmetro, e não importa o i18n: `shared/lib` não conhece
 * i18next, pelo mesmo motivo que `loadErrorHint` devolve CHAVE e não texto.
 *
 * QUANDO imprimir continua sendo de quem imprime — o gate é `isError`,
 * `loadError`, `failedWithoutData` ou `nameLost`, conforme o que a falha custou
 * NAQUELA tela, e essa escolha não cabe aqui.
 */
export function loadMessage(
  state: { errorDetail?: string | null; errorHint: string },
  t: (key: string) => string,
): string {
  return state.errorDetail ?? t(state.errorHint)
}
