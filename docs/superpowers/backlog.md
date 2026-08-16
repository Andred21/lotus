# Backlog — Lotus v2

> Fila ordenada de trabalho futuro. **Não representa a etapa atual** e não deve ser usada por
> `/executar-bloco`. Itens presentes aqui **não estão ativos**: somente uma alteração explícita em
> `state.md` promove um item, e o backlog nunca promove trabalho sozinho.
>
> **Planejamento just-in-time (CLAUDE.md §4):** o roadmap adiante vive como título e escopo, não
> como plano pronto que envelhece. Spec e plano de um bloco se escrevem imediatamente antes de
> executá-lo.

## Convenções

| Prefixo | O que é | Onde mora o detalhe |
|---|---|---|
| `BD-*` | **Bloco de execução de dívida** — agrupa pendências e débitos que saem baratos juntos | aqui |
| `D-*` | **Débito técnico** — defeito ou lacuna medida no código | aqui, na seção `## Débitos técnicos` |
| `P-*` | **Pendência** — divergência entre doc/mecanismo e realidade | `pendencias/abertas.md` |

**Agrupar não promove.** Um `BD` é ponteiro: a pendência continua em `pendencias/` e o débito
continua em `## Débitos técnicos`, com o mesmo ID, até o bloco ser aplicado e o `/fechar-sprint`
correspondente removê-los. Afinidade que justifica agrupar: **mesmo arquivo, mesma entidade, mesmo
módulo, mesmo domínio ou mesma frente** (backend × frontend).

---

# Sprints planejadas

## Sprint 5 · Dashboard

Central read-only operacional e analítica, com experiências distintas para Administrativo e Redator.

- **Contexto canônico:** Drive `Planejamento/dashboard-escopo-funcional-analitico.md`
- **Execução detalhada:** Notion EAP 8.4.0–8.4.7
- **Exige `context_required`** antes do planejamento — o escopo é canônico do Drive, não do
  repositório, então o Context Packet vem antes do `/planejar-bloco`.

**Bloco restante** (o bloco A, `dashboard-backend-agregacoes`, foi entregue em 2026-08-15 — ver
`historico/progress.md`; o contrato do payload está em
`specs/archive/2026-08-14-dashboard-backend-agregacoes-design.md` e os tipos, em `generated.ts`):

1. **`dashboard-frontend-central-controle`** — TanStack Query, KPIs, pendências, alertas, pipeline,
   séries históricas, compliance, análises gerenciais e Dashboard profissional do Redator.

**Administrativo:** visão global de Comercial → Operação → Certificação, pendências, riscos,
compliance e análises.

**Redator:** visão exclusivamente própria — turmas atuais/próximas, agenda, documentação das suas
turmas, pendências, compliance pessoal e histórico/indicadores profissionais permitidos.

**O Dashboard não executa mutações.** CTAs apenas direcionam ao módulo dono da ação.

**Direção futura registrada no Drive:** as projeções do Dashboard poderão alimentar uma central de
notificações interna e, depois, canais como e-mail. **Notifications não entra nesta sprint.**

## Sprint 6 · Meu Perfil

Área self-service de identidade, segurança e, para Redator, documentação profissional.

- **Contexto canônico:** Drive `Planejamento/meu-perfil-escopo-funcional.md`
- **Execução detalhada:** Notion EAP 8.5.1–8.5.9
- **Exige `context_required`** antes do planejamento, pelo mesmo motivo da Sprint 5.

**Dois blocos sequenciais:**

1. ~~**`meu-perfil-backend-self-service`**~~ — entregue em 2026-08-15
   (`plans/archive/2026-08-14-meu-perfil-backend-self-service.md`).
2. **`meu-perfil-frontend`** — página Meu Perfil, formulário pessoal, foto, segurança, documentos do
   Redator, resumo profissional, estados loading/erro/vazio, responsividade e UI review.

**Escopo do self-service:** Admin e Redator alteram apenas dados pessoais permitidos e a própria
senha. **E-mail, RUT, role, permissões, `type` e `is_active` não são self-service.**

