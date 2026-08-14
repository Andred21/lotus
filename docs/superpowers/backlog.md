# Backlog — Lotus v2

> Fila ordenada de trabalho futuro. Não representa a etapa atual e não deve ser usada por
> `/executar-bloco`. A seleção ou promoção de um item atualiza `state.md`.
> Itens presentes neste arquivo não estão ativos.
> Somente uma alteração explícita em `state.md` promove um item.

## Próximos blocos

1. **Arquivados e restauração de soft-delete**

    —  Notion: H.5.1–H.5.4

    Objetivo:
    tornar o lifecycle de archive/restore explícito e seguro por agregado.

    Ordem:
    1. semântica;
    2. Actions;
    3. endpoints;
    4. UI.

    Fora de escopo:
    - forceDelete;
    - exclusão permanente.
2. **Administração · Roles e permissões — redesenho de composição**
   — o protótipo tem layout dividido (lista de roles à esquerda; detalhe + matriz de permissões à
   direita, com marcação de permissão essencial); o real tem tabela + diálogo. **Não é refinamento
   visual, é redesenho de tela** — exige brainstorming. Task Notion relacionada: "Tela de
   Administração — Roles e Permissões". Respeitar ADR-07 (permissões essenciais não editáveis).
3. **Hardening**
   — ownership em rotas nested e política de retenção documental.
