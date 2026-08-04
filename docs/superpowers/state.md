---
schema_version: 1
active_feature: hardening-tabela-e-testes-pre-sprint-4
active_work_item: hardening-tabela-e-testes-pre-sprint-4
workflow_state: context_required
next_owner: codex
next_action: generate_context_packet
active_spec: null
active_plan: null
context_packet: null
blocker: null
resume_state: null
last_completed_work_item: hardening-guardrails-e-transportes-pre-sprint-4
state_basis_commit: e7884c3
updated_at: 2026-08-04T17:00:00-03:00
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

## Bloco ativo — `hardening-tabela-e-testes-pre-sprint-4`

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-04** (`/planejar-bloco`
com o escopo nomeado no argumento — "Hardening pré-Sprint 4" — e o estado em `idle`; o comando não
promove item sozinho). É o **terceiro e último recorte** do mesmo item que dois blocos de 2026-08-04
fecharam parcialmente: entregues H.4.1–H.4.3 pelo `hardening-estrutural-pre-sprint-4` e H.3.1,
H.4.6, H.4.7, H.4.8 pelo `hardening-guardrails-e-transportes-pre-sprint-4`. Abertos: **H.4.4, H.4.5
e H.4.9**. O backlog já registra esse recorte desde `3d7aca5`, então nenhuma edição dele acompanha
esta transição.

**O id não promete o item inteiro.** `hardening-tabela-e-testes-pre-sprint-4` descreve o conteúdo
das três tasks (moldura de tabela + aliases de página; builders de teste no backend), não a posição
na fila. Escolhido pelo João junto da seleção; renomeável na revisão da spec se o corte mudar, como
ocorreu no bloco anterior.

**Rota `context_required`, por gatilho de staleness — não por rotina.** O packet de 2026-08-04
(`context-packets/hardening-guardrails-e-transportes-pre-sprint-4.md`, `status: ready`,
`base_commit` `7419c32`) cobre as 7 tasks daquele recorte, inclusive as 3 restantes, com os sinais
de aceite de cada uma. **Ele está stale por dois dos seus próprios gatilhos declarados**
(§Staleness triggers):

1. **Mudança semântica no item do backlog** — H.3.1, H.4.6, H.4.7 e H.4.8 saíram da lista, e o item
   passou a carregar a conclusão técnica do H.4.5, escrita no fechamento.
2. **Decisão posterior do João sobre H.4.5 ou sobre o corte** — H.4.5 foi retirado do corte na
   revisão da spec de 2026-08-04, e a conclusão técnica registrada **contradiz o sinal de aceite
   externo que o próprio packet transcreve**: o packet diz "aliases sem valor são eliminados ou
   justificados"; o backlog diz que **eliminar é a resposta errada**, porque `useCrudPage` chama
   `resource.useList()` por dentro e matar os aliases moveria a query para as quatro páginas,
   regredindo a fronteira zerada em 2026-08-03 — e **passaria no lint**, porque o seletor casa
   `budgetsApi.useList()` e não `useCrudPage(budgetsApi)`.

Some-se a isso que `base_commit` está 8 commits atrás do `HEAD` (`e7884c3`). Logo o packet **não é
reaproveitado como está**; o Codex gera um novo, para as 3 tasks restantes.

**Ponto de partida que o novo packet precisa reconciliar, não redescobrir:** o Drive V2 segue sem
documento que delimite este hardening (confirmado duas vezes — buscas dirigidas voltaram só ADRs,
Certification e setup); a contradição do H.4.5 acima é a divergência a registrar, **não a decidir** —
o corte é do brainstorming, e o mérito técnico já está resolvido no backlog.

**Dependências Notion, atualizadas pelo que os dois blocos entregaram:** H.4.4 dependia de H.4.3 —
**satisfeita** (vitest desde 2026-08-04). H.4.9 dependia de H.4.6 — **satisfeita** desde o bloco de
guardrails. Resta **uma interna ao bloco**: H.4.5 → H.4.4. Nenhuma task restante está bloqueada por
algo fora deste bloco.

**Débitos técnicos vizinhos, registrados e fora do corte até decisão contrária:** a catraca do
`max-lines` cita `StudentDialog` (189) e `RedatorDialog` (189), que são telas de tabela/diálogo na
mesma vizinhança do H.4.4; e Q-2 (guardrail de rota escapa com parâmetro não tipado) e Q-4 (teste do
`postMultipart` mocka o axios inteiro) seguem em §Débitos técnicos do `backlog.md`.

## Último item fechado — 2026-08-04 (`hardening-guardrails-e-transportes-pre-sprint-4`)

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

**Review em 2026-08-04 (`/revisar-sprint`, ALTO RISCO** — `executor: misto`, Tasks 1/4 no Codex, e o
bloco toca `backend/` e caminhos de upload com peso legal; lente Claude **+** revisão independente do
Codex, `mcp__codex__codex` read-only). Gate reconferido do zero, não aceito por relatório: backend
**376 passed (1366 assertions)**, `pnpm test` **21 passed**, build e lint verdes, árvore limpa. Diff
literal contra o plano nos 20 arquivos. Órfãos: nenhum — os `app()` restantes em DTO são exatamente a
família 2 + `TurmaData` (D8/D10, registrados). Leis §5: sem violação. **5 achados; o João aprovou
Q-1 e Q-5**, os outros 3 foram deferidos com destino registrado.