**Exclusivo do Redator:** upload/substituição dos próprios documentos regulatórios e resumo de
idoneidade profissional, cursos habilitados, turmas atuais/próximas e pendências.

**O resumo profissional não substitui o Dashboard do Redator.** Meu Perfil responde *"quem sou e
qual minha situação profissional"*; o Dashboard responde *"o que tenho para fazer e como está minha
operação"*.

---

# Próximos blocos

1. **Arquivados e restauração de soft-delete** — Notion H.5.1–H.5.4.
   Objetivo: tornar o lifecycle de archive/restore explícito e seguro por agregado.
   Ordem: semântica → Actions → endpoints → UI.
   **Fora de escopo:** `forceDelete` e exclusão permanente.
2. **Administração · Roles e permissões — redesenho de composição.** O protótipo tem layout dividido
   (lista de roles à esquerda; detalhe + matriz de permissões à direita, com marcação de permissão
   essencial); o real tem tabela + diálogo. **Não é refinamento visual, é redesenho de tela** — exige
   brainstorming. Task Notion: "Tela de Administração — Roles e Permissões". Respeitar ADR-07
   (permissões essenciais não editáveis).
3. **Hardening** — ownership em rotas nested e política de retenção documental.
4. **Identity · ativação de acesso do redator.** `CreateRedatorAction` cria o `User` com
   `is_active=false` "até o fluxo de ativação", e **o fluxo não existe** — o `UserProvisioner` gera
   senha aleatória (`bin2hex(random_bytes(16))`) que ninguém recebe, e nenhuma tela ativa a conta.
   Consequência medida no fechamento do `dashboard-backend-agregacoes` (2026-08-15): **nenhum redator
   autentica em produção**, então a view `redator` do dashboard está implementada, testada e provada
   ponta a ponta contra a API real — e hoje **inalcançável** por quem deveria usá-la. É a RN-01 pela
   metade: a regra diz que redator autentica, o cadastro nunca o habilita. Toca convite ou
   definição de senha, o gate de `is_active` e provavelmente `password_reset_tokens`; exige
   brainstorming, porque "como o redator recebe a credencial" é decisão de produto, não de código.
   **Bloqueia o valor do bloco B do Dashboard para metade dos papéis.**

---

# Blocos de execução de dívida

> **Fila vazia até promoção explícita do João.** BD-1..BD-9 foram entregues entre 2026-08-11 e
> 2026-08-14 e saíram desta lista com os débitos que cobriam; o histórico de cada um está na linha da
> entrega em `historico/progress.md`. Os BD-10..BD-15 abaixo são o reagrupamento de 2026-08-14 do que
> sobrou — nenhum foi promovido.

## BD-10 · Frontend · kit de formulário: nome acessível e cor de marca

**Cobre:** P-37, P-36, D-01, D-18 · **Frente:** frontend
**Afinidade:** os três tocam `shared/ui` (`FormField`, `FormSection`) ou o diálogo que os consome, e
os dois primeiros foram adiados **pelo mesmo motivo** — o kit inteiro passa pelo arquivo, então o fix
alcança toda tela de uma vez e não cabia num bloco de escopo estreito.

- **P-37** — `FormField` embrulha o controle em `<label>` sem `htmlFor`: o campo soma o rótulo do
  controle no nome acessível. Dois sítios (`StaffIdentifyFields`, `BudgetDialog`). O molde está
  medido em `LoginForm.tsx:40-85` e **copia-se inteiro**, com `aria-describedby` e `aria-invalid`.
- **P-36** — cor por `style={{ }}` passa verde na catraca `COR_HARDCODED`. Dois sítios a 2,77:1:
  `FormSection.tsx:19` e `CoursesTable.tsx:43`. Fechar os sítios **e** decidir o seletor da guarda —
  `style` também é a grafia certa quando o valor é `var(--…)`.
- **D-01** — nome de arquivo truncado sem `title` nem quebra a 390x844.
- **D-18** — a data da MESMA linha de arquivo sai no idioma do navegador, não no da
  interface. Mesmo componente do D-01, e é o que torna os dois baratos juntos.

