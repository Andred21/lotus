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
4. **Login · a tela que ficou fora do ADR-16**
   — evidência: `/lotus-ui-review` de 2026-08-12 sobre `/login`
   (`.artifacts/ui-review/2026-08-12T14-38-43-loginpage-wrappers/report.txt`, **2 C + 8 B**), mais a
   lente `frontend-design` aplicada por cima. O bloco `estilizacao-adr16-shell-tipografia` tocou
   `LoginPage.tsx` em **2 linhas** e o resto da tela ficou onde estava: é a única superfície do
   produto que não lê **nenhum** token do tema, medido — `--surface-ground`, `--surface-card`,
   `--text-color` e `--text-color-secondary` estão carregados nela e nenhum é consumido.

   **O argumento não é a lista de achados, é que a lista tem uma causa só.** A direção registrada
   fixou a assinatura do produto em *sidebar navy com wordmark* e a estética em "precisão
   instrumental técnico-regulatória". O login responde com **split-screen de gradiente celeste**, que
   é o default de tela de login SaaS e inventa uma segunda linguagem visual — inclusive uma segunda
   cor de marca, `#1b7fb8`, que não existe em `brand-theme.css` nem nas duas folhas geradas.
   Corrigir os dez achados um a um remenda sintoma; **trocar o painel de marca de gradiente para a
   navy `azul-poste` faz cinco deles caírem por construção**, porque a navy é superfície escura fixa
   nos dois temas e o `AppLogo` passa a usar `variant="on-dark"` por ser correto, não por remendo.

   Direção proposta (decisão do João no brainstorming — nada aqui está aprovado):
   - painel de marca em `--brand-navy`, mesma superfície fixa da sidebar; celeste deixa de ser campo
     e vira o único acento sobre ela;
   - painel do form em `--surface-ground` (humo) com o formulário num cartão `--surface-card`, que é
     a gramática de superfície de todas as outras telas;
   - `h1` no papel de display (`font-display`/Archivo 600, `tracking-tight`, `var(--text-color)`),
     igual ao `PageHeader` — hoje é `text-2xl font-bold` em Inter, que é exatamente o uniforme que a
     direção de 2026-08-11 existe para matar;
   - `v0.1.0` no terceiro papel tipográfico (IBM Plex Mono + `tabular-nums`): é o único artefato
     técnico da tela e hoje é Inter 12px a **2,79:1**. O papel do "voltímetro" nunca aparece na
     primeira tela do produto;
   - copy revista: "Ingresa tus credenciales" não diz nada que o usuário não saiba, e
     "¿Olvidaste tu contraseña?" promete um fluxo que não tem endpoint.

   Os dois **C** e os oito **B**, na ordem em que o relatório os classifica:
   - **C-1 — wordmark ilegível no tema claro**, 1,45:1 a 2,30:1 (tinta média `rgb(78,98,109)` sobre
     o gradiente). `AppLogo variant="auto"` escolhe o asset pelo **tema**; o painel é celeste nos
     dois. No escuro fica branco e legível — é seleção de asset, não qualidade do asset.
   - **C-2 — overflow horizontal a 390px** (`scrollWidth` 416 contra `innerWidth` 390), com o olho da
     senha fora da tela. Causa: `AppPassword` fixa `inputClassName="w-96"` (384px absolutos) enquanto
     o irmão `AppInputText` usa `w-full`. **É defeito do wrapper**: toda tela com `AppPassword` +
     `leftIcon` herda. Não cabe neste bloco se o BD-3 andar antes — decidir a ordem na promoção.
   - a tela não lê token nenhum: fundo branco em vez de humo `#f1f5f9` no claro, `slate-900` em vez
     de noche `#0b1220` no escuro, rótulos de campo em **preto puro** `rgb(0,0,0)` (sem classe de
     cor), `h1` em slate-800 e subtítulo em gray-500;
   - `h1` fora do papel tipográfico (Inter 700 contra Archivo 600 do `PageHeader`);
   - gradiente cravado em JS com `#1b7fb8` fora de qualquer fonte de verdade — mesmo modo de falha
     do D-P11 daquele bloco, que achou `#25A5E4` inline no `AppAvatar`; grep de hex não alcança
     template string em `.tsx`;
   - texto sobre o gradiente reprova AA: tagline **3,10:1** (16px) e versão **2,79:1** (12px). Branco
     cheio sobre o mesmo ponto ainda daria 3,46:1 — o problema é o par cor-de-fundo, não a opacidade;
   - "¿Olvidaste tu contraseña?" a **2,60:1** e fora da ordem de tabulação (é `<a>` sem `href`);
   - `AppPassword` mantém `aria-label="Show Password"` do default do PrimeReact com `lang=es-CL` —
     wrapper, não call site, e chega a toda tela com senha;
   - os dois campos sem `autocomplete` (`username`/`current-password`); o próprio Chrome registra o
     aviso no console;
   - a 390px o par idioma/tema divide a faixa vertical do `h1`, porque é `absolute top-4 right-4` do
     `main` e no layout de coluna o `main` começa logo abaixo do painel de marca.

   **O que o review confirmou funcionando, e que o bloco não deve regredir:** anel de foco
   azul-poste 2px visível nas seis paradas do Tab; botão primário celeste com texto navy e raio 4px
   saindo do tema; troca de idioma reformatando na hora.

   Fora de escopo declarado: fluxo de recuperação de senha (não tem endpoint — a decisão aqui é só
   o que a tela mostra enquanto ele não existe).

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
> Ordem entre blocos: **BD-3 → BD-4 → BD-5 → BD-6**. O **BD-8** e o **BD-9** nasceram depois (revisão
de arquitetura do backend de 2026-08-12) e **não entram nessa ordem**: são backend, enquanto
BD-3..BD-6 são frontend, e a fila deles é **BD-8 → BD-9** entre si. Qual das duas filas anda antes é
promoção explícita do João, como sempre. O **BD-1** foi entregue
> em 2026-08-11 e saiu desta lista (`progress.md`); o **BD-2** foi entregue em 2026-08-11 e saiu
> junto — a decisão do 5.2b sobre `GET /api/roles`, que ele declarou fora de escopo, continua em
> `## Débitos técnicos`. O **BD-7** foi entregue em 2026-08-12, **fora da ordem escrita e por
> promoção explícita do João**, e saiu com o débito `last_login` que ele cobria; a retenção do dado
> pessoal que a tabela nova passou a guardar ficou na **P-30**. A ordem dentro de cada bloco é parte
> do bloco, não sugestão.