4. **UI · célula de identidade (avatar + título + descrição) como componente único**

   Pedido do João em 2026-08-14, com as duas capturas de tela do estado atual (coluna RAZÓN SOCIAL
   de `/comercial/clientes` e o subtítulo do `DetailHeader` de `/comercial/presupuestos/:id`).
   **A superfície abaixo foi MEDIDA no código em 2026-08-14, não herdada do pedido** — e a medição
   achou que **metade dos sítios não tem o dado que o componente pede**, o que é a decisão central a
   ser tomada no `/planejar-bloco`.

   **O que se quer.** O bloco `AppAvatar` + nome + linha secundária está copiado a olho em ≥8
   lugares, com quatro grafias diferentes do mesmo markup (`<div className="flex flex-col">` +
   `<span>` no `ClientsTable`; `<div>` + `<p className="font-medium">` + `<p className="text-xs">`
   nos três de `identity`; `min-w-0` + `truncate` só no `RedatorCard`; sem linha secundária nenhuma
   no `EnrollmentTable` e no `RedatorDesignation`). Vira **um** componente com duas formas:
   - **forma 1 (padrão, imagem 1)** — avatar na coluna 1; título e descrição empilhados na coluna 2;
   - **forma 2 (imagem 2)** — avatar, título e descrição na mesma linha.

   **Onde ele mora:** `shared/ui/`, não em feature. É apresentacional puro (recebe strings, não
   conhece DTO nem regra de domínio), então cabe na mesma prateleira de `DetailHeader`,
   `FormPhotoRow` e `PageHeader` — nome sem prefixo `App`, que neste repositório é reservado a
   wrapper de PrimeReact. A `descrição` precisa aceitar **`ReactNode`**, não `string`: o subtítulo
   do `TurmaDetailPage` carrega um `AppButton` de link para o orçamento.

   **Superfície medida — 13 sítios, em três grupos.** Os DTOs são de `shared/types/generated.ts`.

   *Grupo A — troca literal, o dado existe inteiro (4 sítios):*
   - `ClientsTable.tsx:53-67` (`ClientData`: `photo_url`, `legal_name`, `email`) — é o molde da imagem 1;
   - `StudentsTable.tsx:36-49` (`StudentData`: `photo_url`, `name`, `email`);
   - `RedatoresTable.tsx:37-50` (`RedatorData`: `photo_url`, `name`, `email`);
   - `UsersTable.tsx:37-50` (`UserData`: `photo_url`, `name`, `email`) — é a tabela de Administración.

   *Grupo B — o dado existe, mas não chega ao componente hoje (2 sítios):*
   - `BudgetsTable.tsx:88` — a coluna Cliente é `clients.clientName(b.client_id)`, string crua. A
     query já traz o `ClientData` **inteiro**; quem estreita é `useCommercialClients:19`, que expõe
     só o nome. Custo: expor o cliente no hook (frontend, sem backend);
   - `RedatorDesignation.tsx:73` (card dos designados) vs. `:38` (lista do picker) — o **picker** tem
     `RedatorData` completo (foto, e-mail, RUT), o **card** só tem `TurmaRedatorData { id, name }`.
     Dois sítios do mesmo componente com dado assimétrico.

   *Grupo C — o DTO NÃO tem foto e/ou descrição (5 sítios). Aqui está a decisão:*
   - `TurmasTable.tsx:73` (Cliente) — `TurmaData.client_name` é `string` e **não há `client_id` na
     `TurmaData`**, então nem um lookup local resolve: sem foto, sem e-mail, sem chave para buscá-los;
   - `TurmasTable.tsx:83-90` (Redator) — `TurmaRedatorData { id, name }`, e é uma **lista de N**,
     hoje renderizada como `redatores.map(r => r.name).join(', ')`. Uma célula de identidade por
     redator muda a altura da linha da tabela inteira;
   - `EnrollmentTable.tsx:63-71` (Alunos) — `EnrollmentData` tem `name`, `email` e `rut`, mas **não
     tem `photo_url`**;
   - `HistorialTable.tsx:51-59` (Aluno) — o dado é `c.snapshot.aluno`, um `SnapshotPartyData
     { name, rut }` **congelado no momento da emissão**. Puxar a foto viva do aluno para ilustrar um
     snapshot de documento com peso legal é misturar dado vivo com dado congelado — não é detalhe
     estético, é decisão de auditoria;
   - `EmissionStudentsTable.tsx:42-43` — `EmissionPanelEnrollmentData` tem `student_name` e
     `student_rut`, sem foto e sem e-mail; e as duas vivem hoje em **colunas separadas** com `field`,
     então aplicar o componente **funde duas colunas em uma** — não é troca literal de `body`.

   *Os dois da forma 2 (inline):*
   - `BudgetDetailPage.tsx:62-70` — `d.client` é o `ClientData` completo: foto e RUT disponíveis;
   - `TurmaDetailPage.tsx:77-99` — `client_name` cru, sem foto, e o subtítulo já é `ReactNode`
     (o link para o orçamento).

   **Sítios com a mesma forma que o pedido NÃO nomeia, medidos junto** — entram ou ficam fora por
   decisão do João, não por omissão: `RedatorCard.tsx:39-50` (catalog, avatar + nome + RUT + tag
   dentro de `AppSelectableCard`) e `UserMenu.tsx:62` (shell, avatar + nome no header).

   **Decisões que o `/planejar-bloco` tem de fechar (não decidir por heurística):**
   1. **Grupo C — fallback ou backend?** `AppAvatar` já degrada sozinho para as **iniciais** quando
      não recebe `image` (é o fallback duplo do docblock dele), então a forma funciona sem foto. O
      que não existe é a **descrição** em `TurmaData.client_name` e `TurmaRedatorData`. Alternativas:
      (a) descrição opcional — o componente aceita ausência e a célula fica só com avatar + título;
      (b) alargar os DTOs no backend — mexe em `generated.ts` (lei §5.3, ADR-04) e **sobe o risco de
      review**, num bloco que de outro modo é frontend puro.
   2. **`HistorialTable`** — foto viva sobre snapshot congelado: recomendação é **não**, com
      descrição = RUT do snapshot. Precisa ser decisão escrita, não default silencioso.
   3. **`TurmasTable` coluna Redator** — N redatores: empilhar N células, mostrar a primeira com
      "+2", ou manter texto e ficar fora do bloco.
   4. **`EmissionStudentsTable`** — fundir nome + RUT numa coluna só (o que o pedido implica) muda
      a tabela; as duas colunas de hoje usam `field`, que é o que alimenta ordenação.
   5. **`RedatorDesignation`** — o card e o picker ficam iguais na aparência com dado desigual
      (o card sem foto, o picker com), ou o card busca o `RedatorData` por id.

   **O que já está medido e NÃO precisa ser reaberto no planejamento:**
   - **Nenhum dos 13 arquivos passa da régua de 150 linhas** (maior: `EnrollmentTable` 137,
     `TurmaDetailPage` 141); a troca **encurta** todos.
   - **Teste de componente é viável, ao contrário do que a `frontend-fsliced.md` sugere:**
     `DetailHeader.test.tsx`, `BudgetDetailPage.test.tsx` e `TurmaDetailPage.test.tsx` já renderizam
     PrimeReact em jsdom e passam. O componente novo pode nascer com teste próprio — o DoD não
     precisa ser só visual.
   - **Os testes existentes das duas páginas de detalhe cobrem só os ramos sem entidade** (carga,
     falha, não encontrado): o ramo com dado — que é justamente onde o subtítulo muda — está sem
     cobertura hoje.
   - **`/lotus-ui-review` tem `disable-model-invocation: true`**: se a checagem visual entrar como
     gate, ela é passo **do João** na sessão interativa, como no `login-fora-do-adr16`. Planejar isso
     antes, não descobrir no gate.
   - **Sem chave de i18n nova prevista** — o componente recebe texto pronto. Se a decisão 1 criar
     rótulo de ausência ("sin correo"), aí são as 3 locales com chaves idênticas.

   **Ordem sugerida** (parte do bloco, não sugestão solta, quando promovido):
   1. componente em `shared/ui` + barrel + teste;
   2. Grupo A, os 4 sítios de troca literal;
   3. Grupo B (`useCommercialClients` expondo o cliente; `RedatorDesignation`);
   4. Grupo C, conforme a decisão 1;
   5. os 2 subtítulos na forma 2;
   6. gate: `pnpm build` + `pnpm lint` + `pnpm test`, mais a revisão visual do João.

   **Fora de escopo:** redesenho das tabelas, mudança de colunas além da fusão do item 4, e
   qualquer alteração de `AppAvatar` que não seja aditiva.

