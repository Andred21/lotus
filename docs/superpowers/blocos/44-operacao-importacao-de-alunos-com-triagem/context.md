---
schema_version: 1
packet_id: lotus-44-operacao-importacao-de-alunos-com-triagem-20261031
block_id: 44-operacao-importacao-de-alunos-com-triagem
status: partial
generated_at: 2026-10-31T12:45:48-03:00
base_ref: main
base_commit: 8c1659d6e8cf27f84921b3cca5f3911903f0c18e
state_path: null
state_blob_sha: null
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 8cc25754b7ab109fdd28040e6693713cda0c91cf
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Importação de alunos com triagem

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
> Gerado pela rota "Codex indisponível" (`mcp__codex__codex` ausente na discovery): três
> `contexto-leitor` somente-leitura (backend, frontend, fontes externas), fundidos aqui.

## Scope

**Goal:** upload de planilha vira prévia sem escrita, triagem no diálogo (excluir, corrigir, ver
cadastro/empresa atual, confirmar troca de empresa) e confirmação que persiste com revalidação no
servidor pelo `EnrollStudentAction`; modelo de planilha baixável.
**Non-goals:** colunas novas; importar para várias turmas; mudar o teto de 100 linhas.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| J-44 | instrução do João | ficha `## 44.` em `docs/superpowers/backlog.md` (cópia de trabalho do main tree, 2026-10-31) | 2026-10-31 | ok | escopo, decisões em aberto, DoD |
| D-req | Google Drive | `1Yk2qFtSBxasiMVatzWzIeipAKeXu5di5` requisitos-negocio.md | 2026-10-24T17:47Z | ok | aluno ↔ cliente, formatos |
| D-req-old | Google Drive | `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` requisitos-negocio.md (homônimo, outra pasta) | 2026-08-22T08:09Z | ok na busca, conteúdo não lido | só registro da duplicata |
| N-722 | Notion | página `388bc960-3dfa-81ef-b0ca-e55624c8464a` (base `e64b7d57-d000-4433-b652-a410e75193cc`) "Action de import xlsx/csv → alunos" | 2026-07-27T15:12Z | ok, corpo vazio | critério histórico backend |
| N-742 | Notion | página `388bc960-3dfa-814c-9c9e-e7028d20cd6e` (mesma base) "Aba Alumnos: upload de planilha + preview de import" | 2026-07-27T15:15Z | ok, corpo vazio | critério histórico frontend |
| R-be | repositório | `ImportStudentsAction`, `SpreadsheetRowReader`, `StudentResolver`, `EnrollStudentAction`, `StudentClientLinkService`, `EnrollmentController` em 8c1659d6 | — | ok | contrato atual |
| R-fe | repositório | `ImportDialog`, `useImportStudentsFlow`, `useEnrollStudentFlow`, `MoveConfirmDialog`, `shared/ui` em 8c1659d6 | — | ok | contrato atual |

Nenhuma task Notion 1:1 do bloco 44 (esperado). Nenhum modelo de planilha no Drive.

## Key facts

1. Hoje o import é **por linha, sem transação global**: `ImportStudentsAction` materializa as
   linhas (teto recusa antes de gravar), chama `EnrollStudentAction` por linha (que abre a
   transação e o lock da turma) e transforma `ValidationException` em `ImportRowErrorData`; a troca
   de empresa só aparece em `moved[]`, já gravada. `[R-be]`
2. `SpreadsheetRowReader` usa OpenSpout (instalado), aceita XLSX e CSV por MIME de conteúdo, lê
   só a 1ª aba, ignora a linha 1 (cabeçalho D1) **sem validar nomes**, mapeia por posição
   RUT/Nombre/Email/Teléfono e não tem constante do cabeçalho. `MAX_LINHAS = 100` (custo bcrypt
   por aluno novo vs. 30s). `[R-be]`
3. Validação por linha mora em `StudentResolver::resolveByRut`: RUT, tipo aluno, e-mail
   obrigatório e teto de nome **só para aluno novo**, colisão de e-mail. Aluno existente tem nome,
   e-mail e telefone da planilha **ignorados** (só restaura soft-deletado e vincula).
   `previewByRut` é somente leitura, sem checar matrícula na turma. `[R-be]`
4. `StudentClientLinkService::link` é a única escrita de `student_client_logs`: fecha o log aberto,
   abre novo, atualiza `current_client_id`. `EnrollPreviewData` (`will_move`, `current_client`,
   `previous_client`) existe para a matrícula avulsa, sem "já matriculado nesta turma". `[R-be]`
