# Backlog — Lotus v2

> Fila ordenada de trabalho futuro. Não representa a etapa atual e não deve ser usada por
> `/executar-bloco`. A seleção ou promoção de um item atualiza `state.md`.
> Itens presentes neste arquivo não estão ativos.
> Somente uma alteração explícita em `state.md` promove um item.

## Próximos blocos

1. **Pessoas · Alunos — módulo novo (backend + frontend)**
   — a aba Alunos de `PeoplePage` é um `<p>` inline; **não existe endpoint de aluno**. `grep student`
   em `routes/api.php` e `app/Domains/*/routes.php` = vazio; o domínio tem só
   `Identity/Models/Student.php` e `Identity/Services/StudentResolver.php` (consumidos pela
   matrícula). Escopo: `StudentData` + controller + rotas de listagem/detalhe, vínculos
   (`student_client_links`), histórico de turmas e certificados do aluno, mais a tela. Protótipo tem
   busca, tabela, indicadores, detalhe, vínculos, histórico e certificados. **Feature, não refino
   visual** (decisão do João em 2026-07-26, ao separar do bloco visual). Nasce já no padrão novo de `shared/ui`,
   entregue pelo bloco visual em 2026-07-27. Insumo pendente: print do protótipo (o João
   anexa) + Notion.
2. **Administração · Roles e permissões — redesenho de composição**
   — o protótipo tem layout dividido (lista de roles à esquerda; detalhe + matriz de permissões à
   direita, com marcação de permissão essencial); o real tem tabela + diálogo. **Não é refinamento
   visual, é redesenho de tela** — exige brainstorming. Task Notion relacionada: "Tela de
   Administração — Roles e Permissões". Respeitar ADR-07 (permissões essenciais não editáveis).
3. **Bloco 7 · Sprint 4 · Certificação**
   — templates, PDF e endpoint público QR. Contexto: `adrs.md` (ADR-08/10), `der-fisico`
   (`certificates`, `certificate_sequences`) e lição sobre snapshot do template no ato da emissão.
4. **Hardening**
   — ownership em rotas nested e política de retenção documental.

## Módulos ainda não implementados (feature, não ajuste visual)

Hoje são `ModulePlaceholder` ou equivalente. A auditoria visual de 2026-07-24 os listou como
divergência crítica de UI; **não são** — são módulo a construir, e nenhum tem bloco definido.

- **Dashboard** — protótipo tem 4 KPIs, gráfico de turmas, gráfico de certificados, tarefas
  pendentes, alertas recentes e estados sem dados. Real: saudação + subtítulo (17 linhas).
- **Pessoas · Alunos** — promovido a bloco próprio: ver **item 1** de "Próximos blocos".
- **Certificados** — já coberto pelo Bloco 7.

## Futuros dependentes de decisão

- **FUT-1:** templates de documento de turma gerados via código — o redator baixa o template
  pré-preenchido com dados da turma/alunos, preenche online ou à mão e sobe. Depende de desenho com
  a Lotus; abrir task no Notion e avaliar documentação Drive/local quando definido.
- **FUT-2:** refino de ancoragem cross-módulo — link de dado compartilhado leva à página do módulo
  dono com a entidade selecionada, ou a exibe inline. O caso turma→orçamento já existe; o mecanismo
  genérico depende de decisão e task no Notion.

## Débitos técnicos

- **Q-14 — `AppErrorState` não sinaliza "reintentando".** `AppErrorState.tsx:36`: o botão Reintentar
  não recebe estado de refetch nem `disabled`, então cliques repetidos disparam refetch em série sem
  nenhum feedback. Achado 🟢 do `/revisar-sprint` da Parte 4 (2026-07-27); o João optou por não
  corrigir na parte. Exige propagar `isFetching` do consumidor até o componente.
- **Q-15 — faixa de rodapé conta 0 durante o load inicial.** `AppDataTable.tsx:106`: `paginator`
  liga junto com `footerCount` mesmo em `loading`, então a faixa afirma "0 registros" sob a overlay
  do PrimeReact antes de o GET terminar. Cosmético; a overlay cobre. Achado 🟢 do `/revisar-sprint`
  da Parte 4 (2026-07-27), deferido pelo João.
- **Cor fora do corte do D18.** Os 6 diálogos de feature ficaram com cor Tailwind hardcoded
  (`text-slate-500`, `text-slate-400` no `RoleDialog`, entre outros) — o D18 cortou o escopo em
  `shared/ui` + os 3 arquivos do D14 de propósito. Achado Minor do review final da Parte 4, não é
  esquecimento.