### BD-3 · Faixa visível e acessibilidade dos diálogos (fronteira `shared/ui`)

Antes do BD-4 de propósito: mexe nos mesmos arquivos que o BD-4 vai fatiar, e extrair duas vezes é
desperdício.

Cobre: os **três débitos do piloto UI de Clientes** (tabela/estado vazio; foco e maximização sem
nome; campos desabilitados truncados) · **Q-14** (`AppErrorState`) · **Q-15** (`AppDataTable`) ·
**"Bloco visual · Parte 1 (Q-1 do `/revisar-sprint`)"** (CTA duplicado) · **"Cor fora do corte do
D18"**.

Ordem:
1. `AppDialog` — restaurar o foco ao disparador no `onHide` e nomear o controle de maximizar;
   conferido em 2026-08-10: o wrapper é uma linha (`<Dialog maximizable …/>`), sem `aria-label` e
   sem restauração. Corrige os 9 diálogos de uma vez;
2. modo leitura — valor completo legível e copiável em campo desabilitado (`ClientGeneralFields` e
   irmãos usam `disabled={readOnly}` puro), preservando os inputs no modo edit;
3. tabela e estado vazio dentro da faixa visível em `1024x768` e `390x844`, pela fronteira
   `shared/ui`;
4. **CTA duplicado** — escolher um lugar só; hoje `ClientsTable` passa o mesmo `actions` para o
   `emptyState` **e** para a toolbar da `SearchableTableFrame`, e `BudgetsTable` repete o padrão;