5. Rotas atuais: `GET turmas/{turma}/alunos/preview` (1 RUT) e `POST turmas/{turma}/alunos/importar`
   (`throttle:import`), sob `permission:operation.enrollment.manage`; não há rota de prévia de
   planilha nem de modelo. Rota nova com upload entra nas catracas de upload e rate limit; Action
   nova que recebe `Turma` entra no `ParentLockOnChildWriteTest`. `[R-be]`
6. Frontend: `ImportDialog` é `AppDialog size="sm"` com 2 estados (upload, resumo); hook com um
   mutation só; nenhum teste próprio. Não há tabela editável em `shared/ui`; `MoveConfirmDialog` é
   presentacional de um aluno. Não há helper "salvar blob como arquivo" — `AppDownloadButton` só
   abre URL e `useBlobTabOpener` abre aba. `[R-fe]`
7. Requisito canônico: todo aluno pertence a 1 cliente por vez, com histórico (log) dos anteriores;
   troca feita "pelo admin ou sistema", **sem exigir confirmação**; cadastro "através de arquivos
   (xlsx, csv, ...)". `[D-req]`
8. Critérios históricos: N-722 "import cria/associa alunos do cliente da cotação"; N-742 "upload de
   planilha com preview antes de persistir" — marcada Concluída sem prévia real no código. `[N-722]`
   `[N-742]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Prévia antes de persistir | N-742 pede prévia; tarefa Concluída | código grava no upload; bloco 44 cumpre o critério | J-44 (ficha nova do João) + R-be |
| Confirmação de troca de empresa | D-req não exige confirmação, só log | triagem confirma a troca antes de gravar; log preservado | J-44 (decisão mais recente do João; D-req não proíbe) |
| Formato | D-req cita xlsx e csv | leitor já aceita os dois; o modelo em aberto | unresolved — decisão do brainstorming (J-44) |
| Requisito canônico duplicado | D-req e D-req-old homônimos | usado o de 2026-10-24 | unresolved — confirmar com o João qual é o canônico |

## Constraints

- Leis §5: sem Repository; auditoria na aplicação; `generated.ts` só por `typescript:transform`
  com consumidores no mesmo commit; erros via `ValidationException` (RFC 7807), nunca `abort`.
- `EnrollStudentAction` segue fonte única da matrícula; a confirmação revalida tudo no servidor.
- DTO: saída com `XData`, coleção de saída `#[ReadOnlyCollection]`, coleção de entrada nasce
  `Optional` (`PersistenceLawsTest`); mensagens por `__()` com paridade en/es_CL/pt_BR.
- Front: sem PrimeReact direto nem import entre features; estado e mutations em hooks; componente
  ≤ 150 linhas; upload só por `postMultipart`; `AppDialog` em sm|md|lg (maximiza só lg);
  estilo por tokens de tema; i18n nos 3 locales.
- Teste de integração sqlite, sem mock; DoD exige upload sem escrita provado por contagem.

## External acceptance signals

- Nenhum sinal externo: tudo se prova no repositório e no navegador local.

## Open questions

- Prévia sem estado no servidor (cliente reenvia as linhas triadas em JSON) ou estado guardado
  (arquivo/token)? Decide DTO de entrada e a forma da revalidação.
- Linha corrigida de aluno já cadastrado: altera o cadastro ou só vale para aluno novo?
- Confirmação tudo-ou-nada ou por linha (hoje por linha)? Troca não confirmada: erro da linha ou
  recusa do lote?
- Modelo gerado pelo backend (OpenSpout Writer, cabeçalho como constante única com o leitor) ou
  estático; `.xlsx`, `.csv` ou ambos; entrega por blob autenticado exige helper novo em `shared/`.
- RUT duplicado dentro da mesma planilha: classe própria na prévia?
- `throttle:import` vale para a prévia?

## Deferred

- Validar nomes das colunas do cabeçalho D1 no leitor (hoje ignorado) — só se o brainstorming
  decidir.

## Staleness triggers

- A ficha `## 44.` mudar escopo, decisões ou DoD.
- `ImportStudentsAction`, `SpreadsheetRowReader`, `StudentResolver`, `EnrollStudentAction` ou
  `StudentClientLinkService` mudarem contrato antes da execução.
- O João apontar outro `requisitos-negocio.md` como canônico, ou ele contradizer a confirmação de
  troca.
- Uma decisão da tabela de divergências ser reaberta.