## Blocos de execução de dívida — BD-2..BD-7 (proposta de 2026-08-10)

> Agrupamento dos **débitos técnicos** desta página e das **pendências de código** de
> `docs/pendencias.md`, conferidos contra o código em 2026-08-10 (não herdados de relatório).
> Isto é fila, não autorização: nenhum BD executa sem promoção explícita em `state.md`.
>
> **Nada sai do lugar de origem ao entrar num bloco.** A linha do débito em `## Débitos técnicos`
> e a linha da pendência em `docs/pendencias.md` continuam onde estão, com o mesmo ID; só são
> removidas ou encerradas **depois** do bloco aplicado e do `/fechar-sprint` correspondente. Até
> lá, o BD é o ponteiro, não o novo dono do registro.
>
> Débito que já tem ID (`Q-*`, `B-*`, `P-*`) é citado pelo ID. Débito sem ID é citado pelo título
> em negrito da própria linha — **12 débitos desta página não têm número**, e numerá-los é decisão
> de formato do João, não do agente.
>
> Ordem entre blocos: resta o **BD-6**. O **BD-5** foi entregue em 2026-08-13 e saiu desta lista com
> os dois débitos que cobria por inteiro (a absorção do trio da foto nos 4 diálogos e os 4 hooks fora
> do `useCrudForm`, cada um com o critério agora decidido); do **Q-4** ele pagou só o lado do
> frontend, e o resíduo de backend — chave `#[Computed]` aceita no corpo com 200 em silêncio — ficou
> em `## Débitos técnicos`, remedido no fechamento. O **BD-4** foi entregue em 2026-08-13 e saiu desta
> lista com os três débitos que cobria (as 2 tabelas sem a `SearchableTableFrame`, a catraca do
> `max-lines` e o `FormErrorSummary` que faltava nos dois diálogos). O **BD-3** foi entregue em
> 2026-08-12 e saiu desta
> lista com os seis débitos que cobria (os três do piloto UI de Clientes, `Q-14`, `Q-15`, o CTA
> duplicado e a cor fora do corte do D18); a lacuna de alcance que ele deixou na catraca de cor —
> o shell fora de `COR_HARDCODED` — ficou na **P-34**. O **BD-8** e o **BD-9** nasceram depois
> (revisão de arquitetura do backend de 2026-08-12) e **não entram nessa ordem**: são backend,
> enquanto BD-5 e BD-6 eram frontend, e a fila deles era **BD-8 → BD-9** entre si — os **dois foram
> entregues em 2026-08-13** e saíram desta lista (`progress.md`), então a fila de backend está
> **vazia** e o que resta em fila é o `BD-6`, sozinho. Promoção segue sendo explícita do
> João, como sempre. O **BD-1** foi entregue
> em 2026-08-11 e saiu desta lista (`progress.md`); o **BD-2** foi entregue em 2026-08-11 e saiu
> junto — a decisão do 5.2b sobre `GET /api/roles`, que ele declarou fora de escopo, continua em
> `## Débitos técnicos`. O **BD-7** foi entregue em 2026-08-12, **fora da ordem escrita e por
> promoção explícita do João**, e saiu com o débito `last_login` que ele cobria; a retenção do dado
> pessoal que a tabela nova passou a guardar ficou na **P-33** (nasceu como segunda `P-30` e foi
> renumerada no fechamento do BD-3). A ordem dentro de cada bloco é parte
> do bloco, não sugestão.

