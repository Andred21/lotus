---
schema_version: 1
active_feature: hardening-guardrails-e-transportes-pre-sprint-4
active_work_item: hardening-guardrails-e-transportes-pre-sprint-4
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
active_spec: docs/superpowers/specs/2026-08-04-hardening-guardrails-e-transportes-pre-sprint-4-design.md
active_plan: docs/superpowers/plans/2026-08-04-hardening-guardrails-e-transportes-pre-sprint-4.md
context_packet: docs/superpowers/context-packets/hardening-guardrails-e-transportes-pre-sprint-4.md
blocker: null
resume_state: null
last_completed_work_item: hardening-estrutural-pre-sprint-4
state_basis_commit: f554244
updated_at: 2026-08-04T04:00:00-03:00
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

## Bloco ativo — `hardening-guardrails-e-transportes-pre-sprint-4`

> **Renomeado em 2026-08-04, na revisão da spec pelo João.** Era
> `hardening-estrutural-pre-sprint-4-restante`. Com H.4.4, **H.4.5** e H.4.9 seguindo abertos,
> "restante" prometia o que o bloco não entrega — o mesmo defeito que o bloco anterior teve de
> declarar no fechamento. O id novo descreve o corte. Renomeados juntos: `active_feature`,
> `active_work_item`, o arquivo e o `block_id`/`packet_id` do packet, e o arquivo da spec. **A troca
> de id não é gatilho de staleness do packet** — o escopo externo reconciliado (H.3.1 + H.4.4–H.4.9)
> não mudou.

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-04** (`/planejar-bloco`
sem argumento, com o estado em `idle`; a seleção veio da pergunta explícita, não do comando). É o
**restante** do mesmo item que o bloco `hardening-estrutural-pre-sprint-4` fechou parcialmente em
2026-08-04: entregues H.4.1, H.4.2 e H.4.3; abertos **H.3.1 e H.4.4–H.4.9**. O backlog já registra
esse recorte desde `cc24cf2`, então nenhuma edição dele acompanha esta transição.

**Rota `context_required`, por gatilho de staleness — não por rotina.** O packet de 2026-08-03
(`context-packets/hardening-estrutural-pre-sprint-4.md`, `status: ready`, `base_commit` `563e78c`)
cobre as 10 tasks Notion, inclusive as 7 restantes, com os sinais de aceite de cada uma. **Ele está
stale por dois dos seus próprios gatilhos declarados** (§Staleness triggers, linhas 89 e 91):

1. **Mudança semântica no item 1 do backlog** — H.4.1/H.4.2/H.4.3 saíram da lista e o restante
   passou a ser citado por ID do Notion.
2. **Decisão posterior do João que alterou o corte** — o brainstorming de 2026-08-03 escolheu 3 dos
   10; o corte que o packet declarava "ainda aberto" foi decidido e consumido.

Some-se a isso que `base_commit`, `state_blob_sha` e `progress_blob_sha` do packet apontam para um
`HEAD` anterior a 6 commits de conteúdo + review. Logo o packet **não é reaproveitado como está**;
o Codex gera um novo, para o escopo restante.

**Ponto de partida que o novo packet precisa reconciliar, não redescobrir:** o packet antigo já
registrou que **o Drive não tem documento que delimite este hardening** (buscas dirigidas no V2
voltaram só ADRs, Certification e setup) e que **H.4.5 nunca apareceu em nenhuma das duas listas do
backlog** — só no conjunto Notion. Com H.4.4 agora explicitamente no escopo e H.4.5 dependendo dele,
a inclusão do H.4.5 volta a ser decisão do brainstorming, pela segunda vez.

**Dependências Notion que sobrevivem ao corte anterior** (do packet antigo, §Constraints): H.4.4
dependia de H.4.3 — **satisfeita**, o vitest existe desde 2026-08-04. H.4.6 dependia de H.4.1 —
**satisfeita**. H.4.7/H.4.8 dependiam de H.4.2 — **satisfeitas**. Restam internas: H.4.5→H.4.4 e
H.4.9→H.4.6. Nenhum item restante está bloqueado por algo fora deste bloco.

**Context Packet gerado pelo Codex em 2026-08-04** (`lotus-context-packet`, `mcp__codex__codex`
sandbox read-only — sem o problema de socket do docker do bloco anterior, porque geração de packet
não precisa de container), `base_commit` `7419c32`, `status: ready` — 14 fontes, nenhuma
`unavailable`: as 7 tasks Notion buscadas **uma a uma** pela base canônica por ID, 4 alvos do Drive
reconfirmados, 1 falso positivo de busca ampla descartado explicitamente
(`Planilha_Projetos_Integrada`, fora do V2) e 2 chaves de repositório.

**Validação do contrato, conferida e não aceita por relatório:** markers exatos, frontmatter completo
com `plan_*`/`spec_*` em `null` (os ponteiros do estado são nulos, e o contrato proíbe inventá-los),
exatamente 8 key facts (no teto), `RECOMMENDED_TRANSITION: ready_for_planning`, e nenhum gatilho de
staleness citando hash de provenance ou a própria transição promotora. **Os 7 blob SHAs do packet
foram recalculados aqui com `git hash-object` e batem todos** — `state.md`, `progress.md`,
`backlog.md`, `DomainDependencyTest.php`, `eslint.config.js`, `package.json`, `vite.config.ts`.

**O packet excedeu de propósito o teto de 5 artefatos externos**, declarando o motivo no próprio
registro de fontes: a instrução exigia reconsulta individual das 7 páginas, mais a revalidação dos
alvos de Drive que sustentavam a ausência. Aceito — o excesso está justificado no packet, como a
SKILL permite.

**Dois fatos que o packet confirmou, e que mudam o ponto de partida do brainstorming:**

1. **As 7 tasks seguem `Status: Backlog` no Notion** — nenhuma foi marcada concluída pelo bloco
   anterior, e nenhuma mudou de conteúdo desde `2026-08-03T21:49`. O escopo externo é o mesmo.
2. **A leitura do H.4.5 mudou.** O packet antigo dizia que ele não aparecia em lista nenhuma; agora
   o backlog cita o intervalo `H.4.4–H.4.9` por ID, que **o alcança** — mas as listas em prosa
   (2 bloqueantes + 4 pilotos) somam 6 e não o enumeram. A contradição continua, só mudou de forma.
   O packet registra e **não decide**: a inclusão do H.4.5 volta ao brainstorming pela segunda vez.

