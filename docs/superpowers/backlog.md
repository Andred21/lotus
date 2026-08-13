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