**Q-1 🔴 — o mecanismo entregue nascia invisível para a próxima sessão.** O `postMultipart` passou a
existir e o comentário da lição 6 saiu dos 5 consumidores, mas a `frontend-fsliced.md` seguia
ensinando o padrão antigo ("monte o `FormData`, deixe o axios derivar") e **nada** impedia uma feature
de montar `FormData` na mão — nem lint, nem teste, nem rule. É o Q-3 do review anterior outra vez
(lição 13), com falha silenciosa em caminho de peso legal. Virou mecanismo (lição 14):
`no-restricted-syntax` reprova `new FormData()` em `src/features/**`, com catraca de **um**
(`useRedatorForm`, spec D11), mais o parágrafo correspondente na rule. **A armadilha do bloco
anterior foi evitada de propósito:** flat config faz merge raso de `rules`, então o seletor novo entra
no bloco de `components/` junto dos dois já existentes, e o bloco novo exclui `components/` por
`ignores` — dois blocos sobrepostos apagariam os seletores de query-em-componente em silêncio, que
foi exatamente o Q-2 do review passado. **Provado nos três pontos com sonda:** `FormData` em `api/`
reprovou, `FormData` em `components/` reprovou, e a regra de query-em-componente **continuou**
disparando no mesmo arquivo (prova de que a colisão não voltou); `useRedatorForm` ficou em silêncio,
confirmando a catraca. Sondas removidas, árvore limpa.

**Q-5 🟢 — o `flatten` do `parity.test.ts` media `typeof value === 'string'`** e tratava todo o resto
como sub-árvore: `Object.entries(1)` devolve `[]`, então uma chave com valor numérico **sumia** da
lista — acusada como faltando na locale que a tivesse com outro tipo, e invisível quando as três a
tivessem assim; com `null`, `TypeError` sem dizer qual chave. Folha passa a ser tudo que não é
objeto. **Visto reprovando antes** (chave numérica nas 3 locales acusava `Faltando:
common.sondaNumero`, um falso positivo) e as duas direções reconferidas depois, com `null` e booleano.
Locales restauradas por `git checkout`, diff de `locales/*.json` vazio.

**Deferidos pelo João, registrados e não resolvidos:** Q-2 🟡 (o guardrail de rota escapa em silêncio
se o parâmetro não for tipado como model — sonda com `int $item` numa rota nested **passou**) e
Q-4 🟡 (o teste do `postMultipart` mocka o módulo `axios` inteiro, então a lição 6 na instância real
segue guardada só por comentário) foram para §Débitos técnicos do `backlog.md`. Q-3 🟡 virou **P-26**
em `pendencias.md`: a troca de `abort_unless` por `scopeBindings` mudou **403 → 404** para usuário sem
a permissão da rota, porque `SubstituteBindings` roda antes do middleware `permission:` — provado por
sonda — enquanto a spec §4 e os commits afirmam "nenhum comportamento observável muda". Dano prático
baixo (~10 usuários staff, e 404 vaza menos que 403); o que fica aberto é a afirmação.

**Divergência entre revisores, mostrada e não resolvida em silêncio:** o Codex lê a **D9** como
**sinal 2**, porque `DtoTest.php:46` e `SoftDeletedRelationProjectionTest.php:118` obtêm o serviço via
`app()` e o repassam. A execução fechou como **sinal 1**, com o argumento de que a produção ficou
limpa em 1 nível e os testes são adaptação mecânica de assinatura. A leitura é do João no fechamento.
**Descartados do Codex, verificados:** "controller declara o filho antes do pai" (o scoping usa a
ordem da URI, não a assinatura; zero casos) e "falso positivo de model injetado por container"
(decisão registrada em D6, zero casos hoje — a direção que morde é a oposta, o Q-2).

**Revalidação pós-correção, tudo do zero:** backend **376 passed (1366 assertions)**, `pnpm test`
**21 passed**, `pnpm build` e `pnpm lint` verdes; `generated.ts`, `locales/*.json` e
`backend/database/` sem diff; 2 commits de correção (`161aa18`, `3a638ef`).

**Gate de fechamento (2026-08-04).** **Item 0 — critério de aceite do bloco, não higiene genérica:**
o bloco entrega guardrail e transporte, então a prova é reprovar os mecanismos de novo com sonda
fresca (lição 10) **e** o upload real, não a suíte verde. Reconferido do zero, fora do que o review já
tinha provado: sonda de rota nested com 2 bindings **sem** declaração reprovou o
`NestedRouteOwnershipTest` citando `DELETE api/sondafech/{course}/itens/{template}`, e a **mesma**
rota com `->withoutScopedBindings()` passou (a prova nos dois sentidos, que é o que distingue este
guardrail de um teste que só sabe dizer "sim"); sonda de chave excedente em `pt-BR` reprovou o
`parity` nomeando `common.sondaFech`; sonda de `new FormData()` em `features/operation/api/` reprovou
o `no-restricted-syntax` nascido no Q-1. Todas as sondas removidas, árvore limpa nos três casos.