**Reconciliado, não redescoberto:** o Drive V2 segue sem documento que delimite este hardening — os
alvos confirmados tratam ADRs, Certification ou setup. Ausência **confirmada** de novo nesta geração,
não herdada do packet anterior.

**Corte final, depois da revisão da spec pelo João em 2026-08-04:** entram **H.3.1, H.4.6, H.4.7 e
H.4.8**. Ficam fora **H.4.4** (`SearchableTableFrame`, 9 tabelas / 932 linhas), **H.4.9** (builders de
teste, 76 arquivos) e **H.4.5** (retirado na revisão). Critério do brainstorming: *fechar o que é
barato e não precisa de prova visual*, isolando os refactors grandes em blocos próprios.

**A medição do código mudou três tasks antes de o corte ser feito.** O Notion descreve intenção; o
repositório disse outra coisa:

1. **H.3.1 não tinha o buraco que a task supõe.** São **6 URI patterns / 7 rotas** com ≥2 bindings de
   model; **5 já estão guardadas** (2 por `->scopeBindings()`, 3 por `abort_unless(...404)` manual) e
   a restante (`turmas/{turma}/redatores/{redator}`, que responde POST **e** DELETE) é **N:N** —
   redator não pertence à turma, não há posse a checar. Os 3 recursos que a task nomeia
   (`addresses`, `contacts`, `templates`) têm rota **plana** (`PUT /addresses/{address}`): o pai nem
   entra na URL, e a permissão é global. Sem furo de privilégio. A task vira guardrail + unificação
   de mecanismo, com comportamento observável inalterado.
2. **H.4.8 já estava em paridade perfeita** — 443 chaves em `en`/`es-CL`/`pt-BR`, zero diff em
   qualquer direção. Guardrail puro, zero correção. Mesma forma do H.4.1 do bloco anterior.
3. **H.4.5 se resolveu ao contrário do que a task sugere** — e por isso saiu do bloco sem perder a
   conclusão (ver o parágrafo da revisão, abaixo).

**Duas famílias no H.4.6, não 8 ocorrências soltas:** DTO calculando valor de domínio
(`BudgetData`+`BudgetSummaryService`, `TurmaData`+`TurmaHabilitacaoService`) contra assinatura de URL
na serialização (`photo_url` ×4, `download_url` ×2). O piloto é o `BudgetData` — dinheiro, 4 call
sites, todos do próprio controller, sem cascata. `TurmaData` tem destino explícito (D8) e a família 2
fica, com razão registrada (D10).

**Mecânicas conferidas antes de entrarem na spec, não supostas** (lição 13): `Budget::files()`,
`Quote::files()`, `Redator::documents()` e `Turma::files()` existem e são `MorphMany`; e
`signatureParameters()`, `enforcesScopedBindings()` e `preventsScopedBindings()` existem no Laravel
13.8 instalado. São eles que deixam o guardrail **ler** a rota — pela assinatura tipada, não por
regex de URI nem por texto de controller, evitando o defeito de regex-que-atravessa-comentário do
bloco anterior.

**Risco único do bloco, isolado na spec §D12:** o H.4.7 toca caminhos de upload de documento com peso
legal, e a falha da lição 6 é **silenciosa** (`Content-Type` fixado → `File` vira `{}` → upload vazio
com 201/204 de sucesso). Build e lint não veem. Exige teste direto do helper (D13b) **e** upload real
contra a API em 2 dos 6 pontos adotados.

**Revisão da spec pelo João em 2026-08-04 — 8 correções, e 3 delas eram erro meu de medição ou de
mecânica.** A spec foi reescrita inteira; o corte caiu de 5 para 4 tasks.

**As 3 factuais, conferidas antes de aplicadas:**

1. **H.3.1 são 6 URI patterns / 7 rotas, não 6 rotas.** `turmas/{turma}/redatores/{redator}` responde
   **POST e DELETE** — dois registros no roteador sobre o mesmo padrão. Confirmado por
   `artisan route:list --json`, não pelo arquivo de rotas.
2. **H.4.7 são 7 `new FormData()`, não 6** — 6 de forma simples + 1 complexo. Eu havia contado
   `useCommercialFiles` (que tem 2) como um ponto na prosa e depois escrito "5 simples".
3. **O guardrail identifica model por `signatureParameters()`, não por regex de URI.** Regex erraria
   nos dois sentidos: `{file}` não diz que é model, e `users/{user}/photo` tem um binding só apesar
   de parecer nested.

**A correção de desenho mais importante — allowlist morre, silêncio reprova.** A isenção da rota N:N
deixa de ser lista dentro do teste e vira **`->withoutScopedBindings()` na própria rota**, com o
motivo em comentário ao lado. `preventsScopedBindings()` existe no Laravel 13.8 e distingue
*declarado false* de *não declarado* — é isso que permite reprovar a rota que não declara **nenhuma**
das duas. Allowlist envelheceria longe da rota; a declaração é lida por quem a edita. O gate ganhou
prova nos dois sentidos: rota sem declaração reprova, a mesma rota com `withoutScopedBindings` passa.

**H.4.5 saiu do bloco.** O mérito já estava resolvido no brainstorming e **não se perde**: eliminar os
7 aliases regrediria a fronteira de query-em-componente e **passaria no lint**, porque o seletor não
casa `useCrudPage(xApi)`. A resposta correta quando H.4.5 for executado é "justificar e fechar o
escape do seletor", não "eliminar". **Obrigação de fechamento:** essa nota vai para o `backlog.md`
junto do item — não foi escrita agora porque planejamento não edita backlog.

**Três exigências novas que o gate não tinha:**

- **D9 — decisão de saída do piloto (H.4.6), escrita antes de executá-lo.** Três sinais possíveis
  (técnica paga / só empurra o locator para o chamador / inconclusivo), cada um com consequência
  definida, inclusive **reverter a task**. O fechamento nomeia qual ocorreu — piloto sem critério de
  saída é refactor com nome bonito. **D8** dá destino explícito ao `TurmaData`: fora deste bloco, e
  decidido por D9, não por sessão futura sem critério.
- **D13b — `postMultipart` ganha teste direto**, não só a prova de upload manual: corpo é
  `FormData`, nenhum `Content-Type` fixado, chave `undefined` ausente. Sem ele a única guarda do
  helper não rodaria em CI.
