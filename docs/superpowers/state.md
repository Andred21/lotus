---
schema_version: 1
active_feature: null
active_work_item: falha-vs-lista-vazia
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-08-14-falha-vs-lista-vazia-design.md
active_plan: docs/superpowers/plans/2026-08-14-falha-vs-lista-vazia.md
context_packet: null
blocker: null
last_completed_work_item: login-fora-do-adr16
state_basis_commit: 0a1439f
updated_at: 2026-08-14T13:05:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Item ativo — 2026-08-14 (`falha-vs-lista-vazia`, BD-6)

### Seleção — 2026-08-14

**BD-6 do `backlog.md:73`, promovido explicitamente pelo João** com o estado em `idle` e
`active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre (BD-1, BD-2,
BD-5, BD-7, BD-8, BD-9, login): o argumento era **título de seção**, não slug promovido. As três
decisões dele fecharam o gate: o slug `falha-vs-lista-vazia`; **rota direta a `ready_for_planning`
sem Context Packet**; e **main tree `/home/jvbat/projetos/lotus`**, na branch
`feat/falha-vs-lista-vazia` criada de `0a1439f`.

**A ausência de fonte externa foi medida, não presumida:** grep por `drive.google`, `notion.so`,
`figma.com`, `docs.google` e `http` nas 15 linhas do BD-6 devolve **zero ocorrência**. As fontes são
o repositório e o texto do backlog, que já traz os paths e a atualização de referência de 2026-08-10.

**O main tree venceu por ausência de disputa, não por costume:** não há execução paralela nesta base
— a worktree `fix-frontend` está em `fix/state-rotacao-pos-merge`, já mergeado em `0a1439f`, e a
`lotus-preview` é preview de cliente. Sem os dois `active_work_item` de 2026-08-13, a invariante volta
a valer sem exceção.

**`state_basis_commit` passa de `024673a` a `0a1439f`** — o merge do PR #49, HEAD atual da `main`.
Não era divergência: com `active_work_item` `null` não havia trabalho ativo cujo baseline pudesse ter
derivado.

### Brainstorming e spec — 2026-08-14

Spec em `docs/superpowers/specs/2026-08-14-falha-vs-lista-vazia-design.md`, com **nove decisões**
(D1–D9): as quatro primeiras escolhidas pelo João entre alternativas com o custo medido, as cinco
seguintes derivadas delas e declaradas como tais.

**A medição achou quatro coisas que o backlog não tinha, e duas mudam o que o bloco é:**

1. **O terceiro sítio escrito no BD-6 está vencido.** `useCommercialClients.clientName`
   (`useCommercialClients.ts:19`) tem **um** consumidor, a `BudgetsTable`, que já agrega
   `clients.loadError` e onde erro vence vazio (`BudgetsTable.tsx:35`) — sob falha o `'—'` **não
   chega a renderizar**. Ele só aparece com GET bem-sucedido e id fora da lista, que é dado.
   **D1:** o sítio sai e entra o disfarce vivo do mesmo hook — `clientOptions` no `BudgetDialog.tsx:22`,
   onde GET falho rende dropdown vazio, sem motivo e sem Reintentar.
2. **O molde pronto existe um módulo ao lado, sobre a mesma query:** `useRedatorCourses` +
   `RedatorCourseSelector` fazem os cinco estados sobre `coursesApi.useList()` citando a **D11**
   nominalmente; `useStudentClients` + `StudentClientField` fazem a versão de dropdown de form. Nada
   aqui é padrão novo. **D4:** o par erro/dica sob campo é extraído para `shared/ui` como
   `InlineLoadState` e o `StudentClientField` perde a cópia local — precedente exato do `mergePt`.
3. **O runner cobre `features`, não só `shared/`** (`vite.config.ts:26` inclui
   `src/**/*.test.{ts,tsx}`, e o `BudgetDetailPage.test.tsx` já testa ramo a ramo com o hook
   mockado). Um bloco que muda comportamento de propósito **prova o comportamento em teste**, e não
   só no navegador: três arquivos novos, projeção 35 arquivos / ~177 testes.
4. **Um caso parecia trabalho e não é:** o `BudgetDialog` em `edit` mostra o cliente pelo label de
   `clientOptions` e ficaria vazio sob falha, mas o único caminho até lá (`BudgetOverlays`, dentro do
   `BudgetDetailPage`) já reprova a página inteira quando `clients` falha
   (`useBudgetDetail.ts:89-92`). Fica declarado para não parecer esquecimento.

**As decisões que mudam comportamento:** a falha de cursos na `QuotesList` é **local no card** e não
promovida ao `loadError` da página (**D2**) — diverge da D16 por motivo medido, porque lá o nome do
cliente era campo de busca e aqui não há busca, e esconder valor UF, status e arquivos por falha de
nome seria o erro inverso; e **`canAdvance` fica `course_id > 0`** (**D3**), preservando escolha
válida de quem edita, pelo mesmo critério do `unusable` do `useStudentClients` e para não repetir o
`03280c6`, revertido justamente por travar com lista utilizável em cache.

**Baseline medido nesta branch, não herdado:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**32 arquivos / 163 testes** — bate com o placar pós-merge do PR #48, confirmando que a branch nasce
da `main` sem deriva.

**Risco de review BAIXO** pelo gate binário (zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal; `executor: claude`). O risco próprio, na §9 da spec, é de
alcance: `useCommercialClients` tem dois consumidores e o retrofit toca `identity`, fora do módulo do
bloco.

O estado entra em `planning` no commit da spec; `active_plan` segue `null` até o João ler a spec
escrita e autorizar o `writing-plans`.

### Plano — 2026-08-14

**O João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/2026-08-14-falha-vs-lista-vazia.md`: **seis tasks**, uma por commit, na ordem
componente compartilhado → retrofit → passo 1 do wizard → card de cotações → dropdown do orçamento →
gate.

**A ordem tem uma dependência e uma dívida:** o `InlineLoadState` vem primeiro porque as Tasks 2, 4 e
5 o consomem; e o **retrofit vem em segundo, antes dos sítios novos**, para a duplicação não chegar a
existir — escrever os três consumidores e só depois voltar em `identity` é o caminho que o review do
BD-5 reprovou no `mergePt`.

**Três coisas apareceram só ao escrever o plano, e as três mudam trabalho:**

1. **`GET /api/courses` não tem middleware de permissão** (`app/Domains/Catalog/routes.php:11`, só
   `auth:sanctum`), então **não há 403 a provocar por RBAC** — o texto original do B-7 falava em
   "403/rede". A falha do gate se produz redirecionando o XHR da rota por `eval` no navegador, e o
   caminho de volta é `window.__unpatch()`, sem tocar container.
2. **O `CourseStep` recebe o hook inteiro, não `list`/`search` soltos.** Trazer o
   `useQuoteCourseSearch` para dentro dele — que é o que o `RedatorCourseSelector` faz — **reiniciaria
   o termo digitado** a cada ida e volta entre os passos, porque o passo desmonta e o wizard não. É
   regressão silenciosa que nenhum teste do bloco pegaria.
3. **A prova do "vazio de verdade" precisa do banco, e ele volta atrás.** `Course` usa `SoftDeletes`,
   então o gate apaga o catálogo, mede que a tela diz "No hay cursos." **e não** a mensagem de falha,
   e restaura — com a contagem de `onlyTrashed` medida **antes**, para o restore não ressuscitar
   curso que já estava na lixeira.

**Também entrou no gate a prova nos dois sentidos dos testes novos** (spec §7.2): cada ramo é
derrubado por `perl -0pi`, o `grep` confirma que a sonda foi plantada **antes** do vitest rodar — sem
ele "não reprovou" seria ambíguo entre teste cego e sonda ausente, que é a lição da Task 8 do login —
e o `git checkout` devolve a árvore.

**Baseline medido em `0c18595`, não herdado:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**32 arquivos / 163 testes**. Projeção do plano: **35 arquivos / 174 testes** (+3 arquivos, +11
casos). A spec §6 dizia "~177" por estimativa; o plano fixa **174**, que é a soma exata dos casos
escritos, e é esse o número que o gate confere.

**Um risco de execução foi medido antes de virar bloqueio:** PrimeReact **renderiza em jsdom** e
`fireEvent` funciona — probe com `AppInputText`/`AppRadioButton`/`AppButton` e com a `QuotesList`
inteira (que monta `AppFileUpload`), as duas passando. Os três arquivos de teste do plano não
dependem de mockar PrimeReact.

`executor: claude`, sem `paths_autorizados`: o bloco muda comportamento em três telas, atravessa a
fronteira de módulo (o retrofit toca `identity`), decide granularidade de estado por julgamento e o
gate mexe no banco de dev com passo de restauração.

**Um conflito conhecido fica declarado antes de acontecer:** o cabeçalho do plano pede
`subagent-driven-development`, e esta sessão tem regra de não chamar o Agent tool sem pedido — o
mesmo impasse do BD-4, do `rastro-unicidade-e-gates` e do login. Resolve-se no `/executar-bloco`, por
pergunta direta ao João, não aqui.

**Estado: `ready_for_execution`.** `/executar-bloco falha-vs-lista-vazia` exige instrução posterior
do João.

### Execução — 2026-08-14: início

`/executar-bloco falha-vs-lista-vazia` validou as âncoras (spec, plano, `context_packet` `null`
coerente com a ausência medida em §1.1, Git limpo em `3bebb39`, sem divergência) e confirmou o gate
main tree/worktree: a decisão de main tree já estava tomada em `state.md` na Seleção de 2026-08-14
("O main tree venceu por ausência de disputa"), então nenhuma worktree nova foi criada.

**O mesmo conflito do BD-4, do `rastro-unicidade-e-gates` e do login reapareceu, e foi resolvido do
mesmo jeito:** o plano recomenda `subagent-driven-development`; a sessão tem regra de não chamar o
Agent tool sem pedido. Escalado ao João via pergunta direta — **subagent-driven-development**, com
Agent tool autorizado para este bloco.

Pre-flight scan do plano (6 tasks contra os Global Constraints e a spec): limpo, sem contradição —
as projeções de arquivo/teste por task batem entre si e com o total final, e a duplicação estrutural
dos dois ramos do `InlineLoadState` é decisão de design da spec, não achado a escalar.

Baseline reproduzido nesta branch, não herdado: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**32 arquivos / 163 testes** — bate com o baseline do plano. Ledger local reiniciado em
`.superpowers/sdd/progress.md` (o anterior era do `login-fora-do-adr16`, já fechado).

**Estado:** `executing`.

## Último item fechado — 2026-08-13 (`login-fora-do-adr16`, item 4 de "Próximos blocos")

### Exceção declarada à invariante de um `active_work_item`

**Existem dois itens ativos ao mesmo tempo, por decisão explícita do João em 2026-08-13**, e isto
está escrito porque a invariante do topo deste arquivo diz o contrário. O `/planejar-bloco` do Login
abriu com o estado `idle` no main tree **e** com o `usecrudform-mais-fundo` (BD-5) já em
`ready_for_planning` na worktree `fix-frontend`, promovido por `5bf54f3` às 12:32 — dois `state.md`
divergentes no mesmo repositório. Não foi resolvido por heurística: a divergência foi mostrada e ele
escolheu **paralelo**, precedente do BD-4 × BD-9 (2026-08-13).

**A diferença para aquele precedente é que aqui a sobreposição não é zero, e foi medida antes de
decidir**, não depois:

1. `FormErrorBanner` — o BD-5 o reescreve (`shared/ui/FormField/FormField.tsx:119`, falha
   bufferizada) e `LoginForm.tsx:32` é call site (`variant="inline"`), num arquivo que este bloco
   reescreve inteiro.
2. `AppPassword.tsx:47` — a troca de `w-96` por `w-full` (decisão 6 do item) muda a largura
   renderizada dentro de `StaffIdentifyFields`, consumido só por `StaffUserDialog`, que é um dos
   quatro diálogos do trio da foto do BD-5. Interferência de comportamento, não de texto.
3. `shared/config/locales/{es-CL,pt-BR,en}.json` — os dois blocos escrevem nos três arquivos.

**Árvores trocadas em relação ao que o `5bf54f3` escreveu, também por decisão dele:** o Login fica no
**main tree** `/home/jvbat/projetos/lotus`, branch `feat/login-fora-do-adr16` criada de `d0cc270`; o
BD-5 fica na worktree `fix-frontend`, onde a branch dele já estava checada. O texto do `5bf54f3`
("main tree, porque o DoD é foto real no S3") descreve uma decisão que este gate substituiu; ele vive
na branch do BD-5 e não foi editado daqui — corrigi-lo é trabalho daquele bloco, não deste.

### Seleção — 2026-08-13

**Item 4 de "Próximos blocos" (`backlog.md:33`), promovido explicitamente pelo João.** O gate do
`/planejar-bloco` reprovou pelo motivo de sempre (BD-1, BD-2, BD-7, BD-8, BD-9, BD-5): o argumento
era **título de seção**, não slug promovido. As três decisões dele fecharam o gate: o slug
`login-fora-do-adr16`; **rota direta a `ready_for_planning` sem Context Packet**; e o main tree.

