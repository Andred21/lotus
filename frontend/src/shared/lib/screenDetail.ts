/**
 * O `detail` que pode ir à tela — o que o FRONT escreveu, e o que o servidor
 * escreveu em três status.
 *
 * **A política anterior calava o servidor inteiro** e a razão dela foi paga: o
 * `ProblemDetails` devolvia `title` e `detail` literais em português, e desde o
 * bloco `hardening-i18n-e-erros-api` (2026-08-29) o envelope sai de `lang/` e
 * responde ao `Accept-Language`. O que faltava era decidir se o `detail` do
 * SERVIDOR substitui a dica do i18n em erro de CARGA. Decidido em 2026-09-02
 * (P-70): substitui, nos status em que o backend PROVA que o texto é localizado.
 *
 * **Por que status, e não tipo de envelope:** o `ProblemDetails.php` escolhe o
 * `detail` por TIPO de exceção, e só três caminhos passam por chave de `lang/` —
 * forbidden (403), not found (404) e `ThrottleRequests` (429). O ramo `default`
 * devolve `getMessage()` CRU, e é por ele que sai o `CSRF token mismatch.` em
 * inglês do 419 (P-72, que segue aberta). A allowlist é fechada por desenho:
 * status novo não entra sozinho, atravessando sem ninguém decidir.
 *
 * **Quem fica de fora, e por quê:** 401 não vira estado de carga — o
 * interceptor do `shared/api/axios.ts` redireciona para o login antes. 422 não
 * entra porque o `FormErrorSummary` já imprime campo a campo, e a frase geral
 * ali seria eco.
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
  /** Status HTTP do envelope. Lido por DUAS políticas deste arquivo: a dica
   * (`loadErrorHint`) e a allowlist de `detail` localizado. Uma política, um
   * lugar, uma chave. */
  status?: number
}

/** Os status em que o `ProblemDetails.php` PROVA que o `detail` saiu de `lang/`.
 * Fechada de propósito — ver o docblock do arquivo. */
const DETALHE_LOCALIZADO = new Set([403, 404, 429])

export function screenDetail(problem: ScreenDetailSource | null | undefined): string | undefined {
  if (!problem) return undefined
  if (!problem.localDetail && !DETALHE_LOCALIZADO.has(problem.status ?? 0)) return undefined

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