- **D14 — H.4.3 é dependência real**, e o gate **confirma por grep** que `CLAUDE.md` §6 e a
  `frontend-fsliced.md` ainda citam `pnpm test`. Se a citação sumiu, os testes deste bloco nascem
  órfãos de gate.

**Dois writes externos viram obrigação de fechamento, com texto aprovado pelo João antes de enviar**
(por ID, base canônica): **D4b** — a task H.3.1 descreve `addresses`/`contacts`/`templates` como se
tivessem risco de posse cruzada, e **três são rotas shallow** que não o representam; é a lição 13 numa
fonte externa. **D11b** — registrar que as mutations de `delete` não entram em helper (não há
transporte a centralizar) e que o recorte real foi 6 de 7 pontos.

**Spec reescrita e aprovada pelo João em 2026-08-04**, 4 tasks, 17 decisões (D1–D14 com D4b/D11b/D13b),
7 invariantes de comportamento e gate com item 0 próprio. Sem checkpoint visual — nenhuma tela muda
de forma.

**Plano em 6 tasks** (0 branch · 1 H.3.1 · 2 H.4.6 · 3 H.4.7 · 4 H.4.8 · 5 gate), TDD em todas as
que produzem mecanismo: o teste entra antes, é visto reprovando, e só então o código muda.

**A rede de regressão do H.3.1 já existia e foi localizada, não escrita:**
`test_delete_cross_tipo_arquivo_de_budget_pela_rota_de_quote_404` exige 404 **pelo tipo**
(arquivo de budget pela rota de quote, mesmo id), e `test_remove_documento_de_outro_redator_da_404`
cobre o redator. Como `$quote->files()` é `MorphMany` filtrada por `fileable_type`, o
`scopeBindings` preserva as duas garantias — mas o plano manda rodar os dois **antes de aceitar** a
troca, com regra de parada explícita: teste vermelho ali significa que a relação não filtra o que o
`abort_unless` filtrava, e a saída **não** é reintroduzir o check manual.

**Auto-review do plano achou um bug no próprio plano:** o passo de Pint do gate montava a lista de
arquivos por `git diff` e a passava direto — se o diff viesse vazio, `./vendor/bin/pint` rodaria
**sem argumento** e reformataria o repositório inteiro, que é exatamente a lição 9. Corrigido com
guarda de lista vazia antes da chamada.

**`executor: misto`.** **Tasks 1 e 4 vão ao Codex** — código literal, verificação executável, paths
fechados, e no caso da 1 a rede de regressão já existe. **Tasks 0, 2, 3 e 5 ficam com Claude:** a 2
exige *ler* o resultado do piloto pela D9 (inclusive a hipótese de reverter a task, o que não se
delega), a 3 toca 6 caminhos de upload com peso legal e falha silenciosa (D12), a 0 julga árvore suja
e baseline divergente, e a 5 julga o placar e a prova de upload real.

**Regras de parada da delegação:** Task 1 Step 2 — se a lista de rotas indefinidas não for exatamente
as 5 previstas, o Codex **para**; rota a mais significa que a medição da spec deixou passar um caso,
e classificá-la é decisão do João. Task 1 Step 7 — teste cross-pai vermelho **para**, não se
"conserta" reintroduzindo o `abort_unless`. Task 4 Steps 3-5 — as sondas editam arquivo de locale;
`git status` que não volte limpo **para**, porque locale sujo é diff proibido no gate. Nenhum commit
é feito pelo Codex sem diff revisado por Claude antes.

**Três pendências de fechamento registradas no plano, fora das tasks:** levar ao `backlog.md` a
conclusão técnica do H.4.5, e os dois writes no Notion (D4b e D11b), ambos por ID e com texto
aprovado pelo João antes de enviar.

**Execução em 2026-08-04, `/executar-bloco` + `subagent-driven-development` (argumento explícito do
João), `executor: misto`.** Branch `hardening/guardrails-e-transportes` a partir do `main`, sem
worktree (D1/P-03 — toca `backend/`), 4 commits de conteúdo (`310c5ec`..`4e5882e`). Baseline da
Task 0: backend 375 passed (1365 assertions), frontend 14 passed — batendo com o plano.

**Tasks 1 e 4 no Codex** (`mcp__codex__codex`, `sandbox: danger-full-access` — desta vez sem o
problema de socket do docker que forçou CLI direto no bloco anterior; o parâmetro de sandbox do
próprio MCP tool resolveu). Nenhum commit feito pelo Codex — report + diff sempre revisados por
Claude, que rodou a verificação do plano do zero antes de aceitar e commitou. Tasks 2 e 3 via
implementer subagent (Sonnet) + task reviewer subagent, ambos aprovados sem achado bloqueante.

**A medição da spec errou de novo, 2 vezes nesta execução — terceira e quarta ocorrência da lição 13
no projeto.** Task 2 (H.4.6): a spec media 4 call sites de `BudgetData::fromModel`, todos no
`BudgetController` — existiam **6**, 2 deles chamando `fromModel()` direto em teste
(`DtoTest.php`, `SoftDeletedRelationProjectionTest.php`). O implementador parou e reportou
corretamente (regra de parada do plano); João decidiu via pergunta explícita: atualizar os 2 testes
(adaptação mecânica de assinatura via `app(BudgetSummaryService::class)`, não mudança de
comportamento) em vez de reverter a task. **D9 fechou como sinal 1 (técnica paga)** — a produção
ficou limpa em 1 nível, sem `app()`. Task 5 (gate): a sonda literal do plano para H.3.1(a) — rota
apontando para `CourseTemplateController::destroy` — não reprovava, porque o método real só tipa 1
model (`CourseCertificateTemplate $template`), não 2 como o plano supôs. Corrigida na hora com um
closure tipando os 2 models; reprovou citando a rota certa, e com `->withoutScopedBindings()`
passou — a prova nos dois sentidos ficou de pé, só a sonda mudou de forma.