### BD-6 · Falha que se disfarça de lista vazia

Bloco separado porque **muda comportamento de propósito** — nenhum DoD de "comportamento idêntico"
cabe aqui, que é exatamente por que o João o manteve fora do bloco de origem.

Cobre: **B-7**.

Ordem:
1. distinguir loading / erro-com-Reintentar / vazio de verdade no passo 1 do wizard de cotação;
2. os dois `?? '—'` da versão branda do mesmo padrão.

**Atualização de referência (2026-08-10, sem remover a original):** o `?? []` saiu de
`QuoteWizard.tsx:23` e hoje vive em `features/commercial/hooks/useQuoteCourseSearch.ts:15`, que
documenta o próprio débito no arquivo e **não** expõe `isError` de propósito; `QuotesList.tsx:33`
não existe mais — o `?? '—'` está em `useQuotesListCourses.ts:10` e `useCommercialClients.ts:19`.

### Fora dos BDs — travado em decisão do João

Não entram em bloco porque executar sem decisão é escolher no lugar dele: **Q-6** (idioma canônico
das `ValidationException` — PT em Commercial, ES em Operation, medido); **"Alunos · o dropdown de
empresa depende de uma permissão de outro módulo"** (RBAC/spec); a decisão do **5.2b** sobre
`GET /api/roles`; **"Decidir assimetria entre camadas"** (zero principais); **P-28** (fundo do
certificado, aceito como está);
**P-02** (retenção da auditoria) e **P-05** (consolidar migrations), os dois com gatilho "antes de
subir para produção".

**Atualização 2026-08-12:** o toggle da sidebar e o shell ADR-16 §4 **saíram** — o bloco
`estilizacao-adr16-shell-tipografia` os entregou (toggle ausente do DOM em compact com a pref
persistida intacta; shell inteiro em tokens do tema e a exceção do ADR-16 §4 revogada no ponto 5 do
próprio ADR). As duas linhas foram removidas daqui e de `## Débitos técnicos` no `/fechar-sprint`
de 2026-08-12, pela regra de origem acima.