**DoD:** o nome acessível medido em leitor de tela (ou por `accessibleName` no Playwright) nos dois
sítios da P-37, não só o atributo no DOM.

## BD-11 · Frontend · shell: catraca de cor e navegação no toque

**Cobre:** P-34, D-03 · **Frente:** frontend
**Afinidade:** os dois vivem em `src/app/layouts/Sidebar/`. Converter as 3 classes `text-slate-*` é
exatamente o que destrava a entrada da regra na camada, então o custo de fazer os dois juntos é menor
que o de fazer um.

- **P-34** — `COR_HARDCODED` não roda em `src/app/**`, a única camada sem ela.
- **D-03** — menu recolhido a 390 tira o rótulo do DOM e deixa só `title`: no toque não há hover,
  então o nome do item de navegação fica inalcançável.

**DoD:** a regra entrando em `src/app/**` **sem** bloco `ignores`, provada nos dois sentidos (sonda
reintroduzindo uma classe de paleta e vendo o lint reprovar nomeando arquivo e linha).

## BD-12 · Frontend · load-state: os dois sítios que sobraram do BD-6

**Cobre:** D-14, P-40 · **Frente:** frontend
**Afinidade:** os dois orbitam `useLoadState` e o catálogo de cursos.

- **D-14** — `RedatorCourseSelector` e `CourseRedatoresSection` ainda ramificam por `isError` cru.
- **P-40** — remedição do ramo "catálogo genuinamente vazio" contra HEAD. Depende de conseguir
  esvaziar o catálogo de dev (seeder de cenário, endpoint de teste, ou o João rodando o comando).

> A **P-38** saía deste bloco e foi **encerrada antes**, em 2026-08-16, pelo gatilho literal dela: o
> `meu-perfil-frontend` tocou `frontend-fsliced.md` por outro motivo e trocou a frase pelo corte
> medido com o runner (`pendencias/encerradas.md`).

**DoD:** o teste do ramo COM cache em cada sítio — o BD-6 mostrou que forçar `list: []` no teste de
falha deixa a regressão passar verde.

## BD-13 · Frontend · listagens e abas: plural, ausência e custo de montagem

**Cobre:** D-02, D-04, D-05, D-06 · **Frente:** frontend
**Afinidade:** todos são a página de listagem e o que ela mostra ou custa; `CertificatesPage` aparece
em três dos quatro, e os três locales são o arquivo comum de D-02 e D-05.

- **D-02** — plural cru em duas das sete tabelas.
- **D-04** — cada montagem de página com abas busca as **duas** abas.
- **D-05** — bloco de erro bilíngue com caminho de campo cru na tela.
- **D-06** — a linha do certificado corrompido mostra a célula de aluno vazia, sem o travessão.

**DoD:** a paridade das 3 locales verde depois da chave de plural, e o custo de rede medido (1 GET
por aba aberta, não 2 por montagem).

## BD-14 · Backend · o que a entrada pode escrever

**Cobre:** D-13, D-12, P-29, P-35 · **Frente:** backend
**Afinidade:** os quatro são contrato de entrada — o que o corpo da requisição pode e não pode
escrever, e o que acontece quando ele omite ou quando dois corpos chegam juntos. Três deles tocam o
caminho de escrita de identidade (`UpdateStaffUserAction`, `UserProvisioner`, DTOs com foto).

- **D-13** — `UpdateStaffUserAction` apaga o `rut` num `PUT` que só o **omite**.
- **D-12** — o backend aceita chave `#[Computed]` (`photo_url`) no corpo e devolve 200 em silêncio,
  nos quatro DTOs com foto.
- **P-29** — corrida de unicidade **entre transações** ainda sobe 500 em vez de 422.
- **P-35** — `seq_in_budget` por mass assignment enquanto `version` saiu do `$fillable`; dois
  consumidores do ADR-17 com defesas diferentes.