**Gate automatizado (Task 5), tudo do zero:** suíte backend **376 passed (1366 assertions)**
(375 baseline + 1 do `NestedRouteOwnershipTest`); `pnpm test` **21 passed** (14 baseline + 4 do
`postMultipart` + 3 do `parity`), `pnpm build` e `pnpm lint` verdes; os 4 guardrails/sondas do gate
vistos reprovando pelo motivo certo (H.3.1 silêncio, H.3.1 saída explícita, H.4.8 excedente),
sondas removidas, árvore limpa; `generated.ts`, `locales/*.json` e `backend/database/` sem diff;
Pint limpo nos 11 arquivos `.php` tocados (guarda de lista vazia não disparou). Órfãos: nenhum —
`postMultipart` com 5 arquivos consumidores (6 pontos) e exatamente 2 `new FormData()` no
repositório (o helper + `useRedatorForm.ts`, D11, intocado).

**D12 — prova de upload real contra a API com sessão Sanctum** (login `admin@lotus.cl`, curl com
`Origin`+`Accept`+`X-XSRF-TOKEN`, lição 12): foto (`POST /api/users/1/photo` → 204; URL
pré-assinada → 200 `image/png`) e documento (`POST /api/turmas/1/documents` → 201, `size: 48` no
corpo — a lição 6 quebraria isso em silêncio com 201 e arquivo vazio). **D14** confirmado por grep:
`CLAUDE.md:137` e `frontend-fsliced.md:145-147` citam `pnpm test`.

**Pendências de fechamento, ainda não executadas** (ficam para o `/fechar-sprint`): levar ao
`backlog.md` a conclusão técnica do H.4.5; os 2 writes no Notion (D4b, D11b), com texto aprovado
pelo João antes de enviar.

**Por instrução explícita do `/executar-bloco`, review não foi iniciado nesta sessão** — a próxima
instrução aciona a revisão do trabalho ativo.

## Último item fechado — 2026-08-04

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-03** (`/planejar-bloco`
com o escopo nomeado no argumento). O item entrou no `backlog.md` na mesma sessão, por edição dele;
o commit desta transição carrega a edição do backlog junto para que o ponteiro do estado não aponte
para item ausente no `HEAD`.

**Rota `context_required`, decidida pelo João:** o item referencia as tasks Notion
`H.4.1–H.4.9 + H.3.1`, fonte externa — o Context Packet é gerado pelo Codex (`lotus-context-packet`,
sandbox read-only) antes de qualquer brainstorming. Diferente dos 4 blocos anteriores, todos sem
packet por serem 100% frontend com fonte no próprio código.

**Context Packet gerado pelo Codex em 2026-08-03** (`lotus-context-packet`, sandbox read-only,
`base_commit` `563e78c`), `status: ready` — 7 fontes, todas `retrieved`, nenhuma `unavailable`:
as 10 tasks Notion (`H.3.1` + `H.4.1`–`H.4.9`) pela base canônica por ID, mais 4 alvos do Drive.
**O Drive não tem documento que delimite este hardening** — buscas dirigidas no V2 voltaram só
ADRs, Certification e setup, então o detalhamento operacional mais recente é o do Notion, sujeito
às restrições dos ADRs. Sem conflito Drive↔repo.

**Achado do packet, não resolvido de propósito:** o backlog lista 5 bloqueantes + 4 pilotos = 9
itens, mas o conjunto Notion referenciado tem **10** tasks. A que não aparece em nenhuma das duas
listas é **`H.4.5` — revisar aliases `useXPage`, eliminando-os ou justificando orquestração real**
(depende de H.4.4). Incluí-lo ou não é decisão do brainstorming.

**Corte decidido no brainstorming de 2026-08-03, pelo João:** entram **H.4.1** (matriz de
dependências entre domínios + `DomainDependencyTest`), **H.4.2** (as 3 fronteiras do frontend viram
`no-restricted-imports`) e **H.4.3** (vitest + regressão de `useTableFilter` e `useCrudPage`).
Critério escolhido: *o que fica caro de corrigir depois*, não *o que impede escrever Certification*.
Ficam fora, nominalmente: H.3.1, H.4.4, H.4.5, H.4.6, H.4.7, H.4.8, H.4.9 — os sinais de aceite de
cada um seguem no packet.

**Decisões que moldaram o bloco.** A classificação dos 42 imports cross-domain (21 pares) **não
achou acoplamento indevido** — todos são fluxo do processo, Identity como dono de pessoa, ou relação
Eloquent inversa que o ADR-02 permite; então H.4.1 entrega teste + doc, e `git diff -- backend/app/`
fica vazio. Descoberta que virou a espinha: os 42 imports atingem **3 das 10 camadas** (`Models` 29,
`Services` 8, `Enums` 5), uma superfície pública de fato que nunca tinha sido declarada. Pest **não
está instalado** (75 arquivos PHPUnit), então o Arch test é PHPUnit próprio; `eslint-boundaries`
também fica fora — são 3 fronteiras, não uma hierarquia.

**Achado do João durante o brainstorming, absorvido pelo bloco:** `TurmasTable` e `BudgetsTable`
mostravam "Sem resultados para os filtros aplicados" com o dropdown em "Todos" e busca vazia. Causa
**provada no source** do `primereact` instalado (`dropdown.cjs.js:1441`), não por hipótese: sem a
prop `optionValue`, o `onChange` devolve o **objeto da opção** quando `option.value` é vazio por
`ObjectUtils.isEmpty` — e `isEmpty(null)` é `true`. Isso derrubou a tese inicial de "zero pixel
muda": o bloco volta a ter um checkpoint visual, pequeno (2 telas).

**Spec revisada pelo João em 2026-08-03**, com 3 correções que viraram D5b (a detecção cobre FQN
inline e group `use`, não só linhas `use`), D6b (H.4.1 corrige as 2 contradições de
`estrutura-monolito.md` sobre a própria regra que automatiza) e D16 (`filtering` mudar de dono é
mudança de contrato, e vai para o JSDoc e para a `frontend-fsliced.md`).

**Plano:** 9 tasks (0 branch · 1 matriz · 2 docs+P-04 · 3 lint · 4 vitest+`useTableFilter` ·
5 `useCrudPage` · 6 fix do empty state · **7 checkpoint visual do João** · 8 gate).

**`executor: misto`, por decisão do João em 2026-08-03.** Tasks **1, 2 e 5** vão ao **Codex** —
paths fechados, verificação executável e nenhuma decisão em aberto (matriz, texto dos docs e código
dos testes estão literais no plano; o Codex transcreve e verifica). Tasks **0, 3, 4, 6, 8** ficam
com **Claude**: a 3 toca a lei §5.6 e o `eslint.config.js` do repositório inteiro, a 4 escolhe
versões de dependência, a 6 corrige duas telas de produção, a 8 julga o placar do gate. A **7 é do
João**. Por camada: backend é só a Task 1; docs é a 2; frontend são 3, 4, 5 e 6.