5. **Q-14** e **Q-15** no mesmo commit — os dois são estado de carregamento mentindo na tela
   (botão Reintentar sem feedback; paginador ligado com `footerCount` mesmo em `loading`);
6. cor Tailwind hardcoded nos diálogos de feature (**D18**), por variável do tema (ADR-16).

DoD: `/lotus-ui-review` nas três viewports fecha os seis de uma passada — comportamento na tela,
não lint verde.
Fora: o shell (`Sidebar`/`AppLayout`/`AppHeader`) — é exceção aprovada pelo João em 2026-07-26.

### BD-4 · Catraca do `max-lines` e adoção da moldura

**A premissa do débito da moldura venceu.** Conferido em 2026-08-10: a `SearchableTableFrame` **já
tem** o `filterSlot` e a bifurcação `noResultsFiltered`/`clearFilters`, entregues em `3c7cc20`
(2026-08-08) para a `HistorialTable`. O débito dizia que isso só aconteceria no mesmo commit da
primeira adoção; sobrou só adotar, e ficou barato.

Cobre: **"As 2 tabelas com dropdown não adotaram a `SearchableTableFrame`"** · **"Catraca do
`max-lines`"** · **"`StudentDialog` e `RedatorDialog` não têm `FormErrorSummary`"**.

Ordem (a adoção vem antes porque tira linha das tabelas antes de medir os diálogos):
1. `BudgetsTable` adota a moldura pelo `filterSlot`;
2. `TurmasTable` idem;
3. `StudentDialog` abaixo de 150 linhas, **pagando junto** o `FormErrorSummary` que falta — hoje o
   `summaryOnly: ['phone']` classifica certo e o 422 não aparece em tela nenhuma;
4. `RedatorDialog` abaixo de 150, mesmo pagamento;
5. `RedatorDocumentSlot` (175) e `BudgetDetailPage` (171);
6. cada arquivo sai dos `ignores` do `eslint.config.js` **no mesmo commit** da extração.

DoD: comportamento idêntico na tela; o 422 de `phone` aparecendo; `ignores` vazio ao fim.

### BD-5 · `useCrudForm` mais fundo

Depois do BD-4 por gatilho declarado: o débito do trio da foto entra "quando alguém tocar um desses
4 diálogos por outro motivo", e é o BD-4 que paga esse gatilho.

Cobre: **"O trio da foto é idêntico em 4 dialogs"** (a absorção; o teste saiu no bloco `guardas-que-faltam`, entregue em 2026-08-11) · **"Os 4
hooks de formulário que ficaram fora do `useCrudForm`"** · **Q-4** dos três achados de 2026-08-05
(`photo_url`/`photo_path` no corpo da escrita).

Ordem:
1. absorver o trio (`useEntityPhoto` + `afterCreate: photo.flush` + `FormErrorBanner` de falha
   bufferizada + `closeBlocked`) nos 4 diálogos;
2. migrar `useCourseForm` e `useQuoteForm`, os dois candidatos legítimos que ficaram fora por corte
   de escopo;
3. **Q-4** — guarda contra `...form` reintroduzir `photo_path` (hoje é path interno de storage, não
   URL) no corpo da escrita.

DoD: **foto real chegando no S3**, não lint verde — o caminho tem falha silenciosa conhecida
(lição 6). Fora por critério, não por escopo: `useRedatorForm` (multipart com chave polimórfica) e
`useTurmaConfigForm` (rota aninhada, não roda sobre `createCrudResource`).

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

### BD-8 · Rastro, unicidade e gate no eixo de peso legal (backend)

**Origem:** revisão de arquitetura do backend de 2026-08-12 (lente única, Claude Code; a segunda
lente do Codex foi recusada na chamada e o bloco não a herda). Achados 1, 2 e 3 do relatório —
todos com a medição reconferida no código pela sessão principal, não herdada do agente. Relatório
não versionado (`/tmp`, `architecture-review-20260812-backend.html`); a evidência que importa está
transcrita abaixo.

**Os três atacam a mesma superfície — quem pode assinar um certificado — e por isso andam juntos.**