## Módulos ainda não implementados (feature, não ajuste visual)

Hoje são `ModulePlaceholder` ou equivalente. A auditoria visual de 2026-07-24 os listou como
divergência crítica de UI; **não são** — são módulo a construir, e nenhum tem bloco definido.

- **Dashboard** — protótipo tem 4 KPIs, gráfico de turmas, gráfico de certificados, tarefas
  pendentes, alertas recentes e estados sem dados. Real: saudação + subtítulo (17 linhas).
- **Pessoas · Alunos**~~ — entregue em 2026-07-27 (`plans/archive/2026-07-27-bloco-alunos-modulo.md`).
- **Certificados** — entregue: backend no Bloco 7 (2026-08-07,
  `plans/archive/2026-08-05-certificacao-sprint-4.md`) e frontend em 2026-08-08
  (`plans/archive/2026-08-08-certificacao-frontend.md`).
- **Perfil do Usuário** - página dedicada para usuário (administrativo e redator), visualizando seu perfil e dados.

## Futuros dependentes de decisão

- **FUT-1:** templates de documento de turma gerados via código — o redator baixa o template
  pré-preenchido com dados da turma/alunos, preenche online ou à mão e sobe. Depende de desenho com
  a Lotus; abrir task no Notion e avaliar documentação Drive/local quando definido.
  **Interseção com o item 1 dos próximos blocos:** o manual em PDF/DOCX pré-preenchido é
  exatamente a fatia "baixa, preenche à mão, sobe" para o tipo `MANUAL`. O que continua futuro é
  o mecanismo genérico para os outros tipos (`PRUEBAS`, `EVALUACION_REDATOR`) e o preenchimento
  online.
- **FUT-2:** refino de ancoragem cross-módulo — link de dado compartilhado leva à página do módulo
  dono com a entidade selecionada, ou a exibe inline. O caso turma→orçamento já existe; o mecanismo
  genérico depende de decisão e task no Notion.

## Débitos técnicos

> Cada linha continua sendo o registro canônico do seu débito. A cobertura por bloco está mapeada
> em `## Blocos de execução de dívida — BD-2..BD-7`; entrar num BD **não** move nem apaga a linha
> daqui — a remoção acontece só depois do bloco aplicado e do `/fechar-sprint` correspondente.

- **Seis achados B de UI, todos PRÉ-EXISTENTES ao diff do BD-3 e nenhum em arquivo que ele tocou.**
  Saíram das duas passadas de `/lotus-ui-review` do bloco (gate da Task 8 e gate de fechamento,
  2026-08-12) e entram aqui porque o bloco os **encontrou**, não os criou. Relatórios em
  `.artifacts/ui-review/2026-08-12T19-41-45-bd3-gate-task8/` e
  `.artifacts/ui-review/2026-08-12T21-30-00-bd3-closure/` (diretório gitignored — a evidência é
  local, a linha é o registro durável).
  1. **Nome de arquivo truncado sem `title` nem quebra a 390x844** (`RedatorDialog`, seção
     DOCUMENTS) — o valor some sem mecanismo de leitura, que é a mesma classe do débito de campo
     desabilitado que o BD-3 pagou, num controle que ele não cobria.
  2. **Plural cru em duas das sete tabelas** — "3 course(s)" e "1 user(s)" contra "4 clients",
     "7 instructors" e "6 budgets". Rodapé do `AppDataTable` alimentado por chave sem plural i18n.
  3. **Menu recolhido a 390 tira o rótulo do DOM e deixa só `title`** — no toque não há hover, então
     o nome do item de navegação fica inalcançável.
  4. **Cada montagem de página com abas busca as DUAS abas** — custo de rede dobrado na abertura de
     `PeoplePage` e `CertificatesPage`; sem falha funcional, mas mensurável.
  5. **Bloco de erro bilíngue com caminho de campo cru na tela** — título vem do i18n do front e
     segue a sessão (`Could not load the data`), corpo vem do `detail` do RFC 7807 e chega sempre em
     espanhol, citando `aluno.name` (que ainda por cima é português). Medido no estado de erro real
     do `LOT-2026-1001` em `/certificados`.
  6. **A linha do certificado corrompido mostra a célula de aluno vazia, sem o travessão** que o
     modo leitura do próprio BD-3 usa para ausência — a lista não distingue "sem nome" de "campo
     faltando", e é o único lugar onde o registro aparece antes do clique. O diálogo do mesmo
     registro explica a falha; a linha, não.

