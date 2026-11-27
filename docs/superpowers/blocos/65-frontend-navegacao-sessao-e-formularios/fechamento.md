# Fechamento do bloco 65 — quadro por ID

Uma linha por ID da auditoria que o bloco fecha. Prova = teste (arquivo › nome), captura (caminho)
ou "veredito do João". Caminhos de teste relativos a `frontend/`.

**Passada visual e prova de navegador — 2026-11-27, no `/finalizar-bloco 65`.** A execução não
rodou a passada (a `lotus-ui-review` exige login manual e veda digitar credenciais nem dado de
negócio). Ela rodou no fechamento, na lane (offset +1, `main` mesclada em `acc3eaa7`), com
Playwright CLI direto por decisão do João: ele fez o login à mão; o rascunho do item 6 foi digitado e
descartado, sem nenhuma escrita na API. Vereditos visuais do João: **todos ok**, nas linhas abaixo.

| ID | O quê | Prova |
|---|---|---|
| C-1 | Sessão expirada volta ao login com a URL inteira | `src/shared/api/authErrors.test.ts` › "401 em rota autenticada expira a sessão", "419 duas vezes expira, sem repetir uma terceira"; `src/app/router/AppRouter.test.tsx` › "login devolve à URL com search"; `src/features/identity/components/Login/LoginPage.test.tsx` › "tela de login mostra aviso de sessão expirada"; `src/features/identity/api/authApi.test.tsx` › "login de outro usuário não herda o cache do anterior" |
| D-1 | Painel refaz ao voltar à aba | `src/app/pages/Dashboard/useDashboard.test.tsx` › "foco na janela refaz o painel" |
| D-9 | Troca de período sinalizada | `src/app/pages/Dashboard/useDashboard.test.tsx` › "troca de período devolve refreshing até a query nova resolver"; `src/app/pages/Dashboard/admin/AdminView.test.tsx` › "refreshing marca séries e rankings como ocupados e esmaecidos" |
| C-2 | Guarda de rascunho nos diálogos e formulários | `src/features/commercial/components/Budget/QuoteWizard.guard.test.tsx` › "wizard com mudança pergunta no Cancelar, e Descartar fecha", "o X do diálogo também pergunta"; `src/features/identity/hooks/useRedatorForm.test.tsx` › "com rascunho, a guarda abre o aviso em vez de seguir"; `src/features/operation/components/Turma/TurmaConfigCard.guard.test.tsx` › "com rascunho, pede confirmação à guarda e, liberado, chama onCancel com a navegação liberada" |
| A-10 | Enter envia o formulário do diálogo | `src/shared/ui/CrudDialog/CrudDialog.test.tsx` › "Enter num input envia, uma vez", "Enter em textarea não envia e não perde a quebra de linha", "Enter com o salvar em voo não reenvia" |
| C-7 | Erro de campo aninhado acessível | `src/shared/ui/CrudDialog/CrudDialog.test.tsx` › "leva o foco ao campo aninhado inválido quando `pending` cai", "sem campo inválido, leva o foco ao resumo de erros"; `src/shared/ui/FormField/FormField.test.tsx` › "o alert envolve a lista: a semântica de lista fica" |
| C-8 | Erro 422 some ao corrigir o campo | `src/shared/hooks/useCrudForm.test.ts` › "editar o campo limpa o erro 422 dele e só dele", "crud.clearField limpa a chave exata (edição aninhada, que não passa pelo `set`)"; `src/features/commercial/hooks/useClientForm.errors.test.tsx` › "editar um campo do contato limpa o erro dele, e só dele"; `src/features/catalog/hooks/useCourseForm.test.tsx` › "editar um campo do módulo limpa o erro dele, e só dele" |
| C-9 | Obrigatório marcado e motivo de botão desabilitado | `src/shared/ui/FormField/FormField.test.tsx` › "required põe asterisco e aria-required"; `src/features/certification/components/Historial/RevokeDialog.test.tsx` › "Revocar desabilitado mostra o motivo visível"; `src/features/certification/components/Emission/ConfirmIssueDialog.test.tsx` › "Emitir sem redator mostra o motivo visível"; `src/features/commercial/components/Budget/QuoteWizard.reason.test.tsx` › "Siguiente sem curso escolhido mostra o motivo visível"; visual: ok do João (2026-11-27, asterisco no "New client") |
| C-5 | Sucesso dito | `src/shared/hooks/useCrudForm.test.ts` › "criar e editar mostram toast de sucesso"; `src/features/commercial/hooks/useBudgetDetail.test.tsx` › "aprovar e rejeitar cotização mostram toast", "arquivar o orçamento mostra o toast de arquivado"; `src/features/certification/components/Historial/HistorialDialogs.test.tsx` › "revogar mostra toast e fecha o diálogo" |
| C-4 | Confirmação nomeia o registro | `src/shared/ui/ArchiveConfirmDialog/ArchiveConfirmDialog.test.tsx` › "confirmação de arquivar nomeia o registro, no título e no corpo"; `src/features/operation/components/Document/ConcludePanel.test.tsx` › "a confirmação de concluir nomeia a turma"; `src/features/commercial/components/Budget/BudgetDetailPage.gatilho.test.tsx` › "o botão do cabeçalho diz Arquivar, não Eliminar, e abre a confirmação"; visual: ok do João (2026-11-27: arquivar em `warning`, nomeando o registro) |
| C-6 | Erro do gate no diálogo, não no toast | `src/shared/hooks/useArchiveAction.test.ts` › "erro do gate vai ao diálogo, não ao toast"; `src/shared/ui/ArchiveConfirmDialog/ArchiveConfirmDialog.test.tsx` › "erro do gate aparece no diálogo, que fica aberto"; `src/features/commercial/components/Budget/BudgetOverlays.test.tsx` › "arquivar o orçamento dispara a ação do hook e mostra o erro do gate no diálogo"; visual: não alcançado na passada — o erro do gate só aparece arquivando registro com dependente, o que mexe em dado; coberto pelos testes citados (decisão do João, 2026-11-27) |
| A-2 | Nome truncado acessível (+ motivo de desabilitado, na C-9) | `src/shared/ui/IdentityCell/IdentityCell.test.tsx`; `src/features/catalog/components/Course/RedatorCard.test.tsx` › "selecionável: o botão não carrega filho focável nem grupo", "somente leitura: o nome truncado segue acessível por foco"; visual: ok do João (2026-11-27: uma parada de Tab por célula de identidade em `/personas?tab=students`) |
| C-3 | Estado da lista na URL e voltar pelo histórico | `src/shared/hooks/useServerTable.test.tsx` › "busca, página e sort vão à URL e voltam dela", "URL inválida cai nos defaults"; `src/features/certification/hooks/useHistorial.filters.test.tsx` › "estado, cotação, busca, página e sort vêm da URL, e o primeiro GET já sai com eles"; `src/features/operation/hooks/useTurmasArchived.test.tsx` › "archived=1 restaura o modo arquivado"; `src/shared/hooks/navigationHooks.test.tsx` › "volver com backTo volta no histórico e reencontra a busca"; `src/features/operation/components/Turma/TurmaCreatePage.test.tsx` › "salvar a criação substitui a entrada: voltar não reabre o formulário". Corte: `useArchivedPage` fica como está (lista de arquivados sem estado na URL) |
| C-11 | Aba na URL | `src/shared/hooks/navigationHooks.test.tsx` › "tab inválida ou invisível abre a primeira visível", "trocar de aba usa replace", "trocar de aba preserva as chaves da lista e o state do voltar" |
| A-1 | Borda de controle 3:1 no escuro | `tests/brand-theme.test.ts` › "borda de controle do escuro é #64748b — input, dropdown, checkbox e radio", "a hairline estrutural do escuro segue em #334155 — tabela, diálogo, paginador, menu, painel", "o slate-500 mede 3:1 (WCAG 1.4.11) sobre o card e sobre o fundo do escuro"; visual: ok do João (2026-11-27, borda de controle no escuro no "New client") |
| B-8 | Tag e folio com peso 600 | `src/shared/ui/RecordCode/RecordCode.test.tsx` › "RecordCode é 600"; `tests/brand-theme.test.ts` › "p-tag pesa 600"; visual: ok do João (2026-11-27, tags e folio em `/comercial`) |

