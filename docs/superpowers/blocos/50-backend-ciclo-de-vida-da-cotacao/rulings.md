# Bloco 50 — rulings da execução

Decisões do controlador durante a `subagent-driven-development` (2026-11-02 a 2026-11-03). Uma por linha, cada uma com o custo se estiver errada.

## Pedem o João

- **[pede o João] I-2, cotação não aprovada com turma viva em produção.** A revisão final apontou que um dado legado pode ter cotação `pending` ou `rejected` com turma não arquivada. O `lockToEdit` / `lockToReject` não foi desenhado para esse estado. Saber se ele existe exige leitura no banco de produção, que é ação fora da worktree e efeito externo que o estado não autoriza, então ficou fora da onda de correção. Consulta sugerida, só leitura: `SELECT q.id, q.status FROM quotes q JOIN turmas t ON t.quote_id = q.id AND t.deleted_at IS NULL WHERE q.status <> 'approved' AND q.deleted_at IS NULL;`. Custo se errado: a guarda não cobre a recusada/pendente legada com turma viva. A matriz D2 trataria a cotação como sem turma.
- **[pede o João] M-7, "Turma:" ao lado de "class/clase".** A tag do front mantém "Turma:" em en e es-CL (spec D7, decisão do João). As mensagens novas do backend dizem "class" em en e "clase" em es_CL (ruling abaixo). Na tela en aparecem lado a lado "Turma: In progress" e "…has an active or concluded class…". Não mudou sem o João. Custo se errado: vocabulário misto na mesma tela.
- **[pede o João] Campos travados sem explicação no wizard.** Na edição `onlyUf`, os campos ficam `readOnly` sem texto dizendo por quê. Explicar exige chave nova de locale e texto que a spec não aprovou. Custo se errado: o usuário não sabe por que só a UF edita.

## Processo

- **Pipeline de profundidade 1 nas Tasks 3→4→5 (G1).** O revisor de cada task trabalhou numa worktree destacada no commit dela enquanto a task seguinte rodava. Os arquivos eram disjuntos, então isso economizou espera. Custo se errado: um achado de revisão chega com a task seguinte já empilhada. Não deixou resíduo: as duas correções (Tasks 3 e 4) entraram em commit próprio.
- **I-2 fora da onda de correção final.** Ver acima. Custo se errado: o mesmo da linha do I-2.
- **Onda de correção final única.** Cobre I-1 (docblock da ordem de lock D4, que estava invertido), M-1 e M-2 (docblocks de `DeleteQuoteAction` e `RestoreQuoteAction`), M-3 (no-op idempotente em `DeleteBudgetAction`, com red real), M-4 (RF1 com editar e "não grava"), M-5 (aprovar e arquivar aprovada com turma dão 422) e a tag curta. Os testes de M-4 e M-5 passaram de primeira porque o código já recusava: são cobertura, não correção. A re-revisão deixou o M-4 parcial: no verbo arquivar, o teste não pegava um segundo soft-delete. A rodada 2 (`3f40ca98`, só teste) passou a afirmar `deleted_at` e a contagem de audits `deleted` nos 4 verbos. O red foi provado com a recusa de arquivada desligada no guardião. Conferi esse diff eu mesmo, sem um novo re-revisor. Custo se errado: só churn.
- **Suíte PHP com 1 falha ambiental.** No HEAD `3f40ca98` foram 1693 passed, 7 skipped e 1 failed. A falha é o `CertificadoMatrizGotenbergTest`: o `pdftotext` passou do timeout de 60s com o swap do WSL cheio (4094/4096 MB, 4 stacks de pé). Isolado, passa (47 passed). O bloco não toca Certification nem `tests/Support`. Custo se errado: uma regressão real em Certification fica mascarada como ambiente. Uma rodada da suíte com as outras stacks paradas resolve.
- **Ficam do jeito que estão (triagem da revisão final):**
  - T1 M2: RF1 sem prova pela API;
  - T1 M4: chaves novas no topo do array;
  - T2: `cenario` com `Budget::count()+1`, provider sem `planned_end_date`, `Carbon::parse` com offset;
  - T3: "desta cotação" no `CreateQuote`, ratchet que pega o primeiro `->delete()`;
  - T4: TERCEIRO GATE antes do SEGUNDO, `course_id` com `!==` sem cast (M-6), sem teste recusar→aprovar→restaurar;
  - T5: docblocks reflowados tortos;
  - T6: `className` no `AppTag` (precedente em `QuoteRow.tsx:91`), lacunas de teste;
  - T7: datas travadas em ISO cru (coerente com `QuoteRow.tsx:60`), rodapé por `step===1`, que é inalcançável, sem teste da fiação `canManageApproved`, coberta no navegador;
  - docblock de lock sem citar `CreateTurmaAction`, que só faz INSERT.

  Custo se errado: dívida pequena que o `/revisar-bloco` pode reabrir.