- **B-7 — falha de GET de cursos se disfarça de lista vazia no `QuoteWizard`.**
  `QuoteWizard.tsx:23` usa `courses.data ?? []`: um 403/rede na listagem de cursos deixa o passo 1
  sem nenhum curso, `canAdvance` nunca liga e **nenhuma mensagem aparece** — o usuário lê "não há
  cursos" onde houve falha. `QuotesList.tsx:33` tem a versão branda do mesmo (`?? '—'` no nome do
  curso). É a D16/D11 outra vez, agora em `commercial`; o `BudgetsTable.tsx:36` já trata (a falha da
  query auxiliar conta como falha da tabela). Achado B-7 do `/revisar-frontend` de `commercial`
  (2026-08-03), **mantido fora do bloco por decisão do João**: muda comportamento de propósito e não
  cabe num DoD de "comportamento idêntico". Saída: distinguir loading / erro-com-Reintentar / vazio
  de verdade, como já se faz nas tabelas.
  **Atualização de referência em 2026-08-10 (as citações originais ficam):** o `?? []` migrou de
  `QuoteWizard.tsx:23` para `features/commercial/hooks/useQuoteCourseSearch.ts:15`, que documenta
  este débito no próprio arquivo e **não** expõe `isError` de propósito; `QuotesList.tsx:33` não
  existe mais — o `?? '—'` vive em `useQuotesListCourses.ts:10` e `useCommercialClients.ts:19`.
  Coberto pelo **BD-6**.
- **Q-6 — idioma das mensagens de `ValidationException` é inconsistente no repo.** Commercial escreve em
  PT (`DeleteQuoteAction`, `DeleteClientContactAction`), Operation em ES (`Turma`, `ConcludeTurmaAction`)
  — o usuário chileno lê um ou outro conforme o endpoint. Pré-existente, não introduzido pelo bloco;
  levantado no segundo review (2026-08-01) porque o 422 novo de contatos tem uma única mensagem e ela é
  a que o cliente vê. Exige decisão do João sobre o idioma canônico antes de valer a pena unificar.
- **Guardrail das leis §5 (P-04).** Leis invioláveis hoje são instrução em `CLAUDE.md`, não mecanismo
  — "lei que precisa valer sempre quer Arch test ou hook, não parágrafo" (lição 14). Instalar Pest
  Arch tests cobrindo DDD-lite/sem-Repository, auditoria só na aplicação e demais leis testáveis no
  backend, mais `eslint-boundaries` para a regra de dependência do frontend (features não importam
  PrimeReact direto nem outra feature). Gatilho em `pendencias.md` P-04: reavaliar em 2026-08-15.
- Decidir assimetria entre camadas: a UI não consegue voltar a zero principais, mas o backend
  aceita zero.
- Consolidar as migrations adicionais nas originais antes de subir para produção, conforme decisão
  do João no Bloco 2.
- Bloco 5.2b (minors do review final) — **só a decisão do João continua aberta:** `GET /api/roles`
  permitir a admin comum enumerar permissões do superadmin enquanto `/api/permissions` é
  superadmin-only. A parte de teste desta linha e a linha inteira do **Bloco 5.2a** saíram em
  2026-08-11 com o BD-2 (`integridade-e-concorrencia-backend`).