Cobre:

1. **Escrita de pivot sem rastro.** `grep auditSync|auditAttach|auditDetach` em `backend/app/` →
   **zero**; os métodos existem em `vendor/owen-it/laravel-auditing/src/Auditable.php:683,709,747,789`.
   Cinco call-sites escrevem `turma_redator`/`course_redator` pela API crua:
   `Operation/Actions/DesignateRedatorAction.php:20`, `Operation/Actions/RemoveRedatorAction.php:13`,
   `Catalog/Http/Controllers/CourseRedatorController.php:18`,
   `Identity/Actions/CreateRedatorAction.php:61`, `Identity/Actions/UpdateRedatorAction.php:66`.
   As 19 asserções sobre `audits` em `tests/` não tocam nenhum dos dois pivots. `docs/der-fisico.md:49`
   **afirma o contrário** ("a designação usa `auditSync`") — doc e código divergem.
2. **`course_certificate_templates` sem unicidade.** Único par sequência-por-pai do schema sem
   índice: `database/migrations/2026_07_08_172639_courses.php:25` é `unsignedInteger('version')` cru,
   contra `(budget_id, seq_in_budget)`, `(turma_id, student_id)`, `(turma_id, redator_id)` e
   `(course_id, redator_id)`, que têm o seu. `CertificateTemplateData.php:20` é `#[Required] int
   $version` sem `rules()`. Com empate, `CertificateTemplateResolver.php:41-44`
   (`orderBy('version')->get()->keyBy('course_id')`) escolhe pela ordem que o banco devolver — e esse
   template decide `valido_ate` (`IssueCertificateAction:36-38`) e a cidade de emissão
   (`CertificateTemplateResolver:57`).
3. **Gate de turma concluída em cinco grafias, três caminhos sem gate.** Usam
   `Turma::assertAcademicallyWritable()` (`Turma.php:113`): `StoreTurmaDocumentAction:22`,
   `DeleteTurmaDocumentAction:17`, `RecordEnrollmentResultAction:14`. Escrevem a condição à mão, com
   quatro mensagens diferentes: `EnrollStudentAction:24`, `ImportStudentsAction:29`,
   `RemoveEnrollmentAction:13`, `ConcludeTurmaAction:23`. Não perguntam nada: `UpdateTurmaAction`,
   `DesignateRedatorAction`, `RemoveRedatorAction`. Os dois últimos são o furo com consequência
   medida — `UpdateTurmaAction:16-21` grava `local_aplicacao`, primeira fonte da cidade do
   certificado, e `DesignateRedatorAction` escreve o pivot que a porta 6 lê
   (`CertificateEligibility.php:118`).

**Decisões já fechadas com o João no grilling de 2026-08-12** (não reabrir no brainstorming; o que
não está aqui, sim):

- `auditSync`/`auditSyncWithoutDetaching`/`auditDetach` nos **cinco** call-sites — `course_redator`
  entra porque habilitação é porta de emissão pela RN-09.
- **Sem backfill.** O rastro começa no deploy; audit sintética inventaria `user_id` e data que
  ninguém executou, o que é falsificar evidência em tabela de peso legal.
- **A guarda entra no mesmo bloco:** teste que reprova `sync(`/`detach(` cru sobre `belongsToMany`
  em `app/Domains/`, no molde do `PersistenceLawsTest`.
- **`version` deixa de ser input** — derivada por `nextVersionFor(int $courseId): int` com
  `MAX(version)+1` sob `lockForUpdate`, na forma que o ADR-17 já provou em `seq_in_budget`. Custo de
  contrato medido como **zero**: `grep version frontend/src` não devolve nada e `templates` já fica
  fora do payload de curso (`useCourseForm.ts:13-14`).
- **`unique(course_id, version)` cru**, sem `deleted_at` na chave: número de versão não se
  reaproveita depois de arquivar, mesmo argumento do ADR-17. Banco de dev conferido em 2026-08-12:
  1 template, zero duplicatas — a migration sobe limpa.