**A ausência de fonte externa foi medida, não presumida.** Grep por `drive.google`, `notion.so`,
`figma.com` e `docs.google` no `backlog.md` devolve **zero ocorrência**; a única referência externa
do item é o artifact `claude.ai` da análise "Placa de acesso" rev. 2 — saída de agente, não fonte de
regra de negócio —, e as oito decisões, a tabela de escala, a tabela de copy, o degradê sem hex novo
e o destino um a um dos 2 C + 8 B estão **transcritos** em `backlog.md:62-189`. A evidência do
`/lotus-ui-review` de 2026-08-12 **existe no disco**:
`.artifacts/ui-review/2026-08-12T14-38-43-loginpage-wrappers/` com `report.txt` (154 linhas), 6 PNGs
e 4 snapshots YAML. Diretório gitignored, portanto volátil — o registro durável é o texto do backlog.

**A direção decidida entra neste commit.** As 134 linhas do item 4 estavam **não commitadas** no
working tree do main tree quando o comando abriu: decisão durável vivendo onde um `git checkout` a
apagaria. Entram aqui como artefato do mesmo commit da promoção.

### Brainstorming e spec — 2026-08-13

Spec em `docs/superpowers/specs/archive/2026-08-13-login-fora-do-adr16-design.md`. As **D1–D8** vêm fechadas
da direção que o João decidiu sobre a análise rev. 2 e **não foram reabertas**; as **D9–D12** são
desta sessão, cada uma escolhida por ele entre alternativas com o custo medido.

**A medição achou três coisas que o backlog não tinha, e uma delas muda o que o bloco é:**

1. **O login é 2 das 7 entradas da `CATRACA_COR`, e o comentário da lista aponta para este bloco** —
   *"lista que só ENCOLHE. Login e Validação têm fundo escuro deliberado — mudá-las é desenho novo,
   não pagamento de débito (D7)"* (`eslint.config.js:141-151`). Este bloco **é** o desenho novo.
   **D9:** os dois arquivos saem, a lista vai a **5**, e a prova é nos dois sentidos (lição 10) —
   sem as linhas o lint fica verde; com um `text-slate-800` reintroduzido no `LoginForm` ele reprova
   nomeando o arquivo. Numa tela sem teste de componente, é o único mecanismo disponível.
2. **O degradê decidido é fixo nos dois temas por medição:** a escala `--primary-*` é idêntica byte a
   byte nas duas folhas geradas (`--primary-900:#0c3549`). Os contrastes da tabela do backlog foram
   **recalculados** — tagline **9,846:1** — e batem; a divisa invisível do tema escuro também
   (`#0f2b3d` contra `#1e293b` = **1,0016:1**).
3. **A guarda de cor não enxerga o defeito que o bloco mata, e o repositório já escrevera isso**
   (`tokens.ts:11-13`). Dois sítios vivos com a forma exata, ambos a **2,77:1**:
   `FormSection.tsx:19` e `CoursesTable.tsx:43`. **D10:** ficam fora — `FormSection` tem 11
   consumidores, quatro deles os diálogos que o BD-5 reescreve agora, e a lacuna vira linha nova em
   `docs/pendencias.md` em vez de alargar um bloco de login.

**D11** mantém a label própria dos campos (o kit `FormField` pinta label em 14px secundário e
contrariaria a linha "rótulos inalterados" da escala decidida); o erro de campo passa a `dangerText`,
a fórmula de um dono só. **D12** torna a checagem visual pelo navegador **passo de gate bloqueante** —
o bloco é 100% aparência, e é a dívida que o BD-4 declarou e pagou só pela metade.

**Uma pergunta que a spec não adiou para o plano:** o número de chaves do nome acessível do olho da
senha foi medido na API instalada — `password.cjs.js:605,614` tem `passwordShow` **e**
`passwordHide`, dois estados. A via é o `pt` do wrapper e não a locale global do Prime, porque
`locale('es')` nunca é chamado no projeto (`primeLocale.ts` só faz `addLocale`), então um rótulo
pendurado lá ficaria congelado na troca de idioma.

**Baseline medido nesta branch, não herdado:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**29 arquivos / 143 testes** — bate com o placar do merge pós-BD-4, confirmando que a branch nasce da
`main` sem deriva.

**Risco de review declarado BAIXO** pelo gate binário da skill (zero schema, `generated.ts`, Sanctum,
auditoria, RBAC, dinheiro ou documento legal; `executor: claude`) — a tela é a porta do Sanctum mas o
bloco não toca autenticação, e `useLoginForm` fica intocado. O risco próprio, escrito na §9 da spec,
é de alcance: `AppPassword` chega a um call site fora do login e a saída da catraca é permanente.

O estado entrou em `planning` no commit da spec; `active_plan` seguiu `null` até o João ler a spec
escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**O João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-13-login-fora-do-adr16.md`: **dez tasks**, uma por commit, na ordem
degradê → painel de marca → superfícies → tipografia → copy → par credencial → layout mobile →
catraca → pendência → gate.

**A ordem não é a do relatório de review, e o motivo é de dependência:** a Task 8 (catraca) só pode
rodar depois das Tasks 3, 4 e 5, porque são elas que tiram a última utility de cor dos dois arquivos
— tentar encolher a lista antes faz o lint reprovar o próprio bloco. E o degradê vem primeiro para
que as tasks seguintes já meçam contraste contra o fundo definitivo, não contra o celeste.

**Três coisas apareceram só ao escrever o plano, e as três mudam trabalho:**

1. **A divisa do tema escuro precisa de duas larguras, não de uma.** No telefone os painéis empilham,
   então o traço é `dark:border-t`; a partir de `md` eles ficam lado a lado e o traço é
   `md:dark:border-l`. Uma borda só resolveria metade das viewports. A cor vai por
   `style={{ borderColor: 'var(--surface-border)' }}` e fica inerte no claro, onde nenhuma largura é
   declarada — é assim que "só no escuro" vira mecanismo em vez de condicional em JS.
2. **`autoComplete` é repassado ao input pelo Prime, e isso foi verificado na fonte instalada**
   (`password.cjs.js:713`: `autoComplete: props.autoComplete` no `inputTextProps`). Sem essa
   verificação a Task 6 poderia precisar de `inputProps`, que o wrapper não expõe.
3. **A sonda da catraca precisa de guarda contra si mesma.** O passo reintroduz `text-slate-800` por
   `sed`; um `sed` que não casa deixaria a sonda passar **verde** e provaria o contrário do que se
   quer. Por isso o passo grepa a string antes de rodar o lint: sem o grep, "não reprovou" seria
   ambíguo entre "a régua morreu" e "a sonda não foi plantada".

**Baseline medido antes de escrever, não herdado:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **29 arquivos / 143 testes**. Projeção do plano: **inalterado em 29/143** — nenhuma task
escreve teste, porque a superfície inteira está fora do corte do runner, e prometer o contrário seria
cobertura fantasma.

`executor: claude`, sem `paths_autorizados`: o bloco decide apresentação com julgamento de contraste
em vários sítios, atravessa a lei §5.6, mexe no `eslint.config.js` — onde bloco no lugar errado apaga
seletor existente em silêncio (Q-2 de 2026-08-04, reincidente no BD-3) — e a Task 8 remove uma
exceção de lint de forma permanente.

**Um conflito conhecido fica declarado antes de acontecer:** o cabeçalho do plano pede
`subagent-driven-development`, e esta sessão tem regra de não chamar o Agent tool sem pedido — o
mesmo impasse do `rastro-unicidade-e-gates` e do BD-4. Resolve-se no `/executar-bloco`, por pergunta
direta ao João, não aqui.

**Estado: `ready_for_execution`.** `/executar-bloco login-fora-do-adr16` exige instrução posterior do
João.

**Superfície medida do bloco (fato, não desenho):** `LoginPage.tsx`, `LoginForm.tsx`,
`shared/ui/AppPassword/AppPassword.tsx`, `shared/ui/AppLogo/AppLogo.tsx`,
`shared/styles/brand-theme.css` e os três locales. `AppPassword` tem **2 call sites** — `LoginForm` e
`StaffIdentifyFields` —, exatamente o alcance que o backlog escreveu. **Frontend puro: a P-03 não
dispara**, e o backend que serve o `:8080` é o desta branch, que não toca `backend/`.

### Execução — 2026-08-13: início

`/executar-bloco login-fora-do-adr16` (arg recebido com typo, `login-fora-do-adr1`, confirmado com o
João antes de prosseguir) validou as âncoras (spec, plano, `context_packet` `null` coerente com a
ausência medida em §1.1, Git limpo em `8391a6a`, sem divergência) e abriu o gate main tree/worktree:
a decisão de main tree já estava tomada em `state.md` (exceção declarada de dois `active_work_item`,
§"Árvores trocadas"), então nenhuma worktree nova foi criada.

**Mesmo conflito do BD-4 e do `rastro-unicidade-e-gates` reapareceu, e foi resolvido do mesmo jeito:**
o plano recomenda `subagent-driven-development`; a sessão tem regra de não chamar o Agent tool sem
pedido. Escalado ao João via pergunta direta — **subagent-driven-development**, com Agent tool
autorizado para este bloco.

Pre-flight scan do plano (10 tasks contra os Global Constraints e a spec): limpo, sem conflito novo —
a sonda da Task 8 (reintroduz `text-slate-800` de propósito, reverte, confere árvore limpa) é
mecanismo de prova nos dois sentidos, não teste vazio.

Ledger local reiniciado em `.superpowers/sdd/progress.md` (o anterior era do `contrato-de-entrada-identidade-e-nested`, já fechado).

**Estado:** `executing`.

### Execução — 2026-08-13: gate final bloqueado

As Tasks 1-9 fecharam por `subagent-driven-development` (implementador + revisor por task, ledger em
`.superpowers/sdd/progress.md`), com dois desvios registrados no ledger: uma regressão de teste
(`brand-ink.test.ts`, comentário da Task 1 com `${BRAND_COLOR}` literal quebrando a regex do teste,
corrigida em commit próprio `4c7a658`) e um Critical do review da Task 7 (painel de marca mobile
cortando o topo do logo e a legenda de setor inteira, corrigido em `2173681`, altura do `aside` de
250px pra 270px). Nenhuma das duas foi decisão heurística — as duas foram medidas, corrigidas e
reverificadas antes de seguir.

**A Task 10 (gate final, D12) bloqueou no Step 5.** A skill `lotus-ui-review` (e o comando legado
`/revisar-ui`) tem `disable-model-invocation: true` — não pode ser chamada por agente nenhum, só por
invocação explícita do humano na sessão interativa. A checagem visual bloqueante (3 viewports × 2
temas) não foi medida. Stack está de pé (`docker compose up -d` + `pnpm dev` em background,
`localhost:5173/login` respondendo 200) esperando o João rodar `/lotus-ui-review
http://localhost:5173/login` ele mesmo. Steps 1-4 e 6-7 do gate passaram (detalhe completo, inclusive
a ressalva não-bloqueante do Step 4 — dois greps de higiene batendo só em comentário histórico, não
em código vivo — em `.superpowers/sdd/progress.md`, seção "Task 10 — gate final").

**Achado à parte:** a sobreposição com o BD-5 (`usecrudform-mais-fundo`, worktree `fix-frontend`)
que este `state.md` já registrava (§"Árvores trocadas", `AppPassword.tsx`/`StaffIdentifyFields` como
ponto de interferência comportamental) é contexto relevante de que há uma segunda sessão ativa na
mesma área — `AppPassword.tsx` apareceu revertido no working tree (não commitado) por duas vezes
durante a execução, sempre limpo com `git checkout --` antes de qualquer commit deste bloco. Nenhum
commit foi afetado; fica registrado para o João avaliar a causa, não é bloqueio do bloco.

**Estado:** `blocked`. `blocker`: Task 10 Step 5 exige `/lotus-ui-review` ou `/revisar-ui` rodado
pelo João na sessão interativa. `resume_state`: `executing` (retomar `continue_active_plan` — só
fechar a Task 10 e seguir pro review de branch inteira — assim que o Step 5 for medido).

### Execução — 2026-08-13: gate desbloqueado, 4 achados corrigidos, branch revisada

**O João rodou `/lotus-ui-review http://localhost:5173/login` ele mesmo**, que era o único caminho —
a skill tem `disable-model-invocation: true`. O bloqueio saiu por execução, não por decisão. Run em
`.artifacts/ui-review/2026-08-13T16-51-39-loginpage-fora-adr16/` (report.txt, 11 PNGs, 2 snapshots).
Playwright com `--browser=chromium`: o canal `chrome` não existe neste host, e trocar o binário do
Chromium é escolha de mecanismo permitida — a skill proíbe trocar de **ferramenta**.

**Steps 1-4 reproduzidos no gate, não herdados:** lint exit 0, build verde, **29 arquivos / 143
testes**; `git diff main...HEAD -- backend/ generated.ts` com **zero arquivo**, que é o que torna
backend/Pint/`typescript:transform` N/A por escopo medido; catraca provada **nos dois sentidos**
(`text-slate-800` reintroduzido no `<h1>` faz o lint reprovar nomeando arquivo e linha, árvore volta
limpa); greps de higiene batendo **só em comentário histórico**, a mesma ressalva não-bloqueante de
antes e a forma exata do P-36.