**Regra de parada que acompanha a delegação:** se o `DomainDependencyTest` reprovar no estado atual
(Task 1, Step 2), o Codex **para e reporta** — não edita a matriz nem toca `app/Domains/`.
Reprovação ali significa que a classificação da spec §D2 deixou passar um import, e reclassificar é
decisão do João. As sondas de lição 10 exigem conferir que a falha veio **pelo motivo certo**;
falha pelo motivo errado é `BLOCKED`, não prova.

**Execução em 2026-08-04, `/executar-bloco` + `executing-plans`, `executor: misto`.** Branch
`hardening/estrutural-pre-sprint-4` a partir do `main` (D14, sem worktree — toca `backend/`,
`eslint.config.js` e `vite.config.ts`), 6 commits de conteúdo (`211da41`..`d28d269`).

**Tasks 1, 2 e 5 no Codex** (`codex exec -s danger-full-access`, direto no CLI — a chamada via
`mcp__codex__codex` batia em `permission denied` no socket do docker sob a sandbox
`workspace-write`, que não preserva o grupo suplementar `docker` do processo sandboxado; resolvido
subindo a sandbox do Codex para `danger-full-access`, decisão do João). Report + diff sempre
revisados por Claude antes do commit — nenhum commit feito pelo Codex, conforme o gate de
delegação. **Task 2 achou desvio do plano, não do código:** o Step 5 esperava só 1 menção restante a
`RouteServiceProvider` no doc, mas o arquivo já tinha 3 antes deste bloco (linhas 30, 51, 67) — só a
30 estava errada, 51 e 67 já afirmavam corretamente que o provider não existe. Codex parou
corretamente (regra de parada); Claude completou o Step 6 (P-04) e revalidou com o critério certo
("zero contradição", não "exatamente 1 linha"). **Task 3 achou bug real de ESLint flat config:**
fronteiras 1 (PrimeReact) e 2 (feature→feature) em blocos `no-restricted-imports` separados com
`files` sobrepostos colidem — o bloco mais específico apaga o mais genérico por inteiro (merge raso
de `rules`, não concatenação de `patterns`); visto reprovando (sonda da fronteira 1 parava de
disparar) antes de consolidar as duas fronteiras num único bloco por feature. Fronteira 3
(`shared`→feature) não colidia e ficou como no plano.

**Gate automatizado (Task 8), tudo reconferido do zero:** suíte backend **374 passed (1363
assertions)** (372 baseline + 2 do `DomainDependencyTest`); `pnpm test` **12 passed** (6
`useTableFilter` + 5 `useCrudPage` + 1 de `filtering`), `pnpm build` e `pnpm lint` verdes; diffs de
`generated.ts`, locales, `backend/database/` e `backend/app/` vazios (H.4.1 é só teste + doc, zero
import corrigido); os 3 guardrails vistos reprovando de novo com sondas novas — backend (Regra A via
FQN inline, citando `SondaArchTemporaria.php`) e frontend (`no-restricted-imports` ≥1 ocorrência em
`CoursesTable` importando `commercial`), sondas apagadas, árvore limpa nos dois; `filtering` com
definição em `useTableFilter.ts` e exatamente 2 consumidores (`TurmasTable`, `BudgetsTable`); Pint
sem alteração pendente; nenhum DTO tocado, logo sem `typescript:transform`.

**Checkpoint visual (Task 7): aprovado pelo João em 2026-08-04**, Operação e Presupuestos, os 5
pontos do plano (vazio sem filtro, cheio sem filtro, filtro sem resultado + Limpar filtros, busca
sem resultado + Limpar busca, alternância Todos↔estado real).

**Review em 2026-08-04 (`/revisar-sprint`, ALTO RISCO** — `executor: misto`, Tasks 1/2/5 no Codex, e
o bloco toca `backend/`; lente Claude **+** revisão independente do Codex, `mcp__codex__codex`
read-only, que dessa vez rodou sem o problema de socket porque review não precisa de docker). O
Codex confirmou 4 achados meus e trouxe 2 novos, ambos verificados por sonda própria antes de
aceitos; 2 achados dele foram descartados (`import()` dinâmico — zero ocorrências no repo; e
`features/feedback` — mesmo achado do Q-5, fundido). Órfãos: nenhum. Leis §5: sem violação.
Gate reconferido do zero, não aceito por relatório.

**Os 3 guardrails tinham 4 buracos e 1 falso positivo — todos achados por sonda, não por leitura.**
Q-1: `use App\Domains\Identity\Actions;` (import de NAMESPACE) escapava das Regras A e B em silêncio,
dando acesso à camada interna inteira — a regex exigia 3 segmentos e essa forma tem 2; não estava na
tabela de 5 formas da spec §D5b. Q-2: o comentário do `eslint.config.js` afirmava que
`**/features/<outra>/**` cobria o caminho relativo, e não cobria — `no-restricted-imports` casa a
STRING escrita, e `../../../commercial/…` não tem `features/` nenhum (de `shared/` funcionava, porque
a subida atravessa `features/` à força; a cobertura era assimétrica). Q-4: `[^;]*` atravessava
comentário, então um docblock que só CITAVA uma classe reprovava a suíte com a mensagem errada
("group use"), sem import nenhum. Q-5: `arquivosDeDominio()` percorria as chaves de `ALLOWED` e
`FEATURES` era literal — domínio/feature nova nascia sem guardrail, em silêncio.

**Correções, todas reprovadas de novo com sonda depois do fix (lição 10):** import de namespace vira
**violação de forma** própria, avaliada antes das Regras A/B (sem o nome da classe não há aresta a
conferir) — mesmo tratamento do group use, banir em vez de fingir cobertura; a varredura passa a ser
sobre o CÓDIGO, com comentários removidos por `token_get_all()`; o regex do group use aperta para
`[A-Za-z0-9_\\]*\{`, que não cruza comentário; teste novo assere que os diretórios de `app/Domains/`
são exatamente as chaves de `ALLOWED`; `FEATURES` passa a sair do disco (`fs.readdirSync`); e a
fronteira 2 ganha os padrões de subida relativa (4 níveis, que cobrem toda a profundidade real de
`src/features/`), com o comentário reescrito para dizer o que a regra **não** pega (subida acima de 4
níveis e `import()` dinâmico, zero ocorrências das duas). As 3 provas originais do plano (Regra A via
`use`, Regra A via FQN inline, Regra B) foram reconferidas e seguem reprovando cada uma pela regra
certa; import relativo legítimo dentro da própria feature **não** dispara.