- **Alunos · o dropdown de empresa depende de uma permissão de outro módulo.** O módulo de alunos
  inteiro é gated por `identity.user.*` (D8 da spec, e é o que o `StudentController` exige), mas o
  dropdown de empresa do create lista via `clientsApi`, que exige `commercial.client.view`. Quem tem
  `identity.user.create` sem `commercial.client.view` consegue criar aluno pela API e não consegue
  pela tela. Duas tentativas de contornar na UI foram revertidas por serem piores que o problema
  (gate duplo no botão escondia a ação de quem tinha autorização real, `3e0bc36`; travar o submit
  por `isError` bloqueava com lista utilizável em cache, `03280c6`). O estado atual é o menos ruim:
  a falha fica **visível** (dropdown desabilitado + motivo + "Reintentar"), não escondida.
  **Alinhar de verdade exige decisão do João sobre RBAC/spec** — endpoint de clientes sob
  `identity.user.view`, permissão nova, ou aceitar o acoplamento. Levantado no `/revisar-sprint` do
  `bloco-alunos-modulo` (2026-07-27); movido para cá para não morrer no arquivamento do `state.md`.

- **O backend aceita `photo_url` no corpo da escrita e devolve 200, em silêncio.** Resíduo medido do
  Q-4 (review de 2026-08-05), que o **BD-5** fechou **só do lado do frontend**: `FORBIDDEN_PAYLOAD_KEYS`
  no `useCrudForm` faz a chave lançar em DEV, então o `...form` ingênuo não a reintroduz mais. O
  defeito do outro lado continua vivo e foi **remedido no `/fechar-sprint` de 2026-08-13**, não
  herdado: `PUT /api/students/37` com `"photo_url":"http://evil/x.png"` no corpo devolve **200**, e o
  campo volta `null` na resposta — a promoção no construtor do DTO desvia do `CannotSetComputedValue`,
  então o campo `#[Computed]` é ignorado sem 422. Vale para os quatro DTOs com foto, não só o
  `ClientData` que o texto original do Q-4 nomeava. **Uma afirmação do Q-4 original não sobreviveu à
  medição da spec do BD-5:** `photo_url` **não** carrega path interno de storage — o
  `SignedUrlTransformer` roda na serialização e o front recebe URL pré-assinada. O BD-5 era
  frontend-only por escopo declarado e não podia tocar backend. Saída: o próximo bloco de backend que
  tocar DTO com campo `#[Computed]` decide se chave computada no corpo vira 422 ou segue ignorada em
  silêncio. **Os outros dois achados de 2026-08-05 foram fechados pelo bloco `guardas-que-faltam` em
  2026-08-11:** (Q-2) o barrel `shared/hooks/index.ts` parou de exportar `unclassifiedPayloadKeys`,
  `MutableResource` e `CrudFormOptions`; (Q-3) chave declarada em `mapped` **e** em `summaryOnly`
  passou a reprovar.

- **`UpdateStaffUserAction` apaga o `rut` do staff num `PUT` que só o OMITE.** `UserData::$rut` é
  `Optional`, e a Action traduz `Optional` para `null` antes de gravar
  (`($data->rut instanceof Optional || $data->rut === null) ? null : $data->rut`): quem manda o
  formulário sem a chave zera o RUT de um usuário que tinha. É a mesma classe do defeito que o
  bloco `contrato-de-entrada-identidade-e-nested` fechou nas coleções nested — omissão virando
  apagamento —, num campo escalar. **Pré-existente e fora do escopo daquele bloco**, que só
  atravessou o arquivo para trocar a checagem de unicidade pela porta única; declarado no relatório
  de execução de 2026-08-13 e registrado aqui na correção do review do mesmo dia. Saída: o próximo
  commit que tocar a escrita do staff decide entre preservar o valor atual quando a chave falta e
  exigir a chave no `PUT` — decisão do João, porque muda contrato de entrada. DoD é o teste que
  mostra o RUT sobrevivendo à omissão, não o `if` novo.