**Step 5 — as 8 afirmações do plano, todas medidas no navegador nas 3 viewports × 2 temas:** sem
overflow nas seis combinações; contrastes lidos da tela (tagline **9,84:1**, versão 8,02:1, setor
6,23:1, secundário 4,76:1 claro / 6,21:1 escuro) batendo com a projeção da spec; `LogoDark` nos dois
temas; divisa `border-left` 1px escuro / 0px claro a 1440 e `border-top` equivalente a 390;
`AppearanceControls.bottom` 358,4 ≤ `h1.top` 398,5 a 390; olho em `Mostrar`/`Ocultar contraseña` com
`lang=es-CL`; `username` + `current-password` no DOM; **seis** paradas de Tab com anel visível.

**A revisão achou 4 defeitos que as 8 afirmações não cobriam, e o João mandou corrigir os quatro** —
Step 7 do plano em ação (gate que reprova vira commit próprio antes do review). Um commit por
achado, cada um remedido no navegador:

1. **UI-01 (`ebd0258`)** — o campo de senha **nunca preenchia o container**: 316px contra os 384px
   do e-mail e do botão, as três bordas direitas desalinhadas em toda viewport acima de ~316px. O
   `w-full` do `inputClassName` não alcança o IconField que o Password renderiza por dentro com
   `toggleMask` (`password.cjs.js:737`), e esse nó mede por conteúdo. Vai pelo `pt`, na chave
   `iconField.root` — **não** `iconField.className`, porque o Prime passa `ptm('iconField')` como o
   *pt* do filho, não como props. Medido: 384/384, 326/326 e 256/256, sem overflow.
2. **UI-02 (`21c2c3c`)** — no escuro os dois campos irmãos vinham de famílias diferentes: e-mail
   `rgb(11,18,32)`/`rgb(51,65,85)` da folha de tema, senha `rgb(30,41,59)`/`rgba(255,255,255,0.1)`
   das utilities `dark:` do wrapper. O docblock do `AppInputText` já mandava não empilhar `dark:`
   (ADR-16). As seis utilities saíram; os campos agora batem nos dois temas.
3. **UI-03 (`5e005f1`)** — o `<label>` embrulhava o campo e o olho tem `aria-label` próprio, então o
   nome acessível era "Password  Show password". Trocado por `htmlFor`/`id` (com `inputId` no
   `AppPassword`, porque o `id` cru pousaria no wrapper).
4. **UI-04 (`c3a8f80`)** — o olho era `role="switch"` com `aria-checked` **invertido** (o Prime crava
   `'true'` no showIcon; `password.cjs.js:600-615`), anunciando "Mostrar contraseña, ativado" com a
   senha escondida. Corrigido **pelo papel** — controle cujo nome muda a cada clique é botão —, o
   que mantém de pé os dois rótulos que a spec decidiu a partir da API instalada.

**Uma observação declarada como NÃO introduzida pelo bloco, provada por sonda:** acionar o olho por
teclado devolve o foco ao `<body>`, porque o Prime troca o elemento do ícone e o React remonta.
Idêntico antes e depois da UI-04, medido guardando a mudança no stash.

**Review de branch inteira (`main...HEAD`, 13 arquivos): um achado, verificado à mão antes de agir.**
A correção da UI-03 fechou o login e deixou o **segundo** call site aberto — `FormField` embrulha o
controle em `<label className="block">` sem `htmlFor` (`FormField.tsx:34-36`), então o olho segue
somando no nome do campo dentro do `StaffUserDialog`. **Virou P-37, não commit de código, pelo
precedente exato da D10/P-36:** `FormField` é o kit de form inteiro e está sob reescrita ativa do
BD-5 na worktree `fix-frontend`. O bloco **piorou a forma e não criou o defeito** — antes da Task 6
o olho já concatenava, em inglês. O resto da branch o review confirmou correto por verificação
independente, inclusive que o `aria-checked: undefined` sobrevive ao `mergeProps` do Prime e que
`h-67.5`/`w-17` saem no CSS construído.

**O que o bloco NÃO provou, sem maquiagem:** nenhum teste automatizado cobre a aparência do login
(PrimeReact no jsdom está fora do corte do runner), então a única guarda permanente é a catraca da
Task 8 — que nem enxerga `style={{…}}`, o P-36; a não-regressão do `AppPassword` no `StaffUserDialog`
é **inferência**, não medição, porque o segundo call site vive atrás do login e a revisão é read-only
sem credencial; os estados de erro do login (credencial inválida, erro de campo, `loading`) seguem
não vistos, porque alcançá-los exige submeter credencial e a skill proíbe fabricá-los por mock.

Gate final depois dos cinco commits: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **29
arquivos / 143 testes** — o baseline exato, como o plano projetou.

**Estado:** `ready_for_review`. A próxima instrução aciona `/revisar-sprint`; este comando não a
inicia sozinho.

### Review de sprint — 2026-08-13: BAIXO risco, uma lente, 3 achados

**BAIXO pelo gate binário da skill:** zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal gerado; `executor: claude`. A spec §9 declara o mesmo BAIXO —
sem divergência a mostrar. **Só lente Claude, sem Codex.**

**Gate reproduzido, não herdado do relatório de execução:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **29 arquivos / 143 testes** (o baseline exato, como o plano projetou); as três locales
com **545 chaves cada**; `git diff main...HEAD -- backend/ generated.ts` com **zero arquivo**, o que
mantém backend/Pint/`typescript:transform` N/A por escopo medido; os três arquivos de código abaixo
da régua de 150 (`LoginForm` 86, `LoginPage` 56, `AppPassword` 83); higiene limpa (zero
`console.log`/`debugger`/`1b7fb8`/`w-96` em código vivo).

**A catraca foi provada nos dois sentidos (lição 10), não por lint verde:** `text-slate-800`
reintroduzido no `<p>` do subtítulo faz o lint reprovar em
`LoginForm.tsx:35:22` com `Cor Tailwind hardcoded: Tailwind é layout, cor vem de variável do tema
(ADR-16).`; árvore restaurada e lint de volta a 0.

**Órfãos: zero, conferido por grep.** `--brand-gradient` tem exatamente um consumidor
(`LoginPage.tsx:19`); `BRAND_COLOR` continua vivo em `FormSection.tsx:19` e `CoursesTable.tsx:43`, e
portanto não virou export morto ao sair do login; `common.showPassword`/`hidePassword` são lidas só
pelo wrapper, que é a porta única por desenho; a constante `darkInput` saiu sem deixar consumidor.

**Duas afirmações do bloco foram verificadas na fonte instalada, não aceitas do relatório:**
o `aria-checked: undefined` sobrevive de fato ao `mergeProps` (a função faz `merged[key] = value`
iterando as chaves do objeto de `pt`, então a chave explícita apaga o `'true'` do Prime); e o
`role="button"` não quebra teclado, porque `onToggleMaskKeyDown` (`password.cjs.js:588`) já trata
`Enter` **e** `Space`, que é exatamente o contrato do papel de botão. `h-67.5` e `w-17` materializam
no CSS construído como `calc(var(--spacing) * 67.5)` = 270px e `* 17` = 68px. A escala `--primary-*`
é idêntica nas duas folhas para os quatro degraus que a tela usa (200/300/400/900).

**Os três achados:**

1. **Q-1 🟡 M** — `LoginPage.tsx:16,19`: a faixa de marca mobile tem **altura fixa com
   `overflow-hidden`**, então ela absorve o conteúdo em vez de crescer — e o preço foi pago no
   wordmark, que caiu de 208px (desktop) para **68px** no telefone. Medido no asset (335×466, banda
   do "LOTUS" com 54px e a sub-linha com 23px): a 68px o wordmark tem **11,0px** de altura e a
   sub-linha **4,7px**; a 208px são 33,5px e 14,3px. A causa raiz está escrita no corpo do próprio
   commit `2173681` — o Preflight do Tailwind está desligado (`index.css:7,10`), então cada `<p>` do
   painel carrega 1em de margem de agente de usuário que não colapsa com o `gap` do flex — e **não
   foi removida**: o fix comprou espaço encolhendo a marca. Duas consequências: o `gap-1` do aside
   virou decoração (quem espaça são as margens de UA), e sob zoom de texto o conteúdo volta a cortar,
   que é o defeito Critical que a Task 7 já corrigiu uma vez neste bloco.
2. **Q-2 🟡 P** — `LoginForm.tsx:47-54,64-72`: a UI-03 trocou o `<label>` que embrulhava o campo por
   `htmlFor`/`id` e, com isso, o `<small>` do erro de campo **perdeu a única associação que tinha**.
   O Prime não escreve `aria-invalid` (zero ocorrência em `inputtext.cjs.js`) — `invalid` só pinta
   `.p-invalid` —, então um 422 em `email`/`password` (vivo por `useLoginForm.ts:21`) fica sem
   `aria-describedby` e sem estado: aparece na tela e não existe para leitor de tela. O
   `generalError` não tem o problema, porque o `FormErrorBanner` é `role="alert"`. **O que torna
   isto mecanismo e não acabamento:** a P-37 aponta `LoginForm.tsx:40-70` como "o molde já existe e
   está medido" para consertar o `FormField`, e o embrulho em `<label>` é justamente o que hoje faz
   o `error` do kit ser anunciado (`FormField.tsx:34-46`) — copiar o molde como está tiraria a
   associação de erro de **todo** diálogo do sistema.