**Decisão do João dentro do bloco, não antes:** D-13 muda contrato de entrada (preservar o valor
atual quando a chave falta × exigir a chave no `PUT`) e D-12 decide se chave computada no corpo vira
422 ou segue ignorada. **DoD é o teste que mostra o RUT sobrevivendo à omissão, não o `if` novo.**

## BD-15 · Docs e guardas de documentação

**Cobre:** P-20, P-21, P-23, P-32, P-39, D-08 · **Frente:** documentação e mecanismo
**Afinidade:** três tocam `docs/adrs.md`, dois tocam a guarda que confere doc contra código
(`repo-docs-refs.test.ts`), e todos são a lição 13 na forma dela — doc que afirma o que não é.

- **P-20** — `openspout/openspout` em produção sem ADR hospedeiro. **Decisão do João:** qual ADR
  hospeda, ou ADR-20 novo.
- **P-21** — `simple-qrcode` sem a nota no ADR-12; hospedeiro já é óbvio, falta escrever.
- **P-23** — `progress.md` sem a coluna `Contexto`. **Decisão do João:** restaurar ou declarar a
  mudança no cabeçalho.
- **P-32** — a guarda da lição 13 confere path, não classe. Espera reincidência **por classe** para
  desenhar o seletor sem falso-positivo.
- **P-39** — a premissa de RBAC do plano do BD-6 está errada; corrigir **na fonte que for reusada**,
  não retro-editando o plano.
- **D-08** — a §5.3 (`generated.ts` não se edita à mão) segue sem mecanismo.

**Nota de método:** P-20 e P-21 vivem no mesmo arquivo, então a decisão de numeração sai numa
sentada só — é o que torna o agrupamento barato.

---

# Débitos técnicos

> Registro canônico de cada débito. A cobertura por bloco está mapeada acima; **entrar num BD não
> move nem apaga a linha daqui** — a remoção acontece só depois do bloco aplicado e do
> `/fechar-sprint` correspondente.
>
> Os IDs `D-*` nasceram no reagrupamento de 2026-08-14: até então **12 dos débitos desta página não
> tinham número** e eram citados pelo título em negrito, o que tornava impossível mapeá-los a bloco
> sem repetir o texto. Uma linha saiu no mesmo passo por ser **duplicata, não por estar resolvida**:
> "consolidar as migrations adicionais nas originais" já vivia como **P-05**, com o mesmo gatilho
> ("antes de subir para produção"), e um débito com dois donos diverge dos dois.

## Agrupados em bloco

- **D-01 · Nome de arquivo truncado sem `title` nem quebra a 390x844** (`RedatorDialog`, seção
  DOCUMENTS) → **BD-10**. O valor some sem mecanismo de leitura — mesma classe do débito de campo
  desabilitado que o BD-3 pagou, num controle que ele não cobria.
- **D-02 · Plural cru em duas das sete tabelas** → **BD-13**. "3 course(s)" e "1 user(s)" contra "4
  clients", "7 instructors" e "6 budgets". Rodapé do `AppDataTable` alimentado por chave sem plural
  i18n; medido em 2026-08-14 ainda vivo nos 3 locales (`"{{count}} usuario(s)"`, `"{{count}}
  curso(s)"`, `"{{count}} módulo(s)"`).
- **D-03 · Menu recolhido a 390 tira o rótulo do DOM e deixa só `title`** → **BD-11**. No toque não
  há hover, então o nome do item de navegação fica inalcançável
  (`src/app/layouts/Sidebar/SidebarItem.tsx`).
- **D-04 · Cada montagem de página com abas busca as DUAS abas** → **BD-13**. Custo de rede dobrado
  na abertura de `PeoplePage` e `CertificatesPage`; sem falha funcional, mas mensurável.
- **D-05 · Bloco de erro bilíngue com caminho de campo cru na tela** → **BD-13**. Título vem do i18n
  do front e segue a sessão (`Could not load the data`), corpo vem do `detail` do RFC 7807 e chega
  sempre em espanhol, citando `aluno.name` (que ainda por cima é português). Medido no estado de erro
  real do `LOT-2026-1001` em `/certificados`.