**Q-3 — os docs negavam o runner que o próprio bloco instalou.** `CLAUDE.md` §6 e o §Comandos da
`frontend-fsliced.md` seguiam em "sem test runner ainda", com o gate definido como `pnpm build` +
`pnpm lint`. A rule é a que carrega sozinha ao tocar frontend: a próxima sessão fecharia sprint sem
rodar os 14 testes. Os dois passam a citar `pnpm test`, e o gate da rule vira build + lint + test.

**Q-6 — `filtering` media a presença do `where`, não o efeito dele.** `where !== undefined` faria uma
tabela de escopo permanente (`where` sempre passado) nascer "filtrando para sempre" e mostrar o empty
state de filtro sobre lista legitimamente vazia — o defeito que o bloco veio corrigir, de volta pela
porta da frente. Passa a ser `term !== '' || scoped.length !== items.length`. **Atenção para o
fechamento:** isto muda **um** caso do que o João aprovou no checkpoint — lista globalmente vazia
**com** um estado selecionado no dropdown agora mostra "Nenhuma turma ainda" em vez de "Sem
resultados para os filtros aplicados". Os 5 pontos do roteiro seguem valendo (o ponto 3 tem turmas na
lista, só nenhuma do estado escolhido, e continua exibindo o empty state de filtro), mas este caso de
borda **não foi visto na tela** e precisa de olhada no gate de fechamento.

**Q-7 — o JSDoc de `startEdit` prometia guarda por entidade e guardava por id.** Depois de
`openViewById` com o GET pendente, entrava em `edit` com `entity` nula; quem segurava era cada página
(`PeoplePage.tsx:79` só renderiza o diálogo com `entity` truthy), não o hook. A guarda passa a ser a
entidade, e o teste que se chamava "startEdit não entra em edit sem entidade" — e só exercitava
`openCreate()`, provando outra coisa — foi partido em dois, um por invariante.

**Revalidação pós-correção, tudo do zero:** suíte backend **375 passed (1365 assertions)** (374 + o
teste novo de disco vs. matriz); `pnpm test` **14 passed** (12 + o de `filtering` sem corte + o de
`startEdit` com deep link), os dois testes novos **vistos vermelhos** contra o comportamento antigo;
`pnpm build` e `pnpm lint` verdes; Pint sem alteração pendente; diffs de `generated.ts`, locales,
`backend/database/` e `backend/app/` seguem vazios; `filtering` com definição e exatamente 2
consumidores; todas as sondas apagadas e árvore limpa.

**Padrão reincidente registrado, não construído:** lição 13 apareceu 3 vezes neste review (Q-2, Q-3,
Q-7) e foi o Q-1 do bloco anterior — duas sprints seguidas. A proposta de mecanismo (teste que
confere os comandos citados nas rules contra os scripts reais) foi para §Débitos técnicos do
`backlog.md`; o João aprovou os 7 achados, não o mecanismo.

**Gate de fechamento (2026-08-04).** **Item 0 — critério de aceite do bloco, não higiene genérica:**
o bloco entrega guardrail, não feature de tela — a prova é reprovar os dois mecanismos de novo com
sonda fresca, não só ler a suíte verde (lição 10). Reconferido do zero, fora do que o review já tinha
provado: sonda de import de NAMESPACE (`use App\Domains\Identity\Actions;`) em `Catalog` reprovou
`DomainDependencyTest` pela violação de forma certa; sonda de `primereact` direto + import relativo
cross-feature (`../../../commercial/...`) em `catalog/components/Sonda/` reprovou as duas fronteiras
do `no-restricted-imports` pelo motivo certo; as duas sondas removidas, árvore limpa nos dois. O caso
de borda do Q-6 marcado como "não visto na tela" (§190-196) está coberto por teste dedicado
(`useTableFilter.test.ts`: "where que não corta nada não é 'filtrando' — nem sobre lista vazia",
linha 118) — lista globalmente vazia com estado selecionado mostra "Nenhuma turma ainda", não o empty
state de filtro, confirmado pela lógica do hook (`scoped.length !== items.length` é `false` quando os
dois lados são zero).

Suíte backend **375 passed (1365 assertions)** reconferida; `pnpm test` **14 passed**, `pnpm build` e
`pnpm lint` verdes reconferidos; Pint (`--test`) sem alteração pendente no único arquivo de `backend/`
tocado (`DomainDependencyTest.php`); `generated.ts` e DTOs sem diff (nenhum tocado, sem
`typescript:transform`). Código morto: nenhum — diffstat da branch contra `main` (17 arquivos) sem
placeholder nem `.gitkeep` órfão; `package.json`/`pnpm-lock.yaml` mudam só pela instalação do vitest.
Leis §5: sem violação — bloco não toca DDD, auditoria, auth, RBAC ou financeiro, só reforça a lei
§5.6 com mecanismo. Pendências: nenhum gatilho vencido (P-04 é o mais próximo, 2026-08-15, e já
passou a **parcialmente resolvida** durante a execução — texto em `pendencias.md`); nenhuma
pendência nova.

Item 1 do backlog (**"Hardening estrutural pré-Sprint 4"**) não fechou por inteiro — só H.4.1, H.4.2
e H.4.3 dos 9 itens listados. Editado, não removido: os 3 entregues saem da lista, H.3.1 e H.4.4–H.4.9
seguem como o restante do item, agora citados pelo ID do Notion em vez de descrição solta.

Arquivado: `plans/archive/2026-08-03-hardening-estrutural-pre-sprint-4.md` ·
`specs/archive/2026-08-03-hardening-estrutural-pre-sprint-4-design.md` (não compartilhada por outro
work item). Entrega registrada em `progress.md` (a mais antiga, `Bloco visual · Refinamento de UI por
módulo` de 2026-07-27, migrou para `progress-archive.md` para manter o teto de dez).