3. **Q-3 🟢 P** — `AppPassword.tsx:47-56`: `pt={{ ...pt, ...ariaPt }}` sobrescreve **chaves
   inteiras** do chamador. Pinar depois do spread é o padrão da rule ("pine o override após o
   spread"), mas a granularidade está errada: quem passar `pt.showIcon`, `pt.hideIcon` ou
   `pt.iconField` perde `className`/`style`/handlers junto, em silêncio. Latente — nenhum dos 2 call
   sites passa `pt` hoje —, e o custo de fundir por chave é de minutos.

**O que NÃO virou achado, e por quê:** decisão registrada não é achado — a lacuna da catraca de cor
(P-36), o nome acessível do `FormField` (P-37), a ausência de teste de componente sobre a aparência
do login e a não-regressão do `AppPassword` no `StaffUserDialog` como inferência já estão escritas
como débito declarado. A remoção do `darkInput` foi conferida contra o irmão: o `AppInputText`
também não empilha `dark:`, e o docblock dele manda não empilhar — os dois wrappers ficaram
simétricos, não divergentes.

**Veredito: o bloco está bom.** Vinte e um commits, o gate reproduzido nos números do baseline,
nenhuma lei §5 tocada, nenhuma utility de cor sobrevivendo nos dois arquivos que saíram da catraca.
Os três achados são um de causa-raiz não paga (Q-1), um de mecanismo que vai infectar a P-37 se não
for escrito agora (Q-2) e um de granularidade de merge (Q-3); nenhum é de correção de dado.

**Estado:** `blocked`, `next_action: approve_review_findings`. Só achado aprovado pelo João vira
commit; depois o estado volta a `reviewing` e as checagens pertinentes se repetem.

### Correção dos achados — 2026-08-13: os 3 aprovados, um commit cada

**O João aprovou os três** ("resolva os 3"). Nenhum outro trabalho entrou junto.

**Q-1 (`221f8fb`)** — a causa raiz foi paga onde ela mora: `my-0` nos dois `<p>` do painel mata a
margem de 1em do user-agent que o Preflight desligado deixa de pé, o `aside` virou `min-h-67.5`
(cresce por conteúdo em vez de cortar), o `overflow-hidden` **saiu** (estouro futuro tem que
aparecer) e o wordmark voltou a 150px (`w-37.5 md:w-52`). O badge de versão entra no fluxo no mobile
(`mt-2 md:absolute md:bottom-4`), porque com o painel crescendo um badge absoluto colidiria com a
legenda de setor. **Medido no navegador** (Playwright global, 390×844 e 1440×900): mobile cresceu
270 → **337,7px** com tudo dentro de [0, 337,7] — img 24..232,7 (150×208,7, inteira), tagline
236,7..264,7, setor 268,7..284,7, badge 296,7..313,7 —, `scrollWidth === innerWidth === 390`, o
`gap-1` valendo **4,0px reais** (contra os ~20px que a margem do UA somava sozinha) e a banda
"LOTUS" em **24,2px** com a sub-linha em 10,3px (era 11,0 e 4,7). Desktop sem regressão: logo 208px,
badge em 867..884 dentro dos 900.

**Q-2 (`1952075`)** — cada erro de campo tem `id` e o campo aponta para ele por `aria-describedby`
quando, e só quando, há erro, com `aria-invalid` espelhando o estado que o PrimeReact não escreve.
Os atributos chegam ao `<input>` pelo `getOtherProps` do Prime (`inputtext.cjs.js:191-192`; no
Password, pelo `inputProps` de `password.cjs.js:699`). **Provado nos dois sentidos contra o backend
real** — o que a revisão não pôde fazer por ser read-only: `POST /api/login` com credencial
inexistente devolve **422** e o `#login-email` fica `aria-invalid="true"` com
`aria-describedby="login-email-error"` resolvendo para "These credentials do not match our records.",
enquanto o `#login-password`, sem erro na mesma resposta, permanece `aria-invalid="false"` e **sem**
`describedby`. O nome acessível do campo continua sendo só "Email" — a UI-03 não regrediu. Isso
fecha o buraco "estados de erro do login seguem não vistos" que o bloco havia declarado.

**Q-3 (`38b948d`)** — a fusão do `pt` passou a ser chave a chave e em profundidade, com o que o
wrapper crava vencendo folha a folha; nó aninhado (`iconField.root`) funde sem descartar o irmão e
valor de função do chamador é **composto**, não descartado. O helper mora em `shared/ui/mergePt.ts`,
fora do barrel, e o `AppDataTable` — que já tinha a versão local de um nível só — passa a usar o
mesmo: duplicar a versão profunda ao lado dela era o padrão que o próprio review reprova. **Provado
nos dois sentidos:** `mergePt.test.ts` (7 casos) passa e, com o corpo do helper trocado pelo spread
raso de antes, **4 dos 7 falham por nome** (folha do chamador na mesma chave, nó aninhado, valor de
função, base sem `pins`). A P-37 ganhou a linha que faltava: copiar o molde **inteiro**, não só o
`htmlFor`.

**Gate repetido depois dos três commits:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**30 arquivos / 150 testes** (+1 arquivo, +7 casos sobre o baseline de 29/143 — a diferença é o
`mergePt.test.ts`, e nenhum teste existente mudou de resultado); os cinco arquivos tocados abaixo da
régua de 150 (`LoginForm` 96, `LoginPage` 69, `AppPassword` 89, `mergePt` 40, `AppDataTable` 123, que
**encurtou**). Zero arquivo de backend ou `generated.ts` no diff, como antes.

**Estado:** `ready_for_closure`. `/fechar-sprint` é passo explícito do João — este turno não o
executa.

### Fechamento — 2026-08-13

**Item 0 — critério de aceite DESTE bloco, provado, não a higiene genérica.** O bloco é 100%
aparência, então o critério é a §7.3 da spec, e ela foi **remedida depois** dos três commits de
correção do review — a checagem visual anterior do João era de antes do Q-1, que mudou a geometria do
telefone. Playwright global (`@playwright/cli`, já instalado; nada baixado para o gate), **três
viewports × dois temas**, `lang=es-CL`, contra o dev server real:

1. `scrollWidth == innerWidth` em 1440×900, 1024×768 e 390×844, nos dois temas — o C-2 fechado onde
   foi medido;
2. **contrastes lidos no navegador**, não herdados da tabela da spec: contra o degradê renderizado, no
   pior dos dois extremos (`--primary-900` e `--brand-navy` resolvidos em runtime), tagline **9,84**,
   setor **6,23**, versão **8,02**; sobre `--surface-card`, `h1` 10,35 (claro) / 14,63 (escuro),
   subtítulo e ajuda **4,76** (claro) / 14,63 (escuro) — todos acima de 4,5;
3. wordmark é `LogoDark.png` nos dois temas (o painel é escuro em ambos, por construção), com a banda
   "LOTUS" em 24,2px no telefone — o C-1 fechado;
4. **divisa** exatamente como a §4.2 desenhou: no claro `border-top` e `border-left` **0px** nas três
   viewports; no escuro `border-left: 1px` a partir de `md` e `border-top: 1px` a 390px, em
   `rgba(255,255,255,.1)`;
5. par idioma/tema fora da faixa do `h1` a 390px: `controls.bottom` 441,7 ≤ `h1.top` 481,7 (folga de
   40px), nos dois temas — o UI-10;
6. `aria-label` do alternador de senha em **"Mostrar contraseña"** com `lang=es-CL`, `role="button"` e
   **sem** `aria-checked` — o UI-08 e o UI-04 juntos;
7. zero elemento do `aside` fora do retângulo do `aside` em qualquer das seis combinações.

**A não-regressão do `AppPassword` deixou de ser inferência.** A revisão declarou o buraco: o segundo
call site vive atrás do login e a revisão é read-only. O fechamento **logou** (`admin@lotus.cl`, senha
de seeder), abriu o diálogo de criação em `/administracion` e mediu: o input de senha tem **292,0px**,
o mesmo dos irmãos da coluna do grid 2×2 (`name`/`rut`, de linha inteira, 600px) — a troca de `w-96`
por `w-full` não encolheu nem estourou nada, e o olho de lá também responde `role="button"` /
"Mostrar contraseña". A §7.2 fica **medida**.

**Itens 1–4.** Suíte de backend `docker compose exec -T app php artisan test`: **591 passed, 5
skipped**, exit 0 — rodada por disciplina, não por escopo. Front, de `frontend/`: `pnpm lint` exit 0,
`pnpm build` verde, `pnpm test` **30 arquivos / 150 testes**. **Pint e `typescript:transform` são N/A
por escopo medido, não por suposição:** `git diff --name-only main...HEAD -- backend/
frontend/src/shared/types/generated.ts` devolve **zero arquivo** (o diff inteiro do bloco são 16
arquivos, todos em `docs/` e `frontend/src`), então não há arquivo de backend para formatar nem DTO
que regenere tipo — e `generated.ts` segue intocado, como a lei §5.3 exige.

**Item 5 — código morto.** Nada órfão sobrou do bloco: `w-17` **zero** ocorrências (morreu com o Q-1),
`darkInput` **zero** (removido na UI-02), `--brand-gradient` com exatamente **um** consumidor mais a
definição, `mergePt` com dois consumidores de produção (`AppPassword`, `AppDataTable`) mais o teste,
nenhum `.gitkeep` ou placeholder adicionado. As chaves novas de locale continuam sendo lidas só pelo
wrapper, que é a porta única por desenho (UI-08).

**Item 6 — leis §5.** Nenhuma contrariada: zero import de `primereact` em `src/features` e zero
import cruzado `@features/*` dentro de `src/features` (§5.6, conferido por busca, não por memória);
`generated.ts` intocado (§5.3); nada de auth, auditoria, RBAC, financeiro ou schema no diff.

**Item 7 — pendências.** Nasceram duas neste bloco, ambas já registradas com decisão do João: **P-36**
(a catraca de cor não enxerga `style={{…}}`, com os dois sítios a 2,77:1) e **P-37** (o `FormField`
soma o nome acessível). A **P-37 ganhou linha nova** no fechamento: copiar o molde do login
**inteiro** — trocar o `<label>` que embrulha por `htmlFor`/`id` obriga a levar junto o
`aria-describedby` condicional e o `aria-invalid`, senão o kit perde a associação de erro que hoje ele
tem de graça. Nenhuma pendência fechou e **nenhum gatilho venceu**: o vencimento mais próximo é
2026-09-30.

**Item 8 — arquivamento.** `plans/2026-08-13-login-fora-do-adr16.md` →
`plans/archive/`; `specs/2026-08-13-login-fora-do-adr16-design.md` → `specs/archive/` (spec não
compartilhada: nenhum outro work item atual ou futuro a cita). As duas referências narrativas deste
arquivo foram apontadas para os paths novos.

**O que o bloco NÃO provou, sem maquiagem:** segue sem **teste automatizado de aparência** — o único
teste novo é o do `mergePt`, que é função pura; a guarda permanente da cor continua sendo a catraca,
que não vê `style={{…}}` (a P-36). Os contrastes do degradê são o **pior caso entre os dois extremos**
da interpolação, não uma amostra de pixel sob cada glifo. O `StaffUserDialog` foi medido em largura e
papel do olho, **não** no nome acessível do campo — que é justamente a P-37, e continua aberta. E o
`/lotus-ui-review` do João é a lente humana do desenho; o que este fechamento fez foi medição
instrumental dos sete itens acima, que é prova de geometria e de contraste, não juízo estético.

**Estado: `idle`.** Nada foi promovido — o próximo item é escolha do João, no `backlog.md`.

### Merge com a `main` — 2026-08-13: código limpo, e a resolução do `state.md` corrigida depois

Segunda vez que duas sprints fecham em paralelo a partir da mesma base (`d0cc270`), e desta vez o
**BD-5 foi à `main` primeiro** (PR #47, `d29246a`, fast-forward puro) e o login absorveu a `main` por
**merge, nunca rebase** (PR #48, `14bd7fd`) — replayar reescreveria SHAs que o `progress.md` e este
arquivo citam nominalmente.

**Colisão de código: zero.** O conflito real foram **4 arquivos, todos em `docs/`**. A árvore da
`main` em `14bd7fd` é idêntica à do merge `ae4eef9`, e o gate nela passa: `pnpm lint` 0, `pnpm build`
verde, `pnpm test` **32 arquivos / 163 testes** (30/150 do login mais os 2 arquivos e 13 casos do
BD-5). `AppPassword` ficou na versão do login, com `mergePt`; o `FormField` o BD-5 não tocou, então os
ponteiros da **P-37** (`FormField.tsx:36`, `StaffIdentifyFields.tsx:83`) seguem válidos.

**`pendencias.md` e `backlog.md` saíram corretos** e foram conferidos linha a linha, não presumidos:
a `main` inteira mais as duas linhas do login (**P-36**, **P-37**), com a **P-03** na versão longa que
o fechamento do BD-5 escreveu (a contraprova) e o molde da P-37 intacto — nada perdido de nenhum
lado, e **nenhum ID duplicado**, porque o fechamento do BD-5 não criou pendência (o resíduo do Q-4
virou débito). No `backlog.md`, o item 4 (login) saiu e o texto novo da `main` sobreviveu ("BD-5
entregue", "resta o BD-6", `### BD-5` removido), sem menção órfã a nenhum dos dois.

**O `state.md` saiu com dois defeitos de resolução, e eles não foram descobertos pelo merge — foram
descobertos por conferência posterior.** (1) Dois `## Último item fechado` no mesmo arquivo, login e
BD-5, com **quatro** seções fechadas onde a convenção mantém **três**: a rotação simplesmente não foi
aplicada. (2) O frontmatter ficou com o BD-5 (`last_completed_work_item: usecrudform-mais-fundo`,
basis `f766860`), embora o login tenha fechado **depois** — `5f22df9` às **17:59** contra `960ac96`
às **19:26**, medido nos commits, não deduzido da ordem de merge. Corrigido aqui: a cadeia rotacionou
(login → Último, BD-5 → Penúltimo, BD-4 → Antepenúltimo, `contrato-de-entrada-identidade-e-nested`
sai da cadeia de três e sobrevive no `progress.md`), e o frontmatter voltou ao login com basis
`024673a`. **É a mesma classe do BD-4 × BD-9:** lá o auto-merge deixou passar uma afirmação vencida
por ausência de sobreposição textual; aqui o conflito foi visto e resolvido, mas resolvido **sem
aplicar a convenção do arquivo**. Ausência de conflito não é acordo, e presença de conflito não é
garantia de resolução correta.

**O `progress.md` também passou do teto** que ele mesmo declara — 11 linhas para dez —, e a entrega
mais antiga (`2026-08-10 · Documentos oficiais`) desceu para o `progress-archive.md` **verbatim**. A
ordem das duas linhas de 2026-08-13 foi trocada para seguir a hora de fechamento: o BD-5 fechou antes
do login.

## Penúltimo item fechado — 2026-08-13 (`usecrudform-mais-fundo`, BD-5)

### Seleção — 2026-08-13

**BD-5 do `backlog.md:131`, promovido explicitamente pelo João** com o estado em `idle` e
`active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre (BD-1, BD-2,
BD-7, BD-8, BD-9): o argumento era **título de seção**, não slug promovido. As três decisões dele
fecharam o gate: o slug `usecrudform-mais-fundo`; **rota direta a `ready_for_planning` sem Context
Packet**; e **main tree `/home/jvbat/projetos/lotus`, sem worktree**, na branch
`feat/usecrudform-mais-fundo` criada de `d0cc270`.

**A ausência de fonte externa foi medida, não presumida:** grep por `drive.google`, `notion.so`,
`figma.com`, `docs.google` e `http` nas 22 linhas do BD-5 devolve **zero ocorrência**. As fontes são
o repositório e o próprio texto do backlog, que já traz paths e IDs (`Q-4` dos achados de
2026-08-05, o débito do trio da foto, os 4 hooks fora do `useCrudForm`).

**O main tree venceu a worktree por causa do DoD, não por costume.** O BD-5 é frontend por escopo de
escrita, mas o DoD escrito é **foto real chegando no S3** — exige `app` + MinIO de pé, e é o main
tree que serve o `:8080`. No BD-4 a worktree não pôde subir stack própria (P-03) e **dois passos do
gate ficaram sem prova**; aqui o custo foi antecipado em vez de pago. **Esta decisão caiu horas
depois — ver §"Divergência de estado" abaixo.**

**`state_basis_commit` passa de `7c28699` a `d0cc270`** — o fechamento do BD-4 registrou o merge do
PR #46, que é o HEAD atual da `main`. Não era divergência: com `active_work_item` `null` não havia
trabalho ativo cujo baseline pudesse ter derivado.

### Divergência de estado — 2026-08-13: dois `active_work_item` promovidos em paralelo

A invariante "existe no máximo um `active_work_item`" **quebrou**, e não foi resolvida por
heurística. Duas sessões promoveram itens distintos **a partir do mesmo `d0cc270`**, no mesmo
repositório: `5bf54f3` (12:32, este bloco, branch `feat/usecrudform-mais-fundo`) e `0e3ce3b` (13:05,
`login-fora-do-adr16`, branch `feat/login-fora-do-adr16`) — a segunda **não** descende da primeira.
Cada branch ficou com um `state.md` afirmando que o item ativo é o outro. Precedente exato: os dois
`ready_for_closure` de 2026-08-10, também resolvidos por decisão do João.

**O que a sessão paralela mudou de fato:** o main tree `/home/jvbat/projetos/lotus` passou à branch
de login, e a worktree `fix-frontend` foi movida do detached HEAD para
`feat/usecrudform-mais-fundo`. **Nada foi perdido e nada alheio foi tocado:** `5bf54f3` sobrevive, a
spec deste bloco foi preservada e movida para a worktree antes de qualquer commit — ela chegou a ser
escrita dentro do main tree, que naquele momento já servia a branch alheia —, e o main tree ficou
limpo.

**Decisão do João (D6): as duas execuções correm em paralelo** — o BD-5 na worktree `fix-frontend`,
o `login-fora-do-adr16` no main tree `lotus`. A invariante fica com **exceção declarada, não
resolvida**, e o custo do precedente BD-4 × BD-9 é **aceito de antemão** em vez de descoberto no
merge: os `state.md` conflitam, e `backlog.md`/`pendencias.md` auto-mesclam sem sobreposição textual,
que é exatamente como uma afirmação vencida passou verde naquele bloco. Recusadas: pausar o BD-5, e
o login ceder a vez.

**Consequência: a D3 do gate caiu, e um grau pior do que no BD-4.** O bloco perde o main tree como
área de trabalho e passa a usá-lo **só como servidor** do `:8080` para o e2e do S3 — exatamente o
custo que a escolha original existia para evitar. E lá não há uma branch parada, e sim **execução
ativa**: a prova do DoD só vale com `git diff main...HEAD -- backend/` **vazio** naquele tree,
conferido **no momento da prova**, não no início do bloco. O banco de dev também é compartilhado
pelas duas execuções. É a **P-03** aparecendo pela segunda vez seguida num bloco de frontend.

### Brainstorming e spec — 2026-08-13

Spec em `docs/superpowers/specs/archive/2026-08-13-usecrudform-mais-fundo-design.md`, com **seis decisões**
(D1–D6), cada uma escolhida pelo João entre alternativas apresentadas com o custo medido.

**O terreno foi medido antes de desenhar, e quatro afirmações do backlog não sobreviveram:**

1. **`useQuoteForm` não é candidato legítimo** — reprova pelo mesmo critério que exclui o
   `useTurmaConfigForm`. `useCreateQuote` recebe `{ budgetId, payload }` e `useUpdateQuote`
   `{ quoteId, payload }`, então não satisfaz `MutableResource`; a cotação nasce em rota aninhada. E
   as outras duas razões que o `backlog.md:304-306` dá para ele também são falsas: **não** manipula
   coleção nested (sete escalares, sem "itens da cotação") e **não** usa `setForm`.
2. **A absorção do trio não cabe inteira no `useCrudForm`** — metade é JSX, e o quarto diálogo não
   roda sobre o hook (`useRedatorForm` usa `useEntityForm` direto). Absorver só no hook cobre 3 de 4.
   O bloco JSX, esse sim, é idêntico **byte a byte nos quatro** sítios.
3. **`useCourseForm` cabe, mas só com o hook mais fundo de verdade:** `createdIdRef` (não recriar
   curso quando a segunda chamada falha), `pending` de três mutações, `fieldErrors` de três fontes.
4. **O texto do Q-4 está impreciso** — o `SignedUrlTransformer` roda na serialização, então o front
   recebe URL pré-assinada, não "um caminho interno de storage". O defeito real é outro e continua
   valendo: `PUT` com `photo_url` devolve **200**, porque a promoção no construtor desvia do
   `CannotSetComputedValue`.

**Dois fatos mediram o desenho em vez de o justificarem depois:** a guarda de classificação que já
existe **barra o `...form` ingênuo** (reprovaria com "chave de payload sem classificação:
`photo_url`") — o buraco do Q-4 é quem **classifica** a chave e passa, e é esse o buraco que a D4
fecha; e `StaffUserDialog` está em **150 linhas, margem zero** na régua, então a absorção é o que lhe
devolve folga.

**As decisões que mudam trabalho:** só `useCourseForm` migra (D1); a absorção mora em dois sítios,
`useCrudForm` com `photo` e um `FormPhotoRow` novo em `shared/ui` (D2); o `afterCreate` vira
**retentável**, com o `submit` pulando o create no resubmit, e `createdIdRef` morre (D3); a guarda do
Q-4 é chave proibida no payload, que **nenhuma classificação salva** (D4); e o hook devolve `busy`
derivado, sem contaminar `pending` — somar `photo.pending` faria o botão de salvar girar por upload
de foto, que é a crítica Q-7 do bloco de documentos oficiais (D5).

**Baseline medido, não herdado:** `pnpm test` = **29 arquivos / 143 testes**, exit 0 — bate com o
gate pós-merge, sem deriva.

**Risco de review BAIXO** pelo gate binário: zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal; `executor: claude`. O risco próprio é de **alcance** e está
declarado: `useCrudForm` tem cinco consumidores e o `submit` muda para todos — a rede é que
`photo.flush` não lança, mas isso é premissa a provar, não a assumir.

O estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até o João ler a
spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**O João aprovou a spec com uma correção — a D6 — e o restante sem mudança.** O plano saiu em
`docs/superpowers/plans/archive/2026-08-13-usecrudform-mais-fundo.md`: **onze tasks**, uma por commit, na
ordem guarda do Q-4 → mutações extras → `afterCreate` retentável → composição da foto → componente
de `shared/ui` → os três diálogos que migram → Redator → curso → gate.

**Baseline medido em `4284ff7`, não herdado:** `pnpm test` = **29 arquivos / 143 testes**, lint exit
0, build verde. Projeção do plano: **31 arquivos / 156 testes** (2 arquivos e 13 casos).

**Um desvio apareceu só ao escrever o plano, e ele muda o construído (D-P1).** A D2 diz
"`useCrudForm` ganha `photo`", e isso é **impossível na forma literal** — por regra do React, não por
gosto: `useEntityPhoto` chama `useQueryClient`, `useState`, `useEffect` e dois `useMutation`.
Montá-lo condicionalmente violaria as regras dos hooks; montá-lo sempre faria `useQueryClient()`
lançar `No QueryClient set` nos oito testes atuais de `useCrudForm.test.ts`, que rodam **sem**
`QueryClientProvider` de propósito — o `fakeResource` é literal estrutural, e é isso que mantém
aquele arquivo sem TanStack. A capacidade nasce como hook **irmão**, `useCrudFormWithPhoto`, que
compõe os dois na ordem certa. O efeito para os três diálogos é o que a D2 pede: o `afterCreate` de
foto some do sítio de chamada, e `photo`/`busy` chegam prontos. `useBudgetForm` e `useRoleForm`, sem
foto, seguem no `useCrudForm` puro.

**Duas outras coisas que a escrita do plano fixou:** a guarda do Q-4 roda **antes** da checagem de
classificação contraditória, para que a chave proibida ganhe a mensagem certa mesmo quando também
estiver duplamente classificada; e a sonda que a prova tem de ser feita no `useClientForm`, não no
`useStudentForm` — `StudentFormFields` não tem `photo_url`, então `...form` lá reprova no `tsc`, que
é o vermelho errado.

**Uma divergência de projeção ficou declarada em vez de corrigida retroativamente:** a spec projeta o
`useCourseForm` em ~110 linhas e o plano em ~115, pela diferença do docblock do `afterCreate`, que
não existia quando a spec foi escrita.

`executor: claude`, sem `paths_autorizados`: o bloco muda o `submit` de um hook com **cinco**
consumidores, decide apresentação em quatro telas, tem na Task 10 um julgamento que só aparece
rodando (o `crud.form` lido dentro do `afterCreate`), e fecha por prova contra API real num ambiente
compartilhado com outra execução ativa.

**Estado: `ready_for_execution`.** `/executar-bloco usecrudform-mais-fundo` exige instrução posterior
do João.

### Execução — 2026-08-13: início

`/executar-bloco usecrudform-mais-fundo` validou as âncoras (spec, plano, `context_packet` `null`
coerente, Git limpo em `f9e1263`, sem divergência) e confirmou o gate main tree/worktree já resolvido
pela D6: bloco frontend-only, worktree `/home/jvbat/projetos/fix-frontend` na branch
`feat/usecrudform-mais-fundo` é o isolamento certo — o main tree segue com a execução paralela do
`login-fora-do-adr16` (D6), sem escrita nenhuma aqui.

**Mesmo conflito do `catraca-max-lines-e-moldura` (BD-4) reapareceu, e foi resolvido do mesmo jeito:**
o plano recomenda `subagent-driven-development` (Handoff: `executor: claude`, sem
`paths_autorizados` — cinco consumidores do `submit`, apresentação em quatro telas, julgamento em
runtime na Task 10); a sessão tem regra de não chamar o Agent tool sem pedido. Escalado ao João via
pergunta direta — **subagent-driven-development, com Agent tool autorizado para este bloco.**

**Pre-flight scan do plano (onze tasks contra Global Constraints e a spec) achou um ponteiro
fantasma:** o comentário previsto para `useCrudForm.ts` na Task 3 citava `(spec D10)`, herdado
verbatim do plano arquivado `2026-08-05-profundidade-form-crud-e-hidratacao-dto` — cuja spec tem D10
("o id do update vem da entidade"); a spec deste bloco só tem D1–D6. Mesma classe da Q-4 do review do
BD-4 e da correção da Task 9 dele, um passo antes: pego no pre-flight, não no review. João escolheu
tirar a citação em vez de reescrevê-la ou deixar como está. Corrigido no plano em `0ef104f`, antes de
qualquer código.

Ledger local reiniciado em `.superpowers/sdd/progress.md` (o anterior era do BD-4, já fechado — as
onze tasks deste bloco colidiriam de nome com as dez dele; arquivado em
`.superpowers/sdd/archive/catraca-max-lines-e-moldura/`).

**Estado:** `executing`.

### Execução — 2026-08-13: fechamento

**As onze tasks fecharam, cada uma em commit próprio, revisão individual aprovada antes de avançar:**
`6ff9565` (T1 — guarda Q-4, sonda real em `useClientForm.ts` provando os dois sentidos), `67153e5`
(T2 — `extra` soma pending/erro de mutações extras), `dce04ef` (T3 — `afterCreate` retentável via
`createdRef`, curso/entidade não nasce duas vezes no resubmit), `fc88d61` (T4 —
`useCrudFormWithPhoto`, hook-irmão por regra de hooks do React, desvio D-P1 declarado na spec),
`7815152` (T5 — `FormPhotoRow`, extração byte a byte conferida contra os 4 sítios originais),
`2d82018`/`5c8dff0`/`69dcba0` (T6/7/8 — Student/Client/StaffUser perdem o trio, `StaffUserDialog`
saiu de exatamente 150 para 125 linhas), `4b998d0` (T9 — Redator adota só o `FormPhotoRow`,
`useRedatorForm` explicitamente não migra por ser create multipart, comentário do ponteiro do BD-5
corrigido), `023be10` (T10 — `useCourseForm` migra para `useCrudForm`, `createdIdRef` morto, task de
maior peso legal do bloco: guarda anti-duplicação de curso provada por leitura direta do mecanismo,
não só pelo relatório do implementador). Um commit fora de task, entre T3 e T4: `ae86d0a`, corrigindo
type errors residuais que T2 e T3 deixaram passar porque `vitest run` não faz type-check completo —
lição registrada no ledger para não repetir. Task 11 foi gate — verificação pura, **sem commit de
produção**, relatório em `.superpowers/sdd/task-11-report.md` (local, não versionado). Contagem
final: frontend **31 arquivos / 156 testes** (29/143 no baseline), bate exatamente com a projeção do
plano.

**O DoD 1 (foto real no S3) foi provado nos dois caminhos contra a API real do main tree**, sessão
Sanctum de verdade (`admin@lotus.cl`, cookie + CSRF): `create` (aluno novo) e `edit` (aluno
existente), com `Content-Length` de 68 bytes confirmado via GET na signed URL nos dois casos — não a
falha de zero-byte da lição 6. Registros de teste limpos por `DELETE .../photo` (remove do S3) e
`forceDelete` via tinker, molde do BD-2; `audits` remanescente declarado, não limpo.

**Duas divergências do texto do plano, investigadas e explicadas, nenhuma achado de código:** os
greps de verificação (Tasks 9, 10 e 11) esperavam `ZERO` para padrões que sobrevivem de propósito em
`RedatorDialog.tsx` (hook que não migra, por critério) e num comentário documental de
`useCrudForm.ts` — o texto do plano não previu esses hits legítimos; e o curl de exemplo da Task 11
sem `Accept: application/json` cai num 500 (`Route [login] not defined`, o app não tem rota web de
login por RN-01) em vez do 401 esperado — o client axios real sempre manda esse header, então isso
nunca acontece em produção.

**O que o bloco NÃO provou, sem maquiagem:** nenhum diálogo tem teste de componente — a composição
`FormPhotoRow` + diálogo (Tasks 6-9) não é exercitada por teste automatizado, só os hooks; a Step 6 do
gate proveu o fluxo de foto contra a API direto, não através do `AppPhotoField`/`FormPhotoRow`
renderizado; e `/lotus-ui-review` não rodou — os quatro diálogos migrados nunca foram vistos no
navegador nesta execução.

**Estado: `ready_for_review`.** Este comando não inicia review — a próxima instrução do João aciona a
revisão do trabalho ativo.

### Review de sprint — 2026-08-13: BAIXO risco, uma lente, 1 achado

**BAIXO pelo gate binário da skill, confirmado, não herdado da spec:** zero schema, `generated.ts`,
Sanctum, auditoria, RBAC, dinheiro escrito ou documento legal gerado; `executor: claude`. Só lente
Claude, sem Codex.

**Gate reproduzido, não herdado do relatório de execução:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **31 arquivos / 156 testes** — bate exato com a projeção do plano.
`git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts` devolve
**zero linha**. Os seis arquivos-alvo (`StaffUserDialog`, `StudentDialog`, `ClientDialog`,
`RedatorDialog`, `RedatorUserSection`, `useCourseForm.ts`) pousaram em
**125 / 97 / 97 / 127 / 40 / 129** linhas, todos com folga da régua de 150.

**Órfãos: zero.** `FormPhotoRow` em 7 arquivos (4 consumidores + componente + 2 barrels),
`useCrudFormWithPhoto` em 6 (3 hooks + hook + teste + barrel), conferido por grep.

**O trio morreu nos três que migraram, sobrevive no quarto por critério:**
`closeBlocked={pending || photo.pending}` tem **uma** ocorrência, em `RedatorDialog.tsx:70` — o hook
do redator não migra (multipart, fora de escopo por D2), exatamente o esperado pela Task 9 Step 4.
`createdIdRef` só sobrevive em comentário documental de `useCrudForm.ts:148`, citando o mecanismo que
substituiu — mesma classe de hit legítimo já registrada no fechamento do BD-4.

**As extrações foram conferidas contra o diff, não presumidas:** os quatro sítios do `FormPhotoRow`
e as três migrações para `useCrudFormWithPhoto` batem com a Task 5/6/7/8 do plano, byte a byte no
JSX. `useCourseForm.ts` bate com a Task 10: `createdIdRef` morto, `sync.mutateAsync` dentro do
`afterCreate`, `extra: [sync]` somando `pending`/`fieldErrors`, `crud.form.redator_ids` lido no
momento da chamada (fechamento correto, não capturado cedo — sem o desvio do `useRef` que a Task 10
previu como contingência).

**O único achado:**

1. **Q-1 🟡 P** — `useCrudForm.ts:159-165`, `runAfterCreate`:
   ```ts
   async function runAfterCreate(created: T) {
     try {
       await afterCreate?.(created)
     } catch {
       return
     }
     onDone()
   }
   ```
   O `catch` engole **qualquer** erro de `afterCreate`, sem log nenhum. O próprio docblock admite a
   premissa: "o erro já está no `fieldErrors` da mutação que falhou" — mas isso é contrato do
   chamador, não garantido pelo tipo de `afterCreate?: (created: T) => void | Promise<void>`. Hoje a
   premissa se sustenta nos 3 caminhos que alcançam este código (`photo.flush` não lança de
   propósito; `useCourseForm.sync` está em `extra`, rastreado). Mas o hook é `shared/hooks`, tem
   **5 consumidores**, mexe em registros de peso legal (curso, cliente, aluno) — se um consumidor
   futuro (ou uma falha do próprio `sync`/`afterCreate` fora do que `extra` cobre) lançar algo não
   rastreado, o diálogo trava aberto sem nenhuma mensagem visível e sem rastro de console. É a classe
   "vazio silencioso" que o projeto já pagou caro (lição 6; Q-1 do review do BD-4,
   `RedatorDocumentsSection.tsx` com `removeDoc.error` nunca lido). Não registrado em nenhuma spec,
   plano ou pendência como debt aceito. Sênior faria: `console.error` no branch do catch, sinal
   mínimo de dev quando a premissa falhar. **Fere:** catálogo universal (catch vazio).

**O que NÃO virou achado, e por quê:** ausência de teste de componente para a composição
`FormPhotoRow` + diálogo, e `/lotus-ui-review` não executado — ambos já declarados como débito
explícito no fechamento da execução (§"O que o bloco NÃO provou"), não achado novo.

**Veredito: o bloco está bom.** Onze commits, cada um batendo com a task correspondente do plano,
nenhuma extração divergiu do original, nenhum órfão. O achado único é de robustez de mecanismo
genérico, não correção ativa — nenhum dos 5 consumidores atuais o alcança hoje.

**Q-1 aprovado e corrigido — commit `f766860`.** `console.error` no branch do catch de
`runAfterCreate`, sinal mínimo de dev quando a premissa do `fieldErrors` falhar. Gate reproduzido
pós-fix: lint 0, build verde, 31 arquivos / 156 testes — sem mudança de contagem.

**Estado: `ready_for_closure`.**

### Fechamento — 2026-08-13

A árvore já estava limpa em `f766860` (a correção do Q-1 entrou commitada), que segue como
`state_basis_commit` — nada pendente a commitar antes de arquivar.

**O item 0 foi refeito contra a API real, não herdado do relatório de execução nem do review.** A
D6 exigia que a parificação da stack fosse conferida **no momento da prova**, e foi: o main tree
`/home/jvbat/projetos/lotus` está na branch alheia `feat/login-fora-do-adr16`, e
`git diff main...HEAD -- backend/` lá devolve **zero linha** — o `:8080` serve o mesmo backend que a
`main`, então a medição é desta stack e não de outra. `/api/students` sem cookie devolve **401**.
Com sessão Sanctum viva (cookie + CSRF, `Origin` e `Accept` nos dois lados), os **dois caminhos** do
DoD 1 foram provados: **`create`** (aluno novo, id 58, foto subida contra o id devolvido — o que o
`flush` faz) e **`edit`** (aluno pré-existente, id 37), ambos com `POST .../photo` **204** e
`photo_url` não nulo na leitura seguinte. **A prova não parou no 200:** o GET na signed URL devolveu
`http=200 bytes=70 type=image/png` nos dois, que é a falha de zero byte da lição 6 medida em vez de
assumida; os objetos existem em `/data/lotus/user-photos/49` e `/91` no MinIO.

**Limpeza declarada, não maquiada:** `DELETE .../photo` nos dois (o aluno 37 volta a
`photo_url: null`, exatamente como estava antes da sonda, e os dois objetos somem do MinIO), e o
aluno 58 mais o user 91 saíram por `forceDelete` via tinker, com a linha de `student_client_logs`
antes. Restam **7 linhas de `audits`** apontando para ids que não existem mais — declaradas, não
limpas, molde do BD-2.

**O resíduo de backend do Q-4 foi medido no próprio fechamento, e continua vivo:**
`PUT /api/students/37` com `"photo_url":"http://evil/x.png"` no corpo devolve **200**, e o campo
volta `null` na resposta — a promoção no construtor do DTO desvia do `CannotSetComputedValue`, então
chave `#[Computed]` no corpo é ignorada **sem 422**. O BD-5 era frontend-only por escopo declarado e
fechou só a metade dele (`FORBIDDEN_PAYLOAD_KEYS` faz a chave lançar em DEV); a outra metade virou
linha própria em `## Débitos técnicos`, com saída no próximo bloco de backend que tocar DTO com campo
computado. Medido em `StudentData`, não no `ClientData` que o texto original do Q-4 nomeava — a
promoção é a mesma nos quatro DTOs com foto, e a sonda escolheu o alvo sem coleção nested para não
arriscar dado de seed.

**A régua foi provada nos dois sentidos (lição 10), não herdada do review:** 30 linhas em branco
apensadas ao `StaffUserDialog` fazem o lint reprovar com
`File has too many lines (155). Maximum allowed is 150`, e a árvore volta limpa em seguida.
Ferramentas: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **31 arquivos / 156 testes**. Alvos
em **125 / 97 / 97 / 127 / 129** linhas, todos sob 150. Órfãos zero (`FormPhotoRow` em 7 arquivos,
`useCrudFormWithPhoto` em 6). Leis §5 limpas por grep: zero `primereact` em `features/`, zero import
cross-feature, `generated.ts` sem diff. **Pint e `typescript:transform` são N/A por escopo medido:**
`git diff main...HEAD` de `backend/` e de `generated.ts` devolve zero arquivo, e o diff do bloco não
tem um `.php`. A suíte backend **rodou** — **591 passed, 5 skipped (2149 assertions)** — mas mede o
código da `main`, porque o container monta o main tree; é evidência de que nada quebrou, não prova
deste bloco.

**Pendências: nenhum gatilho venceu, nenhuma fechou, nenhuma nasceu.** A **P-03** ganhou uma
**contraprova** em vez de mais uma cobrança: o arranjo é o mesmo do BD-4 — duas execuções em
paralelo, worktree sem stack própria, dependendo do main tree —, e desta vez o e2e rodou **inteiro**,
porque a branch alheia não tocou `backend/`. O custo da falta de compose por worktree não é
constante; é contingente ao que a outra branch toca, e por isso a conferência tem de ser feita na
hora da prova. A **P-34** (`COR_HARDCODED` fora de `src/app/**`) espera bloco que toque o shell, e
`src/app/` não aparece no diff.

**Arquivamento e histórico:** plano e spec foram para `plans/archive/` e `specs/archive/` (a spec não
é compartilhada por nenhum item futuro), com o ponteiro da §Spec do próprio plano e os dois desta
narrativa atualizados. O `progress.md` recebeu a entrega e voltou a dez linhas, movendo
`Hardening · revisão UI/UX assistida por navegador` (2026-08-10) para o `progress-archive.md`
**verbatim**, como o cabeçalho de lá manda. Do `backlog.md` saíram o **BD-5** e os **dois débitos que
ele cobriu por inteiro** — a absorção do trio da foto nos 4 diálogos e os 4 hooks fora do
`useCrudForm`, cada um com o critério agora decidido, inclusive o `useQuoteForm` que o bloco provou
**não** ser candidato legítimo. **Nada foi promovido:** a fila de dívida fica com o `BD-6` sozinho, e
o próximo item é escolha explícita do João.

**O que o fechamento NÃO provou, sem maquiagem:** **`/lotus-ui-review` segue não executado** — os
quatro diálogos migrados nunca foram vistos renderizados nesta execução, então a composição
`FormPhotoRow` + diálogo na tela continua sem checagem visual; e **nenhum diálogo tem teste de
componente**, então o e2e do S3 bateu na API direto, não através do `AppPhotoField`/`FormPhotoRow`
renderizado. Os dois já estavam declarados no fechamento da execução e continuam abertos como débito
escrito, não como omissão. **Uma divergência de projeção fica declarada em vez de corrigida
retroativamente** (precedente da P-27): a spec projetou `useCourseForm` em ~110 linhas e o plano em
~115; o entregue tem **129**.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

## Antepenúltimo item fechado — 2026-08-13 (`catraca-max-lines-e-moldura`, BD-4)

### Seleção — 2026-08-13

**BD-4 do `backlog.md:127`, promovido explicitamente pelo João** com o estado em `idle` e
`active_work_item` `null`. O gate do `/planejar-bloco` não promove; as três decisões dele fecharam o
gate: o slug `catraca-max-lines-e-moldura` (mesmo da branch já criada), **rota direta a
`ready_for_planning` sem Context Packet** por ausência medida de fonte externa, e a worktree
`/home/jvbat/projetos/fix-frontend` seguindo — bloco **frontend puro**, a P-03 não dispara.

A branch `feat/catraca-max-lines-e-moldura` já existia em `0c2a24b`, **com zero commit sobre a
`main`** e árvore limpa; isso não era divergência de estado, e `0c2a24b` passa a ser o
`state_basis_commit`.

### O terreno foi medido antes de desenhar, e achou cinco divergências

Medição de 2026-08-13 sobre `0c2a24b`, por workflow de 9 agentes lançado antes do `/clear`.
**Três dos quatro números da catraca estavam vencidos** — `StudentDialog` 281 (o backlog diz 283),
`RedatorDialog` 206 (diz 199), `BudgetDetailPage` 187 (diz 171); só `RedatorDocumentSlot` (175)
bate. Déficit real: **249 linhas a extrair**.

**A premissa do bloco é falsa:** ele não existe por causa do modo leitura do BD-3 — o BD-3 tocou o
`StudentDialog` num único commit (`dfc3f4b`) com saldo **−2 linhas**, e os dois blocos grandes vêm de
`501b731` (2026-08-05). **A justificativa da ordem também:** a adoção da moldura não tira linha de
diálogo nenhum, e as duas tabelas não estão na catraca.

**O DoD escrito não era provável:** não existe regra de validação de `phone` em nenhum DTO de
`Identity` (zero `Max(` na pasta; coluna `varchar(30)` sem unique; nenhum teste assere 422 em phone).

**Os dois diálogos do item (c) não são o mesmo caso:** `useStudentForm` roda sobre `useCrudForm` e já
entrega `errorSummary` pronto; `useRedatorForm` não usa `useCrudForm` e não tem o que espalhar.

E o ponteiro `FormErrorSummary.tsx:62-67`, citado 4× em doc normativo, **apontava para arquivo que não
existia** — o componente é export nomeado em `FormField.tsx`, e as linhas 62-67 de lá são do
`NestedField`, não do `FormErrorSummary` (que vive em `FormField.tsx:79-107`). Corrigido na Task 9
do BD-4 (2026-08-13): as citações vivas passaram a apontar para o destino real.

### Brainstorming e spec — 2026-08-13

Nove decisões do João (D1–D9), registradas na spec
`docs/superpowers/specs/archive/2026-08-13-catraca-max-lines-e-moldura-design.md`. As que mudam trabalho:
o 422 de `phone` provado por **request forjado** (backend intocado); o resumo do redator com `mapped`
**literal**, sem migrar o hook (o BD-5 já o excluiu por critério); o campo de cliente do
`StudentDialog` **colapsado** no molde do `BudgetDialog`, pagando a quarta grafia do débito BD-3 §4;
`useStudentDetail` **ficando no pai** para preservar a rede; **dois** arquivos novos no par do
redator; UI-01, os dois `<p>` e o `sp` morto **entrando**; overlays em vez dos ramos de estado no
`BudgetDetailPage`; o critério de CTA da moldura **vencendo** na `BudgetsTable`; e a rule reescrita
no mesmo commit que esvazia o `ignores`. Ordem escolhida: **catraca primeiro, moldura por último**.

**Uma conta apresentada no brainstorming estava errada e foi corrigida antes da spec:** o colapso do
campo de cliente não corta ~46 linhas, corta ~9 — `FormField` em modo leitura troca os **filhos
inteiros** (`readOnly ? <ReadOnlyValue/> : children`), então as 28 linhas de dica são create-only e
ficam, e o aviso `clientLocked` do modo edit **sumiria** se não saísse para fora do campo. Com a
conta certa, o corte do bloco de view sozinho deixaria o arquivo em 156 — acima da régua —, e por
isso o desenho extrai **dois** blocos do `StudentDialog` e **duas** seções do `RedatorDialog`.

**Risco de review declarado MÉDIO** na spec (§9), contra o BAIXO do gate binário da skill —
divergência declarada, sem conflito. O risco próprio é de alcance (`shared/ui` alcança 4 consumidores
fora do bloco; a moldura passa a servir 8 tabelas) e de margem (`BudgetDetailPage` pousa com folga
de ~5 linhas).

O estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até o João ler a
spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-13-catraca-max-lines-e-moldura.md`: **dez tasks**, uma por commit, na
ordem testes do resumo → `StudentDialog` → slot → `RedatorDialog` → `BudgetDetailPage` (que **zera o
`ignores`** e reescreve a rule) → UI-01 → `BudgetsTable` → `TurmasTable` → docs → gate.

**Baseline medido, não herdado:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` = **28
arquivos / 138 testes** — o número registrado neste arquivo até agora (27/131) estava vencido.
Projeção do plano: **29 arquivos / 142 testes** (3 casos do `FormErrorSummary`, 1 arquivo e 1 caso do
`AppFileRow`).

**Três coisas apareceram só ao escrever o plano, e duas mudam trabalho:**

1. **O `BudgetDetailPage` fica mais barato do que a spec projetou.** Os quatro overlays consomem o
   objeto `d` (`useBudgetDetail`) **inteiro**, que a página já tem, então a chamada de volta é de uma
   linha e `formatUf`/`AppCardTone` também ficam órfãos: **~136**, não ~145. A contingência da spec
   (extrair a prop `actions` do `DetailHeader`) vira reserva.
2. **O rótulo do modo leitura do campo de cliente precisa vir do pai.** Hoje o texto é
   `student?.current_client_name ?? t("student.noClient")` — se o filho derivasse o rótulo do
   `options`, view/edit cairia no travessão do `ReadOnlyValue`, que é o default certo para vazio e
   **não** é o texto atual. O filho recebe `readOnlyLabel` pronto e não conhece `StudentData`.
3. **Os testes novos do `FormErrorSummary` nascem verdes**, porque afirmam comportamento que já
   existe — então a Task 1 tem passo de sonda: com o filtro de `mapped` desligado à mão, o caso "não
   repete a chave que já aparece no campo" tem de reprovar, e a árvore volta limpa em seguida.

`executor: claude`, sem `paths_autorizados`: o bloco decide apresentação em vários sítios, atravessa
a lei §5.6 e mexe no `eslint.config.js`, onde bloco no lugar errado apaga seletor existente em
silêncio (Q-2 de 2026-08-04, reincidente no BD-3); a Task 5 ainda reescreve rule normativa.

**Estado: `ready_for_execution`.** `/executar-bloco catraca-max-lines-e-moldura` exige instrução
posterior do João.

### Execução — 2026-08-13: início

`/executar-bloco catraca-max-lines-e-moldura` validou as âncoras (spec, plano, `context_packet`
`null` coerente, Git limpo em `671bc94`, sem divergência) e abriu o gate main tree/worktree: bloco
frontend puro, `using-git-worktrees` normal — a worktree `/home/jvbat/projetos/fix-frontend` na
branch `feat/catraca-max-lines-e-moldura` já era o isolamento certo, sem criar nova.

**Mesmo conflito do `rastro-unicidade-e-gates` reapareceu, e foi resolvido do mesmo jeito:** o
plano recomenda `subagent-driven-development`; a sessão tem regra de não chamar o Agent tool sem
pedido. Escalado ao João via pergunta direta — **subagent-driven-development**, com Agent tool
autorizado para este bloco. Pre-flight scan do plano (10 tasks contra os Global Constraints e a
spec): limpo, sem conflito novo — as dívidas aceitas (D2 sem guarda, D4 requisição ociosa, D8
exceção de CTA) já são decisão declarada do João em §8 da spec, não achado a escalar aqui.

Ledger local reiniciado em `.superpowers/sdd/progress.md` (o anterior era do `BD-3`, já fechado).

**Estado:** `executing`.

### Execução — 2026-08-13: fechamento

10 tasks do plano completas via SDD, cada uma com revisor de task independente. Dois loops de fix
durante a execução: Task 2 (`StudentClientField` devolvia `Fragment` quando devia devolver `<div>`
— o `<p>` do aviso `clientLocked` não era irmão direto da section no original, achado escalado ao
João, ele escolheu `<div>`); Task 9 (número esquecido em `backlog.md:143`). A catraca `max-lines`
fechou de fato — array `ignores` do bloco removido inteiro em `eslint.config.js` (Task 5), regra
vale sem exceção, `.claude/rules/frontend-fsliced.md:106` reescrito. `BudgetsTable`/`TurmasTable`
migraram para `SearchableTableFrame` (D8: CTA muda comportamento só no caso lista-vazia-com-termo,
verificado por álgebra exaustiva no review final). UI-01 corrigido (`AppFileRow` ganha `title`).

**Gate da Task 10 — Steps 1-4 provados** (lint/build/test verdes, 29 arquivos/142 testes, os 6
arquivos-alvo abaixo de 150, sem sonda/vazamento de camada/órfão). **Steps 5 e 6 (e2e do 422 de
`phone` contra API real, checagem visual `/lotus-ui-review`) NÃO executados** — bloqueio de
ambiente: nem o main tree (branch WIP alheia, 500 em `/api/students`) nem uma stack própria da
worktree (comando `docker compose up` bloqueado pelo classifier de auto mode) ficaram disponíveis.
Escalado ao João duas vezes; ele escolheu prosseguir sem essas duas provas. Débito explícito, não
maquiado — ver `.superpowers/sdd/task-10-report.md` Step 7.

**Review final de branch inteira** (opus, intervalo `0c2a24b..96d36ba`, depois `..d50d7f8`):
veredito inicial "Ready to merge: With fixes" — 3 achados Important, todos verificados
pessoalmente antes de agir: `SearchableTableFrame.tsx` sem `flex-wrap` (regressão de layout em
telas estreitas nas duas tabelas migradas, achado real de CSS, não hipótese) e duas entradas do
próprio `state.md` (aqui perto, §"Brainstorming e spec — 2026-08-13") que a Task 9 corrompeu com
um find-replace cego — achado histórico do ponteiro fantasma virou afirmação invertida, e a
descrição de uma spec ARQUIVADA (protegida por D9) passou a mentir sobre o que ela cita. Um fix
subagent corrigiu os dois (commits `eb9bc47`, `d50d7f8`); re-review confirmou ambos resolvidos na
raiz. **Veredito final: "Ready to merge: Yes."** Achados Minor (margem fina em dois arquivos
novos, nome `SlotBody.tsx` foge da convenção `Redator*`, D6 muda espaçamento do banner em ~16px,
`backlog.md:137` com racional que a spec provou falso, D8 sem guarda automatizada) ficam
registrados no ledger local, não bloqueiam.

**Estado:** `ready_for_review`. Próxima instrução aciona a revisão do trabalho ativo — este
comando não a inicia sozinho.

### Review de sprint — 2026-08-13: BAIXO risco, uma lente, 4 achados

**BAIXO pelo gate binário da skill:** zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal gerado; `executor: claude`. A spec §9 declara MÉDIO por alcance
e margem — divergência declarada, sem conflito, como no BD-3. **Só lente Claude, sem Codex.**

**Gate reproduzido, não herdado do relatório de execução:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **29 arquivos / 142 testes** (a projeção do plano, exata); os **13** arquivos do bloco
abaixo de 150, o maior sendo `SlotBody` em 144; `ignores` do `max-lines` inexistente (só o
`globalIgnores` do topo e o `CATRACA_COR`, que é outra regra); zero `className="sp"`; zero
`primereact` em `features/`; `BudgetDetailPage.test.tsx` com **diff vazio**.

**A catraca foi provada nos dois sentidos (lição 10), não por lint verde:** 25 linhas em branco
apensadas ao `StudentDialog` — o ex-ignorado — fazem o lint reprovar com
`File has too many lines (153). Maximum allowed is 150`, e a árvore volta limpa em seguida. Verde
sozinho não distinguiria "a régua vale" de "a regra parou de casar o glob".

**Órfãos: zero.** Os 7 componentes novos têm exatamente um consumidor cada, conferido por grep.

**As extrações foram conferidas linha a linha, não presumidas:** `StudentDetailSections` bate byte a
byte com `StudentDialog.tsx:172-278` do `0c2a24b`, com uma única divergência — o `sp` → `space-y-2`
da D6; `BudgetOverlays` e `BudgetStatCard` idênticos ao original; `SlotBody` preserva as duas
assimetrias medidas. **E a conferência que o `backlog.md:409-411` pedia foi feita:** todo campo em
`mapped` passa `error=` ao `FormField` nos dois diálogos, e `phone` não passa em nenhum — o resumo
não duplica erro de campo visível.

**A D8 foi confirmada por álgebra sobre o hook, não por leitura do JSX:** `useTableFilter.ts:98` é
`term !== '' || scoped.length !== items.length`, então lista crua vazia **com** termo digitado dá
`filtering: true` e o CTA aparece, onde o critério antigo (`budgets.length === 0`) o escondia. É o
único caso que diverge.

**Os quatro achados:**

1. **Q-1 🟡 P** — `RedatorDocumentsSection.tsx:37,69-70`: `removeDoc.error` **nunca é lido**. Um
   DELETE de documento do redator que falha deixa a linha na tela e não diz nada — vazio silencioso
   (D16) sobre dado que alimenta a idoneidade. O irmão `commercial` já resolve os dois no mesmo
   banner (`useBudgetDetail.ts:47`: `useMutationErrors([uploadFile.error, removeFile.error])`). O
   bloco reescreveu exatamente as duas linhas vizinhas (D6, `<p>` → banner) e passou ao lado da
   terceira. Não registrado em `backlog.md` nem em `pendencias.md`.
2. **Q-2 🟡 M** — o contrato "quem passa `filterSlot` passa um `clear` COMPOSTO"
   (`SearchableTableFrame.tsx:41-45`) é **prosa, não mecanismo**, e este bloco trouxe o terceiro
   consumidor: `BudgetsTable:63,67`, `TurmasTable:40,44` e `useHistorial:60,86` remontam o mesmo
   `clearAll` à mão. Esquecer produz um "Limpar filtros" que não devolve a lista — a mesma classe de
   falha silenciosa que o `filtering` do `useTableFilter` existiu para matar em 2026-08-03, quando
   estas duas tabelas erraram juntas. Pela lição 14 (instrução repetida três vezes quer mecanismo) e
   pela cláusula de reincidência da skill, **vira regra ou tipo, não refactor**: a moldura compondo
   por `onClearFilter`, o par virando tipo obrigatório, ou um `useStatusFilteredTable` em
   `shared/hooks`.
3. **Q-3 🟢 P** — `StudentDialog.tsx:115` introduz
   `options={clients.options as { label: string; value: number }[]}`. A fonte
   (`useStudentClients.ts:16`) devolve `value: c.id` com `ClientData.id` sendo `number | undefined`.
   A extração criou uma fronteira tipada e o cast é o que a atravessa; corrigir no dono do dado
   (filtrar/normalizar uma vez) elimina a asserção em vez de justificá-la em três linhas de
   comentário.
4. **Q-4 🟢 P** — `RedatorDocumentSlot.tsx:10-12` afirma que `preview` e `sizeError` "vivem no
   diálogo"; depois da Task 4 eles vivem em `RedatorDocumentsSection.tsx:38-39`. Lição 13 na forma
   exata, e a mesma classe do ponteiro fantasma que a Task 9 **deste bloco** existiu para corrigir.
   `repo-docs-refs` não pega: é comentário em `.tsx`, não doc normativo.

**O que NÃO virou achado, e por quê:** decisão consciente registrada não é achado — requisição
ociosa de `useStudentDetail` em edit (D4), `mapped` literal do redator sem guarda (D2), CTA da
`BudgetsTable` em lista-vazia-com-termo (D8), margem de 6 linhas do `SlotBody` (spec §8.1, no
ledger), `SlotBody.tsx` fora da convenção `Redator*` (ledger) e os números do `backlog.md` §Débitos
ainda descrevendo o estado pré-bloco (a baixa é do `/fechar-sprint`, por instrução do plano).

**Veredito: o bloco está bom.** Dez tasks, dez commits, nenhuma condicional mudou de forma, nenhum
`key` mudou de critério, e as quatro mudanças de tela são as quatro declaradas. Os quatro achados
são de acabamento e de mecanismo; nenhum é de correção.

### Correção dos achados — 2026-08-13: João aprovou os quatro

Triagem do João: **Q-1 a Q-4, todos**. Quatro commits, um por achado, na ordem do relatório.

**Q-1 (`3451976`)** — `RedatorDocumentsSection` adota o molde do `useBudgetDetail`:
`useMutationErrors([upload.error, removeDoc.error])` num banner só. A exclusão reprovada agora fala;
antes o documento reaparecia na linha e a tela ficava calada.

**Q-2 (`b4d1a50`) — virou tipo, não refactor,** que é o que a cláusula de reincidência pede. Das três
formas oferecidas no relatório (regra escrita, par obrigatório por tipo, `useStatusFilteredTable`),
a escolhida foi a do meio: `SearchableTableFrameProps` deixou de ser interface e virou
`SearchableTableFrameBaseProps<T> & FilterSlotProps`, com `FilterSlotProps` sendo
`{ filterSlot?: undefined; onClearFilter?: undefined } | { filterSlot: ReactNode; onClearFilter: () => void }`.
A composição saiu dos chamadores e entrou na moldura (`table.clear()` + `onClearFilter?.()`). Os três
consumidores (`BudgetsTable`, `TurmasTable`, `useHistorial`) pararam de remontar `clearAll` à mão —
o `useHistorial` passou a expor `clearStatusFilter` e devolve o `table` do hook intacto.
**Provado nas duas direções** (lição 10), não por lint verde: removi o `onClearFilter` da
`TurmasTable` mantendo o `filterSlot` e o `tsc -b` deu
`TS2322: Property 'onClearFilter' is missing ... but required in type '{ filterSlot: ReactNode; onClearFilter: () => void }'`;
restaurado, compila. O terceiro consumidor que motivou o achado é agora impossível de errar.
A regra ficou registrada no bullet "Tabela em card" de `.claude/rules/frontend-fsliced.md`.

**Q-3 (`ae52a6c`)** — `useStudentClients` descarta o `id` nulo com `flatMap` e devolve
`value: number` de verdade; o cast e as três linhas que o justificavam sumiram do `StudentDialog`.
Corrigido no dono do dado, não na fronteira.

**Q-4 (`20bc7e7`)** — docblock do `RedatorDocumentSlot` aponta para `RedatorDocumentsSection`.

**Gate reproduzido depois das correções:** `pnpm build` verde, `pnpm lint` exit 0,
`pnpm test` **29 arquivos / 142 testes** — mesmos números do fechamento da execução, nenhum teste
tocado. Os cinco componentes mexidos seguem sob a régua de 150 (maior: `HistorialTable`, 132).
A `SearchableTableFrame` foi a 164 linhas e isso é legítimo: a régua cobre
`src/features/*/components/**`, e a moldura é `shared/ui` — foi justamente ela que absorveu a
complexidade que estava espalhada em três features.

**Estado: `ready_for_closure`.** Nenhum achado aberto. O fechamento é passo explícito
(`/fechar-sprint`), não automático — e é lá que a baixa dos débitos do `backlog.md` acontece.

### Fechamento — 2026-08-13

A árvore já estava limpa em `7c28699` (as correções dos quatro achados entraram commitadas), que
passa a ser o `state_basis_commit` — diferente do fechamento anterior, aqui não houve trabalho
pendente a commitar antes de arquivar.

**O item 0 foi refeito contra a API real e PAGOU a dívida que a execução declarou.** Os Steps 5 e 6
do gate da Task 10 tinham ficado de fora por bloqueio de ambiente (500 em `/api/students` no main
tree, `docker compose up` recusado na worktree), com o João escolhendo prosseguir sem eles. No
fechamento a stack estava de pé e respondendo — `/api/students` sem cookie devolve **401**, não mais
500 —, então o Step 5 rodou: com sessão Sanctum viva (cookie + CSRF, `Origin` e `Accept` nos dois
lados), o payload forjado `"phone": []` devolveu **422 `application/problem+json`** com
`errors.phone` em `PUT /api/students/37` **e** em `PUT /api/redatores/1`, mensagem
`El campo teléfono debe ser una cadena de caracteres.`. É exatamente o insumo que o item (c) do
bloco mostra: `phone` não está em `mapped` em nenhum dos dois diálogos (`useStudentForm` o declara
em `summaryOnly`; o `RedatorDialog` passa a lista literal `['name', 'rut', 'email']`), então o 422
cai no `FormErrorSummary` em vez de sumir. **Ressalva escrita, não maquiada:** o `:8080` serve o
main tree, hoje na branch alheia `feat/contrato-de-entrada-identidade-e-nested`. O `phone` é
`string\|Optional\|null` no DTO e o 422 vem do cast do spatie/laravel-data, não de regra de formato;
`git diff main...HEAD -- backend/app/Domains/Identity/Data/` está **vazio** naquele tree, então o
caminho medido é o mesmo que a `main` percorre — mas a medição não é de uma stack limpa, e isso é
o custo da **P-03** aparecendo num bloco de frontend.

**A catraca foi provada no próprio fechamento, nos dois sentidos (lição 10), não herdada do
review:** 30 linhas em branco apensadas ao `StudentDialog` — o ex-ignorado — fazem o lint reprovar
com `File has too many lines (154). Maximum allowed is 150`, e a árvore volta limpa em seguida.
Ferramentas: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **29 arquivos / 142 testes**. Os
seis alvos do plano pousaram em **124 / 125 / 34 / 133 / 105 / 116** linhas. Suíte backend, Pint e
`typescript:transform` são **N/A por escopo medido, não por suposição**: `git diff main...HEAD --
backend/` e `-- frontend/src/shared/types/generated.ts` devolvem **zero arquivo**, e rodar a suíte
no container mediria o código da outra branch, não este bloco.

**Um achado do próprio gate de código morto, corrigido no commit de fechamento:** o comentário de
`useStudentForm.ts:36-38` ainda dizia que "`StudentDialog` não tem FormErrorSummary: um 422 em
`phone` não aparece em lugar nenhum hoje". O bloco tornou a frase falsa ao adicionar o resumo em
`StudentDialog.tsx:74`, e o arquivo ficou **fora** do diff das dez tasks — lição 13 na forma exata,
mesma classe da Q-4 do review, um nível abaixo (comentário de hook, que a guarda `repo-docs-refs`
não alcança).

**Pendências: nenhum gatilho venceu.** A **P-34** (`COR_HARDCODED` fora de `src/app/**`) espera
bloco que toque o shell, e este não tocou — `src/app/` não aparece no diff. A **P-23** (formato do
`progress.md`) segue com revisão em 2026-09-30, e foi exercitada aqui ao mover a entrega mais antiga
para o `progress-archive.md`, que tem as três colunas que o `progress.md` fundiu. A **P-03** ganhou
uma linha: a ausência de compose por worktree custou dois passos de gate **num bloco de frontend**,
não de backend — a worktree não pôde subir stack própria e dependeu do main tree, que naquele
momento servia branch alheia quebrada. Nenhuma pendência nova nasceu: o que fica aberto deste bloco
é prova não executada, registrada no `progress.md`, não divergência entre doc e realidade.

**Arquivamento e histórico:** plano e spec foram para `plans/archive/` e `specs/archive/` (a spec
não é compartilhada por nenhum item futuro), com os ponteiros da narrativa acima e o da §Spec do
próprio plano atualizados. O `progress.md` recebeu a entrega e voltou a dez linhas, movendo
`Certificação · lote em Action e gate único de snapshot` (2026-08-10) para o `progress-archive.md`.
Do `backlog.md` saíram o **BD-4** e os **três débitos que ele cobria** — as 2 tabelas sem a
`SearchableTableFrame`, a catraca do `max-lines` e o `FormErrorSummary` ausente nos dois diálogos —,
mais a atualização da ordem (`BD-5 → BD-6`). O gatilho do trio da foto, que o BD-4 venceu, ficou
escrito no próprio BD-5. **Nada foi promovido:** o próximo item é escolha explícita do João.

**O que o fechamento NÃO provou, sem maquiagem:** o **Step 6 segue não executado** — nada foi visto
renderizado, então o wrap da toolbar a 390x844, os quatro casos de CTA da D8, o aviso `clientLocked`
sobrevivendo fora do `FormField` e o resumo com o 422 **na tela** continuam sem checagem visual. A
equivalência das extrações é literal e conferida linha a linha no review, mas não vira mecanismo:
nenhum diálogo tem teste de componente. D8 e D2 seguem sem guarda automatizada, por decisão
declarada na spec §8.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

### Merge com a `main` — 2026-08-13: duas sprints fecharam em paralelo

O BD-4 fechou às **08:49** e o BD-9 (`contrato-de-entrada-identidade-e-nested`, backend) às
**09:12**, do mesmo dia, em branches irmãs da mesma base `0c2a24b`. **Colisão de código: zero** — 30
arquivos de frontend contra 40 de backend mais `generated.ts`, sem um arquivo em comum. Os **cinco**
arquivos que se cruzam são todos doc de estado, e só **três** conflitaram (`state.md`,
`progress.md`, `progress-archive.md`).

**Merge da `main` na branch, nunca rebase.** Replayar 24 commits reescreveria os SHAs que o
`progress.md` e este arquivo **citam nominalmente** — doc versionado viraria mentira —, e faria 24
encontros com o mesmo `state.md` em vez de um.

**O perigo não estava nos conflitos, estava no auto-merge.** `pendencias.md` e `backlog.md`
mesclaram sozinhos, e um dos dois saiu **falso**: o parágrafo de ordem do `backlog.md` manteve
"então dessa fila resta o BD-9" depois de a `main` já ter entregue o BD-9 — a `main` nunca tocou
aquele parágrafo, então o git escolheu o lado desta branch e a afirmação vencida passou verde.
Corrigido à mão no mesmo commit. Auto-merge é ausência de sobreposição textual, não acordo.
`pendencias.md` é seguro por medição: a `main` mexeu só na P-29, esta branch só na P-03, e os 32 IDs
seguem sem duplicata — este repositório já renumerou ID duplicado três vezes.

**A cadeia foi resolvida por decisão do João: BD-4 fica como Último por ordem de merge**, não por
relógio (ele fechou 23 min antes do BD-9 e chega à `main` depois). BD-9 desce a Penúltimo,
`rastro-unicidade-e-gates` a Antepenúltimo e `faixa-visivel-e-acessibilidade-dos-dialogos` sai da
cadeia de três. O frontmatter é o desta branch (`last_completed_work_item:
catraca-max-lines-e-moldura`, `state_basis_commit: 7c28699`). Os três corpos foram conferidos por
comparação, não de olho: o do BD-9 entrou **byte a byte idêntico** ao da `main`, o do BD-4 idêntico
ao desta branch, e o do `rastro-unicidade-e-gates` difere da `main` em exatamente **duas linhas** —
as correções do ponteiro fantasma que o próprio BD-4 fez em `d50d7f8`, preservadas.

**`progress.md`:** as duas entregas entram, dá 11 contra o teto de 10, então desceu
`2026-08-10 · Operation · habilitação da turma`. **`progress-archive.md`:** os dois lados haviam
arquivado a **mesma** linha (`2026-08-10 · Certificação · lote`) e união ingênua a duplicaria —
ficou uma. E ficou na forma **verbatim de cinco colunas**, não no split de sete que esta branch
tinha feito: o fechamento do BD-9 declarou essa convenção no cabeçalho do arquivo (duas arities
convivendo, apontando para a P-23), e convenção recém-publicada vence reformatação.

**Gate pós-merge, que nenhum dos dois lados exercitou sozinho:** `pnpm lint` exit 0, `pnpm build`
verde (o `tsc -b` combinado é o risco real de um merge frontend×backend), `pnpm test` **29 arquivos
/ 143 testes** — os 142 desta branch mais o caso de `useClientForm` que a `main` trouxe. Backend
**591 passed, 5 skipped (2149 assertions)** e `typescript:transform` com **diff zero**; os dois
rodaram no container, que monta o main tree, e valem para esta branch por medição:
`git diff origin/main -- backend/ frontend/src/shared/types/generated.ts` devolve **zero linha**.