- **D-06 · A linha do certificado corrompido mostra a célula de aluno vazia, sem o travessão** →
  **BD-13**. A lista não distingue "sem nome" de "campo faltando", e é o único lugar onde o registro
  aparece antes do clique. O diálogo do mesmo registro explica a falha; a linha, não.
- **D-08 · A lei §5.3 segue sem mecanismo** → **BD-15**. A linha original pedia Arch tests no backend
  mais `eslint-boundaries` no frontend; **as duas partes nomeadas existem** e foram remedidas em
  2026-08-14 contra `977586e`, não herdadas de relatório: `PersistenceLawsTest` cobre §5.1 (classe
  `Repository` sobre Eloquent), §5.2 (`CREATE TRIGGER`/`unprepared()` em `database/` e `app/`), a
  escrita de pivot sem auditoria e a coleção nested read-write — quatro testes, com o escape da
  primeira declarado no docblock do próprio arquivo (a exclusão de `QueryBuilders/` é por path, então
  um `FooRepository.php` dentro dela escaparia; reprovar por semelhança de nome mataria
  `TurmaQueryBuilder`, que é o padrão do ADR-02); e a §5.6 virou `no-restricted-imports` no
  `eslint.config.js`, nas **três** fronteiras (feature→PrimeReact, feature→feature em quatro grafias,
  `shared/`→feature), por mecanismo diferente do `eslint-boundaries` que a linha nomeava e com o
  mesmo efeito. **O que falta é a §5.3:** `generated.ts` não se edita à mão, e o único mecanismo hoje
  é `globalIgnores` no lint (`eslint.config.js:158`), que apenas **tira o arquivo do corte** — não
  impede edição nenhuma. As §5.4 (Sanctum), §5.5 (RN-01), §5.7 (financeiro) e §5.8 (DoD) seguem sem
  guarda e sem desenho medido, então não entram aqui como promessa. Teste que roda o
  `typescript:transform` e compara com o commitado é a candidata óbvia — ela reprova sozinha se
  alguém editar à mão. **DoD é a sonda:** editar `generated.ts` e ver o mecanismo reprovar nomeando o
  arquivo.
- **D-12 · O backend aceita `photo_url` no corpo da escrita e devolve 200, em silêncio** →
  **BD-14**. Resíduo medido do Q-4 (review de 2026-08-05), que o BD-5 fechou **só do lado do
  frontend**: `FORBIDDEN_PAYLOAD_KEYS` no `useCrudForm` faz a chave lançar em DEV, então o `...form`
  ingênuo não a reintroduz mais. O defeito do outro lado foi **remedido no `/fechar-sprint` de
  2026-08-13**, não herdado: `PUT /api/students/37` com `"photo_url":"http://evil/x.png"` no corpo
  devolve **200**, e o campo volta `null` na resposta — a promoção no construtor do DTO desvia do
  `CannotSetComputedValue`, então o campo `#[Computed]` é ignorado sem 422. Vale para os quatro DTOs
  com foto, não só o `ClientData` que o texto original do Q-4 nomeava. **Uma afirmação do Q-4
  original não sobreviveu à medição:** `photo_url` **não** carrega path interno de storage — o
  `SignedUrlTransformer` roda na serialização e o front recebe URL pré-assinada.
- **D-13 · `UpdateStaffUserAction` apaga o `rut` do staff num `PUT` que só o OMITE** → **BD-14**.
  `UserData::$rut` é `Optional`, e a Action traduz `Optional` para `null` antes de gravar
  (`($data->rut instanceof Optional || $data->rut === null) ? null : $data->rut`,
  `UpdateStaffUserAction.php:44`): quem manda o formulário sem a chave zera o RUT de um usuário que
  tinha. É a mesma classe do defeito que o bloco `contrato-de-entrada-identidade-e-nested` fechou nas
  coleções nested — omissão virando apagamento —, num campo escalar. **Pré-existente e fora do escopo
  daquele bloco**, que só atravessou o arquivo para trocar a checagem de unicidade pela porta única.