## Backend

- **T3, docblock de `RestoreBudgetAction.php` fora dos Files.** Depois da task, o docblock dizia que "`DeleteBudgetAction` não toma lock", o que ficou falso. A spec (objetivo 6 / D9) pede docblock que diga o que o código faz. A revisão final conferiu as corridas: só sobra a do restore da cotação, que dá 422. Custo se errado: um arquivo a mais no commit da P-49.
- **T4, "clase" nas 4 mensagens novas em es_CL:**
  - `commercial.quote.turma_exists_cannot_reject`;
  - `turma_locks_field`;
  - `operation.turma.restore_quote_not_approved`;
  - `restore_course_changed`.

  Os vizinhos do backend e 25 chaves do front es-CL usam "clase". A spec §6 deixa o texto ao builder, e o plano fixou "turma" por engano. Custo se errado: trocar 4 strings de volta.
- **T4, "class" nas 2 mensagens commercial em en.** Estende o ruling acima. `operation` em en já usa "class". Aplicado em `c3783255`. Custo se errado: 2 strings.
- **T5, aresta `Commercial → Operation\Enums\TurmaStatus` em `DomainDependencyTest`, fora dos Files.** A D6 exige o enum no `QuoteData`. `Operation\Models\Turma` já estava liberado, e Identity e Certification já têm aresta igual. Custo se errado: reverter a linha, e o tipo vira string.

## Frontend

- **T6, `BudgetStatusCell.tsx` novo, fora dos Files.** A pilha de tags estourou o `max-lines` 150 do eslint em `BudgetsTable.tsx`. Custo se errado: reabsorver um componente.
- **T6, tag da tabela na forma curta `Cot N · Turma: …`.** Primeiro adotei o `code` completo (`Scap N - Cot M · Turma: …`), como o plano. Reverti depois da prova no navegador a 1024 px: a tag cabia na coluna, mas quebrava em 4 linhas e partia o código. O "Scap N" já está na 1ª coluna, e a spec D7, que é a autoridade, mostra a forma curta. Se `seq_in_budget` faltar, a tag cai no `code`. Custo se errado: voltar ao `code` completo.
- **T7, `readOnly` do `Field` nos campos travados por `onlyUf`, não `disabled` como o plano diz.** A justificativa é a BD-3 §4 / `FormField.tsx:11-30`: `disabled` trunca o valor e derruba o contraste, e `Field readOnly` é o idioma do repo. A catraca `DISABLED_READONLY` não serve de justificativa, porque só pega `disabled` ligado a `readOnly`. Custo se errado: trocar `readOnly` por `disabled` em 4 campos.
- **T7, curso travado: o wizard abre no passo 2, sem "Voltar".** O `CourseStep` não foi desabilitado. O plano deixa essa escolha ao builder, e o teste do payload prova que o curso não muda. Custo se errado: o `CourseStep` ganha `disabled`.
- **T7, `BudgetDetailPage.tsx` tocado, fora dos Files.** É o único chamador do `BudgetQuotesCard` e repassa `canManageApproved`. Custo se errado: nenhum além do arquivo no diff.

## Ambiente

- **`composer install` no container da lane.** Faltava `backend/vendor` na worktree. Custo se errado: nenhum (dependência local).
- **`migrate --seed --force` no MySQL da lane (+1).** Foi para a prova do DoD 4 no navegador. O banco de dev da lane estava sem migrations. Custo se errado: nenhum (banco descartável da lane).
