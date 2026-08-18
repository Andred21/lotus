/**
 * O `detail` que pode ir à tela — e só vai o que o FRONT escreveu.
 *
 * O `detail` do servidor não é apresentável hoje, e isso é medido, não suposto:
 * `backend/app/Shared/Exceptions/ProblemDetails.php` devolve `title` e `detail`
 * genéricos LITERAIS em português ("Erro interno", "Ocorreu um erro
 * inesperado."), apesar de o `SetLocale` já traduzir por `Accept-Language`.
 * Num 500 o cliente chileno lia português. Localizar o envelope é débito de
 * backend registrado no `backlog.md`; até lá, o corpo visível é dica do i18n.
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
}

export function screenDetail(problem: ScreenDetailSource | null | undefined): string | undefined {
  if (!problem?.localDetail) return undefined

  // `''` devolvido cru não dispara o `?? hint` do chamador, e a tela mostraria
  // um erro sem texto. Erro nunca é só cor nem só ícone (peso legal).
  return problem.detail?.trim() ? problem.detail : undefined
}