**Prova e2e contra a API real, com sessão Sanctum** (lição 12 — `Origin` + `Accept` + `X-XSRF-TOKEN`;
o login é `admin@lotus.cl`/`senha123`, do `DatabaseSeeder`): **foto** `POST /api/users/1/photo` → 204,
e a URL pré-assinada devolveu **200 `image/png` com os 70 bytes** do PNG enviado; **documento de
turma** `POST /api/turmas/8/documents` → 201 com `size: 69`, os bytes reais do PDF — é exatamente
esse número que a lição 6 zera em silêncio, com 201 de sucesso. O dado de teste foi removido pela
própria rota de DELETE, o que rendeu a terceira prova de graça: `DELETE /api/turmas/7/documents/40`
(pai errado) → **404**, e `DELETE /api/turmas/8/documents/40` (dono) → **204**. O 404 cross-pai do
H.3.1 passou a estar provado na API, não só em teste.

Suíte backend **376 passed (1366 assertions)** reconferida; `pnpm test` **21 passed**, `pnpm build` e
`pnpm lint` verdes; Pint (`--test`) `passed` nos **11** arquivos `.php` tocados, com a guarda de lista
vazia que o auto-review do plano exigiu (lição 9); `typescript:transform` rodado porque o diff toca
`BudgetData.php` — **`generated.ts` sem diff**, como esperado, já que `fromModel` é construção e
nenhuma propriedade do DTO mudou; diffs de `locales/*.json` e `backend/database/` vazios. Código
morto: nenhum — os 4 arquivos novos têm consumidor (`postMultipart` com 5 arquivos / 6 pontos, os 2
testes rodam pelos runners, o guardrail é a suíte), nenhum `.gitkeep` ou placeholder criado aqui.
Leis §5: sem violação — o bloco não toca DDD, auditoria, auth, RBAC ou financeiro; reforça a §5.6 com
mecanismo novo.

**Pendências:** nasceu **P-26** (a troca de `abort_unless` por `scopeBindings` mudou 403 → 404 para
usuário sem a permissão da rota, contra a afirmação de "nenhum comportamento observável muda"). Nenhum
gatilho vencido — P-04 é o mais próximo (2026-08-15). **P-25 segue aberta:** a `frontend-fsliced.md`
foi tocada, mas no parágrafo de upload, não no da fronteira de tipo que fecharia o gatilho dela —
mesma situação do fechamento anterior.

Item 1 do backlog (**"Hardening estrutural pré-Sprint 4"**) não fechou por inteiro — restam **H.4.4,
H.4.5 e H.4.9** dos 10 itens do conjunto Notion. Editado, não removido: os 4 entregues saem da lista,
e o item passa a carregar a **conclusão técnica do H.4.5** (obrigação de fechamento do plano), para o
próximo bloco não reabrir a análise e chegar à resposta errada — eliminar os aliases regrediria a
fronteira de query-em-componente e **passaria no lint**.

Arquivado: `plans/archive/2026-08-04-hardening-guardrails-e-transportes-pre-sprint-4.md` ·
`specs/archive/2026-08-04-hardening-guardrails-e-transportes-pre-sprint-4-design.md` (não
compartilhada por outro work item). Entrega registrada em `progress.md` (a mais antiga,
`Hardening · Sincronização de documentação` de 2026-07-30, migrou para `progress-archive.md` para
manter o teto de dez).

**Os 2 writes externos foram enviados e conferidos por releitura**, com o texto aprovado pelo João
antes do envio e por ID na base canônica (`collection://e64b7d57-d000-4433-b652-a410e75193cc`):
**D4b** na task H.3.1 (`39dbc9603dfa81f39e52ec6033137656`) — as 3 rotas shallow não representam o
risco que a task descreve, o recorte real foi `files`, e a nota de que o cruzado passou de 403 a 404
sem permissão; **D11b** na task H.4.7 (`3b1bc9603dfa815c991bd10373d74cf6`) — recorte de 6 de 7 pontos
e a decisão de as mutations de `delete` não entrarem em helper. **O `Status` das 4 tasks entregues
segue `Backlog` por decisão do João no fechamento** — o plano previa só os textos, e mudar status era
escopo novo que ele não autorizou.

**Aberto, registrado, não resolvido:** Q-2 e Q-4 do review (§Débitos técnicos do `backlog.md`); P-26;
P-04 para §5.1/§5.2 (reavaliar 2026-08-15); P-25; H.4.4, H.4.5 e H.4.9 no item 1 do backlog.

## Penúltimo item fechado — 2026-08-04 (`hardening-estrutural-pre-sprint-4`)

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