- **`UpdateTurmaAction` fecha total** depois de concluída (as quatro colunas: `modalidade`,
  `local_aplicacao`, `start_date`, `end_date`). Se existir necessidade real de corrigir data
  pós-conclusão, ela vira caminho próprio auditado — **e isso é pergunta aberta do brainstorming**.
- **`RemoveRedatorAction` também fecha:** turma concluída com certificado emitido tem o redator no
  snapshot; remover depois cria contradição entre documento e registro.
- **Mensagem única.** As quatro mensagens inline morrem e sobra a do `assertAcademicallyWritable()`,
  nomeando o motivo. O `detail` do RFC 7807 muda em 4 telas — consequência aceita.

DoD: cada correção nasce de um teste visto **vermelho** — asserção sobre a linha em `audits` (não
sobre `assertDatabaseHas('turma_redator', …)`, que já passa hoje), duas versões iguais recusadas
pelo banco, e `PUT /api/turmas/{id}` + `POST /api/turmas/{id}/redatores/{redator}` sobre turma
concluída reprovando com 422.

Risco de review: **ALTO** — schema novo, peso legal e mudança de mensagem de erro.

### BD-9 · Contrato de entrada: identidade e coleção nested (backend)

**Origem:** mesma revisão de 2026-08-12, achados 4 e 5. Bloco separado do BD-8 de propósito: não
toca schema, não toca certificação, e fecha em review de risco menor.

Cobre:

1. **`provision()` fecha metade do invariante.** `UserProvisioner.php:30` chama
   `ensureRutAvailable()` por dentro e deixa `ensureEmailAvailable()` para o chamador. Quatro dos
   nove caminhos de escrita de identidade não chamam: `CreateClientAction.php:31`,
   `UpdateClientAction.php:35`, `CreateRedatorAction.php:50`, `UpdateRedatorAction.php:56`. Como
   `users.email` é `unique` (`create_users_table.php:19`), a colisão sobe `QueryException`, cai no
   `default` do `match` em `ProblemDetails.php:34-35` e vira **500 genérico** onde deveria ser 422
   com o campo. A assimetria já está escrita no próprio guardrail:
   `UniquenessInsideTransactionTest:49` passa `['rut','email']` para staff; `:68` e `:89` passam só
   `['rut']` para cliente e redator. `email` é `string` obrigatório nos dois DTOs — não há caminho
   nullable a tratar.
2. **`ClientData::$addresses` apaga a coleção por omissão.** `ClientData.php:42` é `array $addresses
   = []` e `rules()` declara só `rut` e `contacts`; `UpdateClientAction.php:52-55` apaga tudo e
   recria do payload, então a chave ausente soft-deleta todos os endereços em silêncio. O par certo
   está ao lado: `CourseData.php:37,40` são `array|Optional = new Optional` e
   `UpdateCourseAction.php:35,44` guardam o replace com `instanceof Optional`. `docs/der-fisico.md:103-106`
   é lei ("toda coleção nested read-write futura nasce `Optional`"), e o comentário de
   `ClientData.php:55-58` já nomeia o bug — a correção anterior blindou só `contacts`.

**Decisões já fechadas com o João no grilling de 2026-08-12:**

- Fechar **por dentro**: `provision()` passa a checar e-mail, e nasce
  `ensureIdentityAvailable(string $rut, string $email, ?int $exceptUserId = null): string` como
  chamada única dos caminhos de update. Corrigir call-site a call-site deixaria a interface exigindo
  memória — o quinto caminho que nascer esqueceria de novo.