O índigo de info (D7) fecha junto do gerador: `tests/brand-theme.test.ts` › "a tinta e a borda do
índigo medem AA sobre o fundo composto, nos dois temas"; `src/shared/ui/AppCard/AppCard.test.tsx` ›
"info compoe o fundo de --indigo-500, nao do celeste da marca (D7)".

D-6 — levado à ficha 67 (D13 da spec do 65)

## Critério de aceite (itens 3, 5 e 6 da §7 da spec do 64)

- **3 — gate verde**, contra o HEAD com a `origin/main` mesclada (`acc3eaa7`): `pnpm lint` 0,
  `pnpm test` 298 arquivos / 2466 testes, `pnpm build` 0, `bash .claude/tests/run-all.sh` 18
  arquivos sem falha. `php artisan test` não se aplica: o bloco não toca `backend/`.
- **5 — sessão expirada volta à mesma URL**: em `/personas?tab=students&q=an`, cookie
  `lotus_session_8081` apagado; a busca seguinte (`GET /api/students?…&q=a` → 401) levou a `/login`
  com "Your session expired. Sign in again to continue." e `state.from =
  "/personas?tab=students&q=a"`. Depois do login do João, `POST /api/login` 200 → `GET /api/me` 200 →
  `GET /api/students?page=1&per_page=10&q=a` 200: a tela voltou à URL inteira. Capturas:
  `visual/aceite5-1-antes-personas-students-q.png`, `visual/aceite5-2-login-sessao-expirada.png`.
- **6 — rascunho no `CrudDialog`**, "New client" em `/comercial?tab=clients`: sem alteração, Esc, X e
  Cancel fecham direto e o voltar do navegador navega sem perguntar; com "Legal name" preenchido,
  Esc, X, Cancel e voltar abrem "Discard changes?" (no voltar a URL fica parada), "Keep editing"
  preserva o rascunho e "Discard" libera a navegação. Nenhum POST/PUT/PATCH/DELETE na janela.
  Capturas: `visual/aceite6-{esc,x,cancelar,voltar}-com-rascunho.png`.

Sinal alheio ao bloco, visto no console da passada: React avisa `prevButton`/`nextButton` como prop
de DOM, vindo de `shared/ui/AppTabView/AppTabView.tsx:12-13,55-56` — nenhum commit do 65 toca o
arquivo. Registrado, não corrigido.

## Decisões do João no fechamento (2026-11-27)

1. Remover cotação segue em `danger`, com o corpo dizendo que dá para restaurar: **fica como está**.
2. `p-badge-info` e `p-tag-info` foram para tinta suave; as irmãs `success`, `warning` e `danger`
   **vão ao 66**.