**Aberto, registrado, não resolvido:** o restante do item 1 do backlog (H.3.1, H.4.4–H.4.9); P-04
para §5.1/§5.2 (reavaliar 2026-08-15); a lição 13 sem mecanismo (§Débitos técnicos do `backlog.md`).

## Penúltimo item fechado — 2026-08-03

`abstracao-componentes-catalog` — **item 4 do `backlog.md`, selecionado explicitamente pelo João em
2026-08-03**, logo depois do `/revisar-frontend` de `features/catalog` da mesma sessão. Spec aprovada
(D1–D10, §4 com 13 invariantes, §5 com o gate) e plano executado em **8 tasks** via `/executar-bloco`
+ `executing-plans` inline (`executor: claude` — sem task delegada ao Codex: frontend sem test
runner, DoD é comportamento idêntico provado na tela, cada extração exigiu decidir na hora se o
markup era cópia literal).

**Sem context packet** (`context_packet: null`): a fonte foi o código de
`frontend/src/features/catalog/`, a rule `.claude/rules/frontend-fsliced.md` e o relatório do
`/revisar-frontend` da mesma sessão — nada de Drive/Notion/Figma.

**Escopo entregue (5 tasks de conteúdo).** Task 1 (C-3/C-4): `CoursesTable.tsx:87` — o template
literal quebrado (`` `pi pi-book }` ``) virou `"pi pi-book"` e o hex `'#25A5E4'` hardcoded virou
`BRAND_COLOR` de `@shared/config/brand`, ambos no-op visual por construção. Task 2 (B-1):
`modulesTotal`/`hoursMismatch` subiram do `CourseDialog` para o `useCourseForm` — o `reduce` que
vivia em componente agora mora no hook, dono de `form.modules`/`form.workload_hours`. Task 3 (C-1):
o quadro de módulos (76 linhas, 5 campos por item) virou `ModuleFields` (lista, `key={i}`, add,
totais) + `ModuleCard` (um módulo, `index` fechado nos handlers) — molde `ContactFields`/
`ContactCard` do `ClientDialog`, `Fragment` no lugar de `<div>` (os filhos são irmãos diretos do
`section` com `space-y-4`). Task 4 (B-2): a navegação do olho (`useNavigate`/`usePermissions`/
`openRedator`) subiu para o `useCourseRedatores(enabledIds, onClose)`, que passou a expor
`canOpenRedator` e `openRedator`; `onClose` roda antes do `navigate`. Task 5 (C-2): a seção de
redatores (ternário de 4 ramos: loading > erro > create > view/edit) virou `CourseRedatoresSection`
— não achatada em guarda sequencial, o 3º ramo é modo de diálogo, não estado de carga. B-3
(`enabledIds` alias) desapareceu como efeito colateral da Task 5; os `r.id as number` ficaram
concentrados no `CourseRedatoresSection` (ajuste da D8, fora do escopo mexer no `generated.ts`).

`CourseDialog.tsx` foi de **251 para 96 linhas**.

Branch `refactor/abstracao-componentes-catalog` a partir do `main` (D1, sem worktree — DoD provado
na tela contra o `docker compose` do main tree), 5 commits de conteúdo (`9bc5973`..`c78d719`).

**Prova visual em 1 checkpoint (D10), sem baseline capturada** (mesma limitação dos blocos
anteriores — sem ferramenta de browser/screenshot na sessão; a checagem "na tela" de cada task
individual foi substituída por revisão de diff literal linha a linha, com a prova real reservada
para este checkpoint único): Cursos (busca, os 2 empty states, ícone na cor de marca), diálogo
**create** (add/mover/remover módulo, total, aviso âmbar sem bloquear submit, grid de redatores
selecionável), **view** (leitura, olho leva a `/personas?redator=<id>`, "sem redatores" quando
vazio), **edit** (campos e módulos editáveis, redatores em leitura), **erro** de redatores com
Reintentar (backend derrubado e restaurado) — **aprovado pelo João em 2026-08-03**.

**Gate automatizado (Task 7):** `pnpm build` + `pnpm lint` verdes; diffs de `backend/`, `shared/`,
`locales/` e `generated.ts` vazios; greps de query-em-componente, `primereact` direto,
cross-feature, `#25A5E4` fora de `shared/config/brand.ts`, `pi-book }` quebrado e `reduce(` em
componente — todos sem saída; `CourseDialog.tsx` em 96 linhas (abaixo de 100); nenhum órfão
(`ModuleFields`, `ModuleCard`, `CourseRedatoresSection` com exatamente 1 consumidor cada;
`modulesTotal`, `hoursMismatch`, `canOpenRedator`, `openRedator` todos com leitor); suíte backend
**372 passed (1360 assertions)**, igual à baseline — sem regressão. Pint **n/a** (zero arquivo de
`backend/` no diff); `typescript:transform` **n/a** (nenhum DTO tocado).

**Review em 2026-08-03 (`/revisar-sprint`, baixo risco** — 100% frontend, zero arquivo de `backend/`,
`generated.ts`, locales, auth, RBAC, schema ou dinheiro no diff, `executor: claude`; só lente Claude,
sem Codex). Órfãos: nenhum — os 10 arquivos de `catalog` com consumidor, os 3 componentes novos com
exatamente 1 cada. Leis §5: sem violação.

**As extrações foram provadas literais, não assumidas.** Comparação normalizada do `main` contra os
arquivos novos: `ModuleCard` é **idêntico byte a byte** às linhas 97-170 do `CourseDialog` original,
com exatamente 4 linhas divergentes — todas previstas (`key={i}` migrou para o `.map`; `i === 0` /
`i === length-1` viraram `isFirst`/`isLast`; os 3 handlers viraram props). `ModuleFields` preserva a
ordem dos blocos (vazio → lista → add → total → aviso). `CourseRedatoresSection` difere do ternário
original só pelas chaves `{...}` de interpolação JSX que somem ao virar `return` — os 4 ramos na
mesma ordem, cada um produzindo um elemento, DOM sem nó novo. Fidelidade ao molde confirmada:
`fieldErrors?: Record<string, string[]> | null` é a assinatura exata do `ContactCard`/`ContactFields`,
e `ReturnType<typeof useCourseRedatores>` tem precedente em `RedatorDesignation.tsx`
(`useRedatorPicker`), com os 7 campos do hook consumidos. Descartados antes de virar achado:
`enabledIds` chegar ao hook e ao componente não pode divergir (mesma `form.redator_ids`, mesmo
render, D3); derivação sem `useMemo` é o comportamento de antes.