- **O 422 é explícito sobre o registro arquivado** (o `ensureEmailAvailable` usa `withTrashed()`):
  ~10 usuários internos, não superfície pública — esconder transforma um erro acionável ("restaure o
  cliente") em beco sem saída.
- **`addresses` vira `Optional`**; `contacts` **migra junto** e mantém `min:1` só para quando a
  chave vier — "não mandei contatos" deixa de ser 422, "mandei lista vazia" continua recusado.
  Alinha com o padrão que o `CourseData` fixou.
- Medido antes de decidir: o front **sempre** manda `addresses` (`useClientForm.ts:46`), então a
  mudança é **inerte para a tela de hoje** — o valor está em fechar o caminho, não em corrigir bug
  visível. Isso é o que torna o bloco barato, e o que impede vendê-lo como correção de sintoma.

DoD: `PUT /api/clients/{id}` **sem** a chave `addresses` preserva os endereços (teste visto vermelho
antes), e e-mail duplicado nos quatro caminhos devolve 422 com o campo em vez de 500 — os dois casos
não existem na suíte hoje.

Risco de review: **MÉDIO** — toca DTO (ADR-04, `generated.ts` regenera) e muda código de status de
erro em quatro rotas.

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

- **Piloto UI Clientes — tabela e estado vazio perdem a faixa visível em tablet/mobile.**
  Reproduzido por Codex e Claude Code em 2026-08-10: em `1024x768` e `390x844`, a coluna de ação
  `View` começa fora da área visível e exige rolagem horizontal; em `390x844`, após pesquisar um
  termo inexistente, o título, a orientação e a ação `Clear search` ficam cortados. No run Codex,
  o wrapper do estado sem resultado mediu `452px` de conteúdo para `276px` visíveis. Evidências:
  `.artifacts/ui-review/2026-08-10T13-18-30-codex-live/{tablet,mobile}` e
  `.artifacts/ui-review/2026-08-10-1442-clientes-comercial/{06,07,09,10}-*.png`. Saída: preservar
  os dados, mas manter a ação necessária e os estados vazio/erro aderentes à faixa visível pela
  fronteira `shared/ui`; validar a mesma jornada nas três viewports.

- **Piloto UI Clientes — o diálogo perde contexto de foco e expõe maximização sem nome.**
  Reproduzido por Codex e Claude Code em desktop, tablet e mobile em 2026-08-10: ao fechar a
  visualização por `Escape`, `document.activeElement` passa a `BODY` em vez de retornar ao botão
  `View` (Codex nas três viewports; Claude em desktop e mobile); o primeiro controle no ciclo do
  diálogo é o botão de maximizar, cujo HTML não contém `aria-label`, `aria-labelledby` nem `title`.
  Evidências:
  `.artifacts/ui-review/2026-08-10T13-18-30-codex-live/{desktop,tablet,mobile}` e screenshots
  `03`/`04`/`08`/`11` de `.artifacts/ui-review/2026-08-10-1442-clientes-comercial/`. Saída:
  restaurar o disparador ao fechar e nomear o controle de maximização de forma localizada na
  fronteira compartilhada `AppDialog`/`CrudDialog`.

- **Piloto UI Clientes — campos desabilitados truncam valores no modo visualização.**
  Reproduzido por Codex e Claude Code nas três viewports em 2026-08-10: `Email` e
  `Business activity` exibem apenas parte do valor em inputs desabilitados, que não recebem foco
  nem oferecem um mecanismo evidente para ler ou copiar o conteúdo integral; o contraste reduzido
  também foi medido no run Claude. Evidências:
  `.artifacts/ui-review/2026-08-10T13-18-30-codex-live/{desktop,tablet,mobile}/*dialog-open.png` e
  `.artifacts/ui-review/2026-08-10-1442-clientes-comercial/{04,08,11}-*.png`. Saída: no modo
  read-only, expor o valor completo com leitura e seleção acessíveis, preservando os inputs no
  modo edit.

- **O trio da foto é idêntico em 4 dialogs e ficou fora do item 1 de propósito.**
  `useEntityPhoto({resource, id, mode, url, invalidateKey})` + `afterCreate: (created) =>
  photo.flush(created.id)` + `{photo.hasBufferedFailure && <FormErrorBanner …/>}` +
  `closeBlocked={pending || photo.pending}` se repetem byte a byte em `ClientDialog`,
  `StaffUserDialog`, `StudentDialog` e `RedatorDialog`. Absorvê-los no `useCrudForm` fecharia a
  repetição inteira, mas põe o bloco em cima de caminho de upload com **falha silenciosa** (lição 6:
  `Content-Type` fixado → `File` vira `{}` → 201 com arquivo vazio) e do buffer pós-`201`, que já
  custou duas decisões de spec (D10/D11 do bloco de alunos) e a quarta saída do `CrudDialog`.
  Decisão do João em 2026-08-04: fora do item 1. Saída: entra quando alguém tocar um desses 4
  dialogs por outro motivo, e o commit que absorver paga junto a prova de upload real no gate —
  DoD é foto chegando no S3, não lint verde. `useEntityPhoto` **ganhou teste** em 2026-08-11 (bloco
  `guardas-que-faltam`, seis casos); o que segue aberto aqui é só a **absorção**.

- **As 2 tabelas com dropdown não adotaram a `SearchableTableFrame`, e adotar custa mais do que
  trocar o markup.** `BudgetsTable` e `TurmasTable` ficaram fora do H.4.4 (2026-08-04, spec D2) por
  terem um slot de filtro que as 5 busca-só não têm. O que a moldura **não** resolve para elas hoje é
  a **redação** do empty state: ela só sabe dizer "sem resultados para `<termo>`" com ação
  `common.clearSearch`, e essas duas precisam da bifurcação "filtros aplicados"
  (`common.noResultsFiltered` / `common.clearFilters`), que existe hoje dentro de cada uma. A
  bifurcação **não** foi construída na moldura de propósito — não há consumidor com `where`, e
  construir para um consumidor hipotético é a lição 3. **O discriminador já está seguro:** o Q-1 do
  review de 2026-08-04 fez a moldura consumir o `filtering` do `useTableFilter` em vez de recalcular
  `term === ''`, que é exatamente o defeito que essas duas tabelas cometeram juntas em 2026-08-03
  (o `Dropdown` do PrimeReact devolve o **objeto** da opção quando `option.value` é vazio). Saída:
  a moldura ganha o slot de filtro **e** a bifurcação de redação no mesmo commit em que a primeira
  das duas adotar — DoD é comportamento idêntico na tela, não lint verde. Decisão do João no
  fechamento de 2026-08-04: registrar aqui em vez de gatilho datado em `pendencias.md`.
  **Atualização medida em 2026-08-10 (a linha acima fica; o fato mudou):** a moldura **já ganhou**
  o `filterSlot` e a bifurcação `common.noResultsFiltered`/`common.clearFilters` em `3c7cc20`
  (2026-08-08), para a `HistorialTable` da certificação — fora da adoção que a "Saída" previa. Resta
  só adotar nas duas tabelas, que hoje seguem sem importar a moldura. Coberto pelo **BD-4**.

- **Catraca do `max-lines`: 4 componentes legados acima da régua de 150 linhas.** A regra
  `max-lines` (150) sobre `src/features/*/components/**` nasceu em 2026-08-03 (Q-1 do
  `abstracao-componentes-catalog`) com `ignores` para os 4 que já estavam acima: `StudentDialog`
  (189), `RedatorDialog` (189), `RedatorDocumentSlot` (175), `BudgetDetailPage` (171). Enquanto a
  lista existir, o lint verde afirma menos do que parece — mesmo padrão da catraca de
  query-em-componente, zerada em 2026-08-03. Lista que só encolhe: não acrescente arquivo para calar
  o lint. Saída: extrair o bloco coeso de cada um nos moldes já provados
  (`ContactFields`/`ContactCard`, `ModuleFields`/`ModuleCard`), um arquivo por commit, saindo dos
  `ignores` no mesmo commit — DoD é comportamento idêntico na tela, não lint verde.
  **Remedido em 2026-08-10 (os números de origem ficam registrados acima):** a catraca **piorou** —
  `StudentDialog` foi de 189 para **283** linhas e `RedatorDialog` de 189 para **199**, os dois em
  `501b731` (2026-08-05), com o lint verde o tempo todo porque estão nos `ignores`.
  `RedatorDocumentSlot` (175) e `BudgetDetailPage` (171) seguem iguais. Coberto pelo **BD-4**.
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
- Decidir assimetria entre camadas: a UI não consegue voltar a zero principais, mas o backend
  aceita zero.
- Consolidar as migrations adicionais nas originais antes de subir para produção, conforme decisão
  do João no Bloco 2.
- Bloco 5.2b (minors do review final) — **só a decisão do João continua aberta:** `GET /api/roles`
  permitir a admin comum enumerar permissões do superadmin enquanto `/api/permissions` é
  superadmin-only. A parte de teste desta linha e a linha inteira do **Bloco 5.2a** saíram em
  2026-08-11 com o BD-2 (`integridade-e-concorrencia-backend`).
- Bloco visual · Parte 1 (Q-1 do `/revisar-sprint`, adiado pelo João em 2026-07-26): CTA duplicado
  quando `ClientsTable`/`BudgetsTable` estão genuinamente vazias — `AppCardToolbar` (`end={actions}`)
  e `AppEmptyState` (`action={actions}`) renderizam o mesmo botão nos dois lugares ao mesmo tempo.
  Não pegou no DoD porque o `OperationDemoSeeder` nunca zera as duas tabelas. Escolher um lugar só
  para o botão (`ClientsTable.tsx:36,59`, `BudgetsTable.tsx:69,94`).
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

- **Os 4 hooks de formulário que ficaram fora do `useCrudForm`, com o critério de cada um.**
  `useRedatorForm` monta o create com `new FormData()` — a exceção única e declarada da regra
  `no-restricted-syntax` — e `toPayload` devolvendo objeto **não modela multipart**; entra quando
  (e se) o transporte do redator deixar de ser multipart, ou quando o module aprender a devolver
  `FormData`. `useTurmaConfigForm` **não roda sobre `createCrudResource`** (a turma nasce em rota
  aninhada), então não satisfaz o `MutableResource`; entra se a turma ganhar recurso CRUD próprio.
  `useCourseForm` e `useQuoteForm` são candidatos legítimos e ficaram fora só por corte de escopo —
  ambos manipulam coleção nested (módulos, itens da cotação) e usam `setForm`, que o Q-1 do review
  de 2026-08-05 tirou do retorno público: os dois leem `setForm` do par `{ crud, setForm }`.

- **`StudentDialog` e `RedatorDialog` não têm `FormErrorSummary`, e no aluno isso tem chave
  medida.** Dos 9 diálogos, só 6 têm o resumo. `useStudentForm` declara `summaryOnly: ['phone']` —
  a classificação está correta e a guarda passa — mas **não existe resumo naquela tela**, então um
  422 em `phone` não aparece em lugar nenhum. Medido e aceito no bloco de 2026-08-05 (spec D14): o
  aluno migrou assim mesmo porque a classificação **expõe** a lacuna sem mudar a tela; construir o
  resumo que falta é o débito. Saída: o commit que adicionar o `FormErrorSummary` aos dois paga
  junto a conferência de que todo campo em `mapped` realmente passa `error=` ao `FormField` — DoD é
  o 422 aparecendo na tela, não lint verde. Os dois arquivos também são 2 dos 4 legados na catraca
  do `max-lines` (189 linhas cada).

- **Um dos três achados do review de 2026-08-05 segue aberto — 🟢, esforço P.** (Q-4) O fato medido
  em 2026-08-01 — `PUT` com `photo_url` devolve 200 porque a promoção no construtor do `ClientData`
  desvia do `CannotSetComputedValue` — foi apagado junto do `submit` do `useClientForm` e não
  reapareceu, num bloco que **aumentou a aposta**: a propriedade deixou de carregar URL e passa a
  carregar path, então quem reintroduzir `...form` manda um caminho interno de storage no corpo da
  escrita. Saída: o próximo commit que tocar `useCrudForm` ou `useClientForm` paga o que couber.
  **Os outros dois foram fechados pelo bloco `guardas-que-faltam` em 2026-08-11:** (Q-2) o barrel
  `shared/hooks/index.ts` parou de exportar `unclassifiedPayloadKeys`, `MutableResource` e
  `CrudFormOptions`; (Q-3) chave declarada em `mapped` **e** em `summaryOnly` passou a reprovar.