- **D-14 · `RedatorCourseSelector` e `CourseRedatoresSection` ainda ramificam por `isError` cru** →
  **BD-12**. É o terceiro e o quarto sítio do padrão que o review do BD-6 (2026-08-14) transformou em
  regra — falha que apaga cache utilizável — e os dois ficaram **fora do escopo** daquele bloco, que
  só cobria os três sítios da spec (wizard, card de cotações, dropdown de cliente). Depois do
  `useLoadState` o fix é de uma linha em cada um: trocar `courses.isError` / `redatores.isError`
  (`RedatorCourseSelector.tsx:38`, `CourseRedatoresSection.tsx:28`) por `failedWithoutData` no ramo
  que substitui a tela, e mandar a falha com cache para um `InlineLoadState` ao lado da lista.
- **D-16 · Turma concluída com zero matrículas cai em `fully_issued` no funil** → **BD-15**.
  Declarado no review do `dashboard-backend-agregacoes` (2026-08-14) como não-regressão: a spec §4.3
  escolheu o balde de propósito ("turma concluída sem matrícula aprovada pendente cai em 'tudo
  emitido': não há o que emitir"), e a classificação exclusiva exige que ela caia em algum lugar. O
  que incomoda é a **leitura**: o rótulo afirma emissão completa onde não houve emissão nenhuma.
  Custo do fix: um sétimo balde, ou um rótulo que distinga "sem matrícula a emitir" — decisão de
  contrato, e o consumidor (bloco B) ainda não existe para dizer se a distinção paga.
- **D-18 · A data do `AppFileRow` sai no idioma do NAVEGADOR, não no da interface** → **BD-10**.
  `AppFileRow.tsx:42` chama `new Date(createdAt).toLocaleDateString()` sem locale: numa interface
  es-CL a linha do documento exibe `8/16/2026` (en-US) enquanto o slot logo abaixo, corrigido em
  2026-08-16, exibe `10-08-2028`. Como `created_at` é timestamp completo, aqui só o **formato** erra
  — o dia não volta, ao contrário do UI-01 que originou a correção. Fix de uma linha (`formatDate`
  de `@shared/lib`), adiado porque `AppFileRow` é `shared/ui` de outras telas e o próprio review de
  UI o declarou decisão fora do bloco.
- **D-17 · `DomainDependencyTest` detecta aresta usada-e-não-declarada, não a contrária** →
  **BD-15**. Declarado no mesmo review. A lista de arestas de um domínio pode envelhecer com sobras
  em silêncio — importe removido, entrada permanece —, e nada reprova. O cenário (9) do
  `dashboard-backend-agregacoes` cobre a direção contrária **só para `Dashboard`**; generalizar é
  varrer os `use` de cada domínio e reprovar declaração sem consumidor, que é a mesma forma da
  varredura de órfãos que os fechamentos já fazem à mão.

## Travado no merge — não entra em bloco até o dashboard chegar à `main`

- **D-15 · `DIAS_AVISO = 30` em Identity duplica `DashboardWindows::EXPIRY_WINDOW_DAYS = 30` da
  branch do dashboard.** Duplicação **declarada e datada na spec do Meu Perfil** (2026-08-14):
  unificar antes do merge significaria importar de um domínio que na árvore `fix-frontend` ainda não
  existe. Vira task de uma linha depois que `feat/dashboard-backend-agregacoes` chegar à `main` —
  decidir o dono do número (Shared, ou um dos dois domínios) é parte da task, não desta linha.

## Travados em decisão — não entram em bloco

Executar sem a decisão é escolher no lugar do João.

- **D-07 · Idioma das mensagens de `ValidationException` é inconsistente no repo.** Commercial
  escreve em PT (`DeleteQuoteAction`, `DeleteClientContactAction`), Operation em ES (`Turma`,
  `ConcludeTurmaAction`) — o usuário chileno lê um ou outro conforme o endpoint. Pré-existente;
  levantado no segundo review (2026-08-01) porque o 422 novo de contatos tem uma única mensagem e ela
  é a que o cliente vê. **Exige decisão do João sobre o idioma canônico** antes de valer a pena
  unificar. (Era o `Q-6`.)
- **D-09 · Assimetria entre camadas:** a UI não consegue voltar a zero principais, mas o backend
  aceita zero.
- **D-10 · Bloco 5.2b:** `GET /api/roles` permite a admin comum enumerar permissões do superadmin
  enquanto `/api/permissions` é superadmin-only. A parte de teste desta linha e a linha inteira do
  **Bloco 5.2a** saíram em 2026-08-11 com o BD-2.
- **D-11 · Alunos · o dropdown de empresa depende de uma permissão de outro módulo.** O módulo de
  alunos inteiro é gated por `identity.user.*` (D8 da spec, e é o que o `StudentController` exige),
  mas o dropdown de empresa do create lista via `clientsApi`, que exige `commercial.client.view`.
  Quem tem `identity.user.create` sem `commercial.client.view` cria aluno pela API e não pela tela.
  **Duas tentativas de contornar na UI foram revertidas por serem piores que o problema:** gate duplo
  no botão escondia a ação de quem tinha autorização real (`3e0bc36`); travar o submit por `isError`
  bloqueava com lista utilizável em cache (`03280c6`). O estado atual é o menos ruim — a falha fica
  **visível** (dropdown desabilitado + motivo + "Reintentar"), não escondida. **Alinhar de verdade
  exige decisão do João sobre RBAC/spec:** endpoint de clientes sob `identity.user.view`, permissão
  nova, ou aceitar o acoplamento.

**Pendências no mesmo estado** (detalhe em `pendencias/abertas.md`): P-02 e P-33 (retenção de
`audits` e `login_logs`), P-05 (consolidar migrations), P-03 (compose por worktree), P-30 (âmbar de
marca), P-28 (fundo do certificado), P-31/P-18/P-22 (escrita fora do repositório) e as de decisão da
Lotus (P-08, P-09, P-10, P-13, P-15, P-16).

---

# Módulos ainda não implementados

Hoje são `ModulePlaceholder` ou equivalente. A auditoria visual de 2026-07-24 os listou como
divergência crítica de UI; **não são** — são módulo a construir.

- **Dashboard** — coberto pela **Sprint 5** acima. Protótipo tem 4 KPIs, gráfico de turmas, gráfico
  de certificados, tarefas pendentes, alertas recentes e estados sem dados. Real: saudação +
  subtítulo (17 linhas).
- **Perfil do Usuário** — coberto pela **Sprint 6** acima. Página dedicada para usuário
  (administrativo e redator), visualizando seu perfil e dados.
- ~~**Pessoas · Alunos**~~ — entregue em 2026-07-27
  (`plans/archive/2026-07-27-bloco-alunos-modulo.md`).
- ~~**Certificados**~~ — entregue: backend no Bloco 7 (2026-08-07,
  `plans/archive/2026-08-05-certificacao-sprint-4.md`) e frontend em 2026-08-08
  (`plans/archive/2026-08-08-certificacao-frontend.md`).

---

# Futuros dependentes de decisão

- **FUT-1 · Templates de documento de turma gerados via código** — o redator baixa o template
  pré-preenchido com dados da turma/alunos, preenche online ou à mão e sobe. Depende de desenho com a
  Lotus; abrir task no Notion e avaliar documentação Drive/local quando definido.
  **Interseção com "Arquivados e restauração":** o manual em PDF/DOCX pré-preenchido é exatamente a
  fatia "baixa, preenche à mão, sobe" para o tipo `MANUAL`. O que continua futuro é o mecanismo
  genérico para os outros tipos (`PRUEBAS`, `EVALUACION_REDATOR`) e o preenchimento online.
- **FUT-2 · Refino de ancoragem cross-módulo** — link de dado compartilhado leva à página do módulo
  dono com a entidade selecionada, ou a exibe inline. O caso turma→orçamento já existe; o mecanismo
  genérico depende de decisão e task no Notion.