**1 achado 🟡, aprovado pelo João e corrigido na mesma sessão** (`58ce5d8`):

- **Q-1 🟡** A **régua de ~150 linhas não existia.** A spec §1 deste bloco abre citando "251 linhas
  … contra a régua de ~150 **da rule**", e o `state.md` do bloco anterior a cita igual — mas
  `grep -niE "régua|~1[0-9]{2}|tamanho"` na `frontend-fsliced.md` voltava **vazio**, e
  `pendencias.md` também não a registrava (lição 13: doc que descreve intenção não-construída).
  Pior, o padrão que ela deveria conter — bloco coeso preso dentro de componente grande — custou
  **três blocos consecutivos** de refactor: `abstracao-componentes-operation` (2026-08-02),
  `zerar-catraca-e-componentes-commercial` e este. Pela cláusula de reincidência do `/revisar-sprint`
  + lição 14, virou **mecanismo**: `max-lines` (150) em `eslint.config.js` sobre
  `src/features/*/components/**`, mais o texto correspondente na rule (com os moldes
  `ContactFields`/`ContactCard` e `ModuleFields`/`ModuleCard`, e a regra do `Fragment` na extração).
  O limite saiu da distribuição real, não de chute: 53 dos 57 componentes de feature já ficavam
  abaixo dele. Entrou com **catraca** de 4 legados (`StudentDialog` 189, `RedatorDialog` 189,
  `RedatorDocumentSlot` 175, `BudgetDetailPage` 171), lista que só encolhe. **Bloco de config
  separado** do `no-restricted-syntax` de propósito — `ignores` compartilhados reabririam em silêncio
  a catraca de query-em-componente zerada em 2026-08-03.
  **Provado nos dois sentidos (lição 10):** com a catraca esvaziada, reprovou exatamente os 4, com as
  contagens batendo o `wc -l` (`File has too many lines (171|175|189|189). Maximum allowed is 150`);
  sonda temporária de 160 linhas em `catalog/components/Course/` reprovou **com a catraca ativa**
  (prova de que ela não acoberta arquivo novo); a **mesma** sonda movida para `catalog/hooks/` ficou
  em silêncio, confirmando o escopo — hook longo é legítimo, componente inchado não. Sonda apagada,
  árvore limpa.

**Revalidação pós-correção:** `pnpm build` + `pnpm lint` verdes; todos os greps do DoD rerodados
limpos; os 4 diffs proibidos (`backend/`, `shared/`, `locales/`, `generated.ts`) seguem vazios; placar
da catraca reconferido em exatamente 4 arquivos, sem drift.

**Divergência de DoD, resolvida pelo próprio Q-1:** `CoursesTable.tsx` ficou com 125 linhas — acima
do "~110" que a spec §5 pedia. Não era dívida deste bloco (124 no `main` antes da Task 1; a +1 é o
import do `BRAND_COLOR`, e o escopo era a linha 87, não a estrutura do arquivo). O número "~110" da
spec era régua avulsa de um bloco; o mecanismo do Q-1 fixa a régua do projeto em **150**, e
`CoursesTable` passa nela com folga. Não há dívida aberta aqui.

**Gate de fechamento (2026-08-03).** **Item 0 — critério de aceite do bloco, não higiene genérica:**
o critério é comportamento idêntico na tela, provado pelo João no checkpoint único (D10), aprovado em
2026-08-03; a única mudança depois dele foi `58ce5d8` (Q-1), que tocou **apenas** `eslint.config.js` e
`.claude/rules/frontend-fsliced.md` — nenhum componente, confirmado por `git show --name-only` no
fechamento — então a aprovação visual continua válida, diferente do bloco do redator, onde o markup
mudou de forma e a prova teve de ser refeita. A metade mecanismo foi **reprovada de novo no próprio
fechamento (lição 10)**: sonda de 160 linhas em `catalog/components/Course/` devolveu
`File has too many lines (160). Maximum allowed is 150  max-lines` **com a catraca ativa** (ela não
acoberta arquivo novo), e a **mesma** sonda em `catalog/hooks/` ficou em silêncio (escopo correto —
hook longo é legítimo); sondas apagadas, árvore limpa. Placar da catraca reconferido pelo `wc -l`:
exatamente os 4 arquivos de `ignores` acima de 150 (`StudentDialog` 189, `RedatorDialog` 189,
`RedatorDocumentSlot` 175, `BudgetDetailPage` 171), sem drift; `CourseDialog` em 96 linhas.
Suíte backend **372 passed (1360 assertions)** como regressão; `pnpm build` + `pnpm lint` verdes;
Pint **n/a** (zero arquivo de `backend/` no diff); `generated.ts`, locales e `shared/` sem diff e
nenhum DTO tocado, logo sem `typescript:transform`; greps das leis §5.6 (`primereact` direto,
cross-feature) e do DoD (query-em-componente, `#25A5E4` em `features/`) sem saída; sem órfão — os 3
componentes novos com exatamente 1 consumidor cada e os 4 campos novos de hook com leitor.
Pendências: nenhum gatilho vencido (o mais próximo é P-04, 2026-08-15) e nenhuma pendência nova — a
catraca de `max-lines` nascida aqui é item de código e foi para §Débitos técnicos do `backlog.md`,
não para `pendencias.md`. **P-25 segue aberta:** o `frontend-fsliced.md` foi tocado, mas no parágrafo
da régua de tamanho, não no da fronteira de tipo que fecharia o gatilho dela.

Código morto: nenhum. O `frontend/src/features/operation/components/.gitkeep`, que o fechamento
anterior registrou como órfão com deleção não commitada no working tree do João (lição 9), **foi
deletado por ele em `e236aa0`**, commit anterior a esta branch — a pendência não existe mais.

Arquivado: `plans/archive/2026-08-03-abstracao-componentes-catalog.md` ·
`specs/archive/2026-08-03-abstracao-componentes-catalog-design.md` (sem context packet — a fonte foi
o código de `features/catalog/`, a rule `frontend-fsliced.md` e o relatório do `/revisar-frontend` da
mesma sessão).

**Aberto, registrado, não resolvido:** a catraca de 4 legados do `max-lines` (§Débitos técnicos do
`backlog.md`); o B-7 (`courses.data ?? []` no `QuoteWizard`); e P-25.