- **Arquivo órfão no MinIO em rollback de transação.** `UploadFileAction::execute` grava no disco
  **antes** de inserir em `files`; `StoreRedatorDocumentAction:24` e `CreateRedatorAction:30` envolvem
  essa chamada em `DB::transaction`. Rollback derruba a linha e deixa o objeto no bucket — vazamento de
  storage e, pior, documento sem linha em `files`, logo sem auditoria e sem rastro (peso legal).
  Pré-existente desde `2fdbdea`, não introduzido pelo seeder; achado por revisão do Codex em
  2026-07-26 sobre o `OperationDemoSeeder`, que amplifica o caso ao envolver 17 uploads numa
  transação única. Saídas a avaliar: mover o upload para fora da transação com compensação, registrar
  a linha primeiro e gravar depois, ou `DB::afterCommit`. Interage com **P-02** (política de retenção
  nunca decidida).
- **Toggle da sidebar sem efeito abaixo de 1024px, corrompendo o estado persistido.** O D17 fez a
  `Sidebar` forçar `collapsed` por media query sem escrever no `uiStore`, então abaixo de 1024px o
  botão de toggle continua clicável, não muda nada na tela e ainda assim inverte o `sidebarCollapsed`
  persistido — o usuário volta ao desktop com a sidebar no estado oposto ao que deixou. Trade-off
  previsto e adiado de propósito pela Task 37 ("travar o toggle agora seria decisão nova"); achado
  Important do review final da Parte 4, **João decidiu manter como está em 2026-07-27**. Saídas a
  avaliar: esconder o toggle abaixo do breakpoint, ou desacoplar o colapso por viewport do estado
  persistido.
- **Shell fora de conformidade com o ADR-16 §4 — exceção deliberada.** `Sidebar.tsx` e
  `AppLayout.tsx` usam pares Tailwind de cor hardcoded (`bg-gray-200 dark:bg-slate-900`,
  `border-slate-400 dark:border-slate-800`, `bg-slate-50 dark:bg-slate-950`, `text-slate-400`) em vez
  das CSS vars do Lara. `AppHeader` não tem altura explícita e o logo usa `ml-15 h-30` (120 px).
  **Não corrigir sem decisão:** o João aprovou a aparência atual do shell (2026-07-26) e trocar por
  CSS var a mudaria. Registrado para que a divergência não seja lida como esquecimento.
- **`last_login` não existe** — nenhuma ocorrência em `backend/app/` nem em
  `backend/database/migrations/`; `UserData` não tem o campo. O "último acesso" que o protótipo mostra
  na tela de Usuários exige coluna nova, captura no login e exposição no DTO. Task de backend, não
  de UI.
- Check de paridade permissão↔i18n — teste/CI que assere
  `array_keys(PermissionCatalog::descriptions())` (dot→underscore) igual às chaves `perm.*` de cada
  locale; sem isso, permissão nova renderiza chave crua no picker.
- Unicidade de `client_addresses.is_primary` — mesmo gap que o Bloco 2 fechou nos contatos; ficou
  fora porque o contratante não pediu e a tela só edita o primeiro endereço.
- `ClientContactData.is_primary` tem default `false` não-`Optional` — `PUT /api/contacts/{id}` sem
  o campo rebaixa o principal em silêncio; rota ainda sem consumidor no frontend.
- Decidir assimetria entre camadas: a UI não consegue voltar a zero principais, mas o backend
  aceita zero.
- Consolidar as migrations adicionais nas originais antes de subir para produção, conforme decisão
  do João no Bloco 2.
- Bloco 5.2a (minors do review final): `SuperadminGuard` sem teste do caso superadmin inativo;
  `UserData::fromModel` chama `getRoleNames()` duas vezes; unicidade de RUT/email do
  `UpdateStaffUserAction` roda fora da transação; auto-colisão no update sem teste; teste do 422 de
  `redator` não afirma a chave `role`.
- Bloco 5.2b (minors do review final): testes de falha de `CreateRoleAction`/`UpdateRoleAction` não
  afirmam a chave do error-bag; decisão pendente do João sobre `GET /api/roles` permitir a admin
  comum enumerar permissões do superadmin enquanto `/api/permissions` é superadmin-only.
- Bloco visual · Parte 1 (Q-1 do `/revisar-sprint`, adiado pelo João em 2026-07-26): CTA duplicado
  quando `ClientsTable`/`BudgetsTable` estão genuinamente vazias — `AppCardToolbar` (`end={actions}`)
  e `AppEmptyState` (`action={actions}`) renderizam o mesmo botão nos dois lugares ao mesmo tempo.
  Não pegou no DoD porque o `OperationDemoSeeder` nunca zera as duas tabelas. Escolher um lugar só
  para o botão (`ClientsTable.tsx:36,59`, `BudgetsTable.tsx:69,94`).
