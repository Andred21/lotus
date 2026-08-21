---
schema_version: 1
active_feature: null
active_work_item: bd12-load-state-e-listas
workflow_state: blocked
next_owner: joao
next_action: approve_review_findings
resume_state: reviewing
active_spec: docs/superpowers/specs/2026-08-20-bd12-load-state-e-listas-design.md
active_plan: docs/superpowers/plans/2026-08-20-bd12-load-state-e-listas.md
context_packet: null
blocker: 'review do BD-12 (risco BAIXO) sem violacao de lei e sem orfao; 2 achados 🟢/P aguardando decisao — Q-1 linha de rule sobre cellMemo em frontend-fsliced.md, Q-2 acentos no comentario novo de AppDataTable.tsx:118-134. Fora de escopo, registrado sem inflar: beforeAll+mutacao de idioma em archivedColumns.test.tsx, raio zero hoje.'
last_completed_work_item: bd14-contrato-de-entrada
state_basis_commit: fc852ce3
updated_at: 2026-08-21T02:55:00-03:00
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

## Último item fechado — 2026-08-20 (`bd14-contrato-de-entrada`, BD-14 do backlog)

### Execução — 2026-08-20: 9 tasks, técnica `subagent-driven-development`, main tree

Bloco de backend, então **main tree** e não worktree (P-03: o compose monta o main tree, e testar
backend em worktree produziria verde contra código diferente). Base da branch `feat/bd14-contrato-de-entrada`:
`0fe30b13`. Ledger task a task em `.superpowers/sdd/progress.md` — aqui fica só o que decide.

As três leis que o bloco construiu:

- **"Ausente não é nulo"** (D1) — `App\Shared\Data\WritableAttributes::from()` tira do array toda
  chave que chega como `Optional`; só `null` explícito apaga. Aplicada a 10 campos em 5 `Update*Action`.
- **Chave `#[Computed]` no corpo de escrita vira 422** (D3) — `App\Shared\Data\ComputedFields::rejected()`
  com a regra `missing`, e **não** `prohibited`: o vendor implementa `validateProhibited` como
  `! validateRequired`, então presente-porém-vazio (`null`, `''`, `[]`) passaria com 200 silencioso.
- **Colisão de índice único de `users` vira 422 com o campo nomeado** (D4) — `UserProvisioner::writing()`
  sobre os 9 sítios que escrevem `User`, cobrindo as duas grafias de driver.

Mais `seq_in_budget` fora do `$fillable` (D5), escrito pela Action sob o lock que já existia.

### Três decisões tomadas durante a execução

1. **Convenção vence o plano nos nomes de teste** (decisão do João): classe em inglês, método em
   português. As quatro classes de omissão foram renomeadas; o plano cita os nomes antigos no DoD da
   Task 9 e a equivalência está no ledger.
2. **A varredura da Task 8 passou dos `paths_autorizados` do plano.** O `## Handoff` autorizava
   `Quote::create` → `forceCreate` só em `Comercial/**` e `Operation/**`; sobravam 15 arquivos e a
   branch ficava com 22 falhas. Estendida depois de confirmar que **não existe `Quote::create(` em
   `backend/app/`** — a varredura é 100% código de teste. 45 arquivos, 50 ocorrências.
3. **`ProfileData` e `SessionUserData` ganharam `#[Computed]`** fora da lista de seis do plano, porque
   a DoD exige os 11 campos de foto. São DTOs só-de-saída, nascem de `fromUser()`, nunca de request.

### DoD — 2026-08-20, remedido em `5a8bcdc`

**861 testes verdes / 5 skipped**, por diretório porque a suíte unida estoura o `memory_limit` de
128M do container (P-50 confirmado de novo): Cadastros 155 · Certification 97 · Comercial 86 ·
Dashboard 37 · Identity 256 · Operation 144 · Shared 69 · Unit 17. Zero falhas. Pint verde nos
**76** arquivos PHP do bloco. `typescript:transform` com **zero diff** em `generated.ts`. Cada item
da DoD da spec mapeia para um teste nomeado e existente.

### Review final da branch — o achado que os gates por task não podiam ver

Veredito: **o que o bloco construiu está correto e provado, nada regrediu.** Mas a lei que ele declara
não vale em todo lugar que devia valer, e três contraexemplos estão dentro das Actions que o próprio
bloco editou.

A raiz: o `DefaultValuesDataPipe` do Spatie entrega o **default literal** quando a chave está ausente,
**antes** do ramo que preencheria `Optional`. `WritableAttributes` recebe então um valor real e não
tem como saber que ele foi inventado. A medição da D-13 era cega a isso — ela procurou o idioma
`instanceof Optional ? null`, e aqui o valor nunca chega como `Optional`.

Seis campos, nenhum deles regressão do bloco. **`UserData::$is_active = true` é controle de acesso:**
um `PUT /api/users/{id}` que omita a chave reativa staff desligado, e `is_active` é o portão que
`AuthController:52` usa para barrar login. Fora do `active_work_item` (a D-13 mediu 10 campos, a D-12
mediu 11 de foto; nenhum destes seis está nas listas) e o remédio ainda escolhe entre duas leituras
da D1 — foi para **[P-51](./pendencias/abertas.md)** com o custo dos dois caminhos medido.

Os Minor de código do próprio bloco foram corrigidos antes do handoff: `bfcbbc7` (o tradutor de
coluna duplicada sequestrava `NOT NULL constraint failed`), `dd0cda1` (o arch test dos 11 campos
passava vazio se o `glob` não achasse nada) e `5a8bcdc` (três dialetos fora de compasso).

### Um ponto de estado a refazer no fechamento

O base da branch, `0fe30b13`, é literalmente o commit que promoveu `bd17-superficie-de-arquivados` a
`ready_for_planning` — e o BD-14 sobrescreveu esse `active_work_item`. Nada se perdeu (o BD-17 e seus
três débitos vivem no `backlog.md:208`), mas **a promoção precisa ser refeita quando o BD-14 fechar.**
O `state_basis_commit: 0c8db94` não é o base da branch e não deveria ser: é o commit contra o qual as
medições do `backlog.md` foram tomadas, que é o que o campo quer dizer.

> **Resolvido no merge da `main` (ver a seção do merge, adiante):** a promoção não precisou ser
> refeita — a `main` promoveu, executou e fechou o BD-17 em paralelo, em 2026-08-20.

### Review do bloco — 2026-08-20: risco ALTO, duas lentes, zero violação de lei

Classificação **alto risco** (DTO de entrada, contrato HTTP, identidade/acesso, `generated.ts` no
raio). Duas lentes: gabarito do projeto (CLAUDE.md §5 · `docs/README.md` · ADRs · rules) e revisão
independente do Codex (read-only) sobre `0fe30b13..HEAD` — **o Codex não confirmou nenhum achado**.

Reprovas rodadas nesta review, não herdadas: **861 verdes / 5 skipped** por diretório (P-50 de novo:
a suíte unida morre no `memory_limit`, e `php -d memory_limit=512M` não sobe o limite do processo
filho do `artisan test`); `typescript:transform` com árvore limpa; nenhum órfão (os dois helpers
novos têm 7 e 6 chamadores); `Quote::create` sem sobra fora da Action.

Dois achados, ambos sobre o **alcance** da lei nova, nenhum regressão do bloco:

- **Q-1 🟡** — a D-12 aplicou `ComputedFields::rejected()` só à chave de foto. Seis chaves
  `#[Computed]` não-foto seguem engolidas com 200 em DTO de entrada: `UserData::$last_login`,
  `RedatorData::$last_login` e `$documents`, `StudentData::$current_client_id`,
  `$current_client_name` e `$enrollments_count`. `current_client_id` é o caso que dói: quem mandar
  vínculo no `PUT /api/students/{id}` recebe 200 e nada acontece. `documents` NÃO entra sem olhar o
  multipart do redator.
- **Q-2 🟢** — o arch test dos 11 campos varre só `app/Domains/*/Data/*.php`; campo de foto que
  nascer em `app/Shared/*/Data/` escapa da varredura e da contagem.

### Correções do review — 2026-08-20: os dois achados aprovados

O João aprovou Q-1 e Q-2; os dois entraram, com o teste reprovando antes (5 vermelhos contra o
código antigo).

- **Q-1** — `ComputedFields::rejected()` passou a listar as chaves `#[Computed]` não-foto dos três
  DTOs de entrada que as tinham: `last_login` em `UserData` e `RedatorData`;
  `current_client_id`, `current_client_name` e `enrollments_count` em `StudentData`.
  `RedatorData::$documents` ficou **de fora por medição**, com o porquê no sítio: ali a chave é
  escrita real (multipart de arquivo, descartado por `prepareForPipeline` antes dos pipes) e
  `missing` reprovaria o upload legítimo. O SPA não manda nenhuma das cinco chaves fechadas —
  `useStudentForm:22` já traduz `current_client_id` para `client_id`, que segue aceita.
- **Q-2** — o arch test dos 11 campos passou a varrer também `app/Shared/*/Data/*.php`. A contagem
  segue 11: hoje não há campo de foto fora de `Domains`, e é exatamente esse futuro que o glob
  cobre.

Reprovas depois das correções: **866 verdes / 5 skipped** por diretório (Shared foi de 69 para 74),
Pint verde nos 4 arquivos tocados, `typescript:transform` sem diff em `generated.ts`.

**Review encerrada sem achado pendente.**

---

### Fechamento — 2026-08-20: a DoD provada contra a API real, e o banco de dev devolvido como estava

**Critério de aceite provado end-to-end** (nginx `:8080`, sessão Sanctum de admin, MySQL de dev),
não só por suíte:

- **DoD 1 e 2** — `PUT /api/users/108` **omitindo** `rut` e `phone` → **200**, e o `GET` seguinte
  devolveu `rut="16.982.435-5"` e `phone="+56 9 8888 0001"` intactos. O mesmo `PUT` com
  `"rut": null, "phone": null` → **200** e os dois campos `null`. O par é a prova: só o segundo ramo
  deixaria a regressão passar verde.
- **DoD 3** — `photo_url` no corpo → **422** nas duas formas (`"http://evil/x.png"` e `null`), com
  `El campo photo url no debe estar presente.`; `last_login` → **422**; no aluno,
  `current_client_id` e `enrollments_count` → **422** (as chaves que o review acrescentou).
- **DoD 4** — `POST /api/users` com RUT já cadastrado → **422** com
  `rut: "Este RUT já está cadastrado."`. A corrida **em si** não é alcançável por uma request só —
  as duas portas (check e índice) devolvem a MESMA resposta por desenho, e a tradução do índice está
  provada em `UniqueIndexCollisionTest` com as cinco mensagens reais de driver.
- **DoD 5** — dois `POST /api/budgets/14/quotes` com `"seq_in_budget": 99` no corpo gravaram **1** e
  **2**. O payload não vence a derivação sob lock.

**Resto do gate.** Backend **866 passed / 5 skipped** por diretório (Cadastros 155 · Certification 97
· Comercial 86 · Dashboard 37 · Identity 256 · Operation 144 · Shared 74 · Unit 17); a suíte unida
morreu no mesmo `memory_limit` de sempre (P-50, gatilho visto vencer de novo e registrado na ficha).
Frontend `pnpm lint` 0, `pnpm build` verde, **435 testes**. Pint `--test` **passed** nos **76**
arquivos PHP do bloco (nunca sem argumento). `typescript:transform` rodado de novo com **zero diff**
em `generated.ts`. Código morto: os dois helpers criados têm 7 e 6 chamadores, nenhum `.gitkeep`
nasceu no bloco. Leis §5: nenhuma contrariada.

**Zero resíduo no banco de dev** (a P-44 existe justamente por gates que esqueceram o próprio
rastro): o staff de sonda (`gate-bd14@lotus.cl`, id 108), o orçamento `GATE-BD14` (id 14), as duas
cotações (13, 14) e as **6** linhas de auditoria que eles geraram foram removidos com `forceDelete`.
Conferido depois: `user=0 budget=0 quotes=0`.

**Pendências.** **P-29** e **P-35** encerradas por este bloco e movidas para `encerradas.md` com o
rastro do que as fechou. **P-51** nasceu na review final e segue aberta (decisão do João). **P-50**
teve o gatilho visto vencer de novo. **P-49 ficou órfã de bloco:** a ficha ainda diz `Bloco: BD-14`,
que acabou de fechar sem absorvê-la — reagrupar é decisão do João, não heurística do agente.

**`state_basis_commit` passa de `0c8db94` a `c61e2f4`, e isso não é divergência.** `0c8db94` era o
commit contra o qual as medições do `backlog.md` foram tomadas para ESTE bloco; fechado o bloco, o
campo volta a apontar para o último commit que comprova a entrega — o segundo dos dois que
corrigiram os achados do review.

**Um ponto de estado que este fechamento NÃO resolveu:** a `feat/bd14-contrato-de-entrada` nasceu
sobre `0fe30b13`, o commit que promovia `bd17-superficie-de-arquivados` a `ready_for_planning`, e o
BD-14 sobrescreveu esse `active_work_item`. O estado fecha em `idle` porque o gate proíbe promover
por ordem óbvia; **a promoção do BD-17 é do João** (`backlog.md`, BD-17). Isso valia enquanto este
branch não via a `main`: o merge de 2026-08-20, na seção adiante, mostrou o BD-17 já promovido,
executado e fechado lá.

### Merge da `main` — 2026-08-20: a promoção pendente do BD-17 já tinha sido feita do outro lado

O João mandou trazer a `main` para este branch antes de o PR ([#62](https://github.com/Andred21/lotus/pull/62))
ser mesclado. `git merge main` sobre a base `0fe30b13` trouxe **17 commits** e abriu **dois
conflitos, os dois de documentação de estado** — `state.md` e `historico/progress.md`. **Todo o
código mesclou limpo:** o BD-14 é backend puro e o BD-17 é frontend puro, e os dois não dividem
arquivo nenhum.

**A pendência que este fechamento deixou para o João não existe mais.** A `main` promoveu, executou,
revisou e fechou o `bd17-superficie-de-arquivados` em paralelo, entre 2026-08-19 e 2026-08-20
(`6edf1224`). O ponto anotado duas vezes acima — "a promoção do BD-17 é do João" — está resolvido por
fato consumado, não por decisão nova. **Dois `active_work_item` viveram ao mesmo tempo, em linhas
diferentes**, pelo mesmo padrão já registrado no fechamento do `arquivados-roots-restantes`: o
invariante de um só vale dentro de cada branch, não entre elas.

**Quem é o último item fechado se decide por relógio de commit, não por lado do merge:** o BD-17
fechou às **14:39** (`6edf1224`) e o BD-14 às **16:04** (`2e8c8887`). Por isso
`last_completed_work_item` fica em `bd14-contrato-de-entrada` e `state_basis_commit` em `c61e2f4` —
o commit que comprova a entrega, nem o do fechamento nem o do merge.

**Doc — o que ficou de cada lado:**

- **`state.md`:** a janela de cinco fechamentos intercalou os dois lados na ordem real
  (`bd14-contrato-de-entrada` → `bd17-superficie-de-arquivados` → `arquivados-roots-restantes` →
  `identity-ativacao-acesso-redator` → `arquivados-e-restauracao`). Saiu da janela, para o git e para
  a linha de entrega no `progress-archive.md`: `bd13-listagens-e-abas`.
- **`progress.md`:** as duas linhas novas entraram em ordem de fechamento — BD-17 antes do BD-14 — e
  a mais antiga da tabela (Dashboard B1, 2026-08-16) desceu para o `progress-archive.md`, que mantém
  a janela em dez. Os dois lados já tinham arquivado a MESMA linha por conta própria (Meu Perfil
  backend, 2026-08-15), e o git mesclou isso sem duplicar.
- **`backlog.md` e `pendencias/`:** sem conflito. Cada lado removeu o seu bloco (o BD-14 aqui, o
  BD-17 lá) e a nota de "cada um saiu desta lista" ganhou o BD-14 com os débitos que ele levou (D-12
  e D-13). Nenhuma colisão de ID: a **P-51** é daqui e o maior ID da `main` é o P-50. A **P-50** ficou
  com as medições dos DOIS fechamentos — 866 testes aqui, 828 lá, e o mesmo comando documentado
  morrendo nas duas árvores.

**A P-49 continua órfã de bloco.** O merge não a reagrupa: a ficha segue dizendo `Bloco: BD-14`, e
escolher o novo hospedeiro é decisão do João.

**Suítes depois do merge:** o frontend rodou inteiro — `pnpm lint` 0, `pnpm build` verde,
**81 arquivos / 453 testes** (as 18 provas novas do BD-17 entraram junto). O backend **não foi
medido de novo, e não precisa ser**: os 17 commits da `main` não tocam um arquivo de `backend/`
(`git log 0fe30b13..main -- backend` devolve zero), então a medição do fechamento — **866 passed /
5 skipped**, por diretório, porque a suíte unida esbarra na P-50 — continua sendo a desta árvore.

**Estado: `idle`.** Próxima ação: o João escolher o próximo item do `backlog.md`. Nada foi promovido.

## Penúltimo item fechado — 2026-08-20 (`bd17-superficie-de-arquivados`, BD-17 dos blocos de dívida)

### Seleção — 2026-08-19

**Promoção explícita do João**, do BD-17 recém-registrado: os três débitos (D-51, D-52, D-53) foram
medidos no mesmo dia, no `/revisar-frontend` da superfície inteira de arquivados contra `0c8db94`, e
entraram no backlog pelo commit `82c1d0c4` antes de qualquer plano. **Rota direta a
`ready_for_planning`, sem Context Packet** — a fonte do bloco é o próprio código medido, não Drive
nem Notion, e `context_packet` ficou `null` do começo ao fim.

**Área de trabalho: a worktree `fix-frontend`**, branch `feat/bd17-superficie-de-arquivados` a partir
de `0c8db946`. **Risco projetado BAIXO e confirmado no review:** frontend puro, sem schema, sem
`generated.ts`, sem Sanctum, auditoria, RBAC, dinheiro ou emissão de certificado; `executor: claude`.

### Execução — 2026-08-20: 3 peças novas, 6 roots adotando, 1 sítio corrigido direto

**A ordem interna do backlog foi respeitada: D-53 antes de D-51.** Corrigir a data primeiro obrigaria
a tocar 8 sítios e deixaria o nono root livre para reintroduzi-la; com a coluna compartilhada, o
`formatDate` tem um pouso só.

**As três peças, todas em `shared/`:** `archivableSource()` mais `ArchivableRow<T>`/`ListSource<T>` em
`shared/lib/archivable.ts` (`1bc35876`); `archivedColumns(t)` em `shared/ui` (`86c691a7`); e os dois
aliases de operação em `features/operation/hooks/` (`8d6a2dec`), que existem porque `useTurmas.ts` é
artesanal, não passa pelo `createCrudResource` e devolvia `UseQueryResult` cru — a assimetria que
fazia a `OperationPage` ser a única a derivar `loadError` dentro da prop.

**`archivedColumns` é FUNÇÃO, nunca componente, e isso tem catraca.** O `DataTable` do PrimeReact
resolve coluna lendo o filho **direto** (`Children.toArray`), então um componente — ou um Fragment
envolvendo as duas colunas — achataria as duas numa coluna lixo, sem `field`, **sem estourar build,
lint ou suíte**. O teste prova as duas formas lado a lado, e prova também que o `{archived && ...}`
das tabelas não deixa coluna fantasma no modo ativo.

**Seis roots adotaram em cinco commits** (`de3b362b`, `9dba76c6`, `db506f39`, `9747ad33`, `4cca8f97`,
`60dfd1cc`): as 8 declarações de `XRow` à mão sumiram, as ~84 linhas de coluna duplicada viraram uma
chamada, e o quarteto de ternários dentro das props das 6 páginas virou uma escolha só. O nono sítio
do D-51, `ArchivedQuotesList`, é layout flex e não tabela — foi corrigido direto (`1d61b287`).

**Uma correção medida entrou na spec (§11):** o `tsc` reprovou com **TS2322** e forçou o tipo de
retorno explícito `ReactElement[]` em `archivedColumns` (`ae102f11`). Sem ele a inferência abria a
porta para exatamente a forma que a catraca proíbe.

### DoD — provado na tela, não no diff

**Navegador em `en-US`, interface em `es-CL`:** a coluna "Archivado el" imprime no idioma da
**interface**, que é o defeito inteiro do D-51 (`8/19/2026` do navegador contra `19-08-2026` do resto
da tela). Teste de regressão no molde do precedente `AppFileRow.test.tsx`, medindo contra o `Intl` da
tag fixada — não contra o próprio `formatDate`, que passaria por acaso numa máquina cujo locale
coincidisse com o da interface.

**Dois débitos nasceram da medição, e nenhum é regressão deste bloco.** **D-54** — o `refetch` do
`useLoadState` faz `void query.refetch()` e engole a promise que o `AppErrorState` aguarda (Q-14); é
anterior ao bloco, e é por isso que os aliases novos nasceram **sem** ele, com o `refetch` devolvendo
a promise e um teste guardando a diferença. **D-55** — o `DataTable` não repinta as células `body` na
troca de idioma ao vivo; isolado como limitação de plataforma porque `ÚLTIMO ACCESO` (`formatDateTime`,
fora do escopo) e o `AppTag` de estado congelam igual, enquanto o `ArchivedQuotesList`, mesma
`formatDate` **fora** de DataTable, troca ao vivo. Com recarga a grafia está correta nos três idiomas
— o D-51 está pago.

### Revisão de sprint — 2026-08-20: risco BAIXO, uma lente, 2 achados 🟢, zero violação de lei

**Classificação: BAIXO risco** — uma lente, sem revisão independente do Codex.
**Fronteira do bloco provada:** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve zero arquivo. **Órfãos:** nenhum — os 8 símbolos novos têm consumidor, e `useTurmas`/
`usePendingQuotes` seguem vivos pelas query keys e pelos outros hooks. **Escopo pago, medido:** zero
`toLocaleDateString()` cru em `src/`, zero `archived_at?:` declarado à mão, zero quarteto de ternário.

**Q-1 🟢, corrigido no branch** (`4c9a2580`): `usePendingQuotesPage` morava em `useTurmasPage.ts` e
quebrava o um-hook-por-arquivo dos outros 7 aliases. **Q-2 🟢, registrado como D-56**: a forma
normalizada `{items, loading, error, refetch}` passa a ser montada à mão em **5 sítios**, padrão
reincidente da mesma política que já divergiu em 2026-08-14 — o texto da linha de rule ficou guardado
na ficha, para ser escrito quando o débito for pago (escrevê-lo antes tornaria a rule falsa nos cinco
sítios).

**Dois candidatos foram descartados por serem decisão consciente já registrada** — D-54 e D-55 —, e a
observação de que o `state.md` não tinha narrativa do BD-17 caiu na verificação: **todas** as seções
deste arquivo são de item **fechado**, escritas pelo `/fechar-sprint`, não durante a execução.

### Fechamento — 2026-08-20

**Gate do frontend:** `pnpm build` verde, `pnpm lint` exit 0, `pnpm test` **81 arquivos / 453 testes**
(baseline do bloco: 77 / 435). **Backend intocado e verde assim mesmo: 828 passed / 5 skipped, 3006
asserções** — pelo binário direto com `memory_limit` elevado, porque o comando que o `CLAUDE.md` §6
documenta morre no meio: é a **P-50**, reproduzida aqui com pico de 127,00 MB. **Pint e
`typescript:transform` não se aplicam** — zero arquivo de `backend/`, zero DTO.

**A P-03 apareceu pelo gatilho dela, e não fechou:** o `docker compose up -d` desta árvore não sobe o
`mysql` porque o `lotus-mysql-1` do main tree já ocupa a porta 3307. A suíte não precisa dele (sqlite
`:memory:`), então o `app` subiu com `--no-deps`; o que **não** dá para refazer nesta sessão é a prova
de navegador, que depende da API com dado real. Ela está feita e datada acima, contra `1d61b28`, e o
único arquivo de renderização que mudou desde então foi o tipo de retorno de `archivedColumns`.

**Estado: `idle`.** Próxima ação: o João escolher o próximo item do `backlog.md`. Nada foi promovido.

## Antepenúltimo item fechado — 2026-08-19 (`arquivados-roots-restantes`, Próximos blocos item 1)

### Seleção — 2026-08-18

**Primeiro item de "Próximos blocos" (`backlog.md:101`), promovido explicitamente pelo João** com o
estado em `idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de
sempre — **décima terceira** vez: o argumento `arquivados-roots-restantes` era **slug inventado por
mim no turno anterior**, não slug promovido, e `active_work_item` estava `null`.

**Três decisões dele fecharam o gate:** o slug `arquivados-roots-restantes`; a rota **direta a
`ready_for_planning`, sem Context Packet novo**; e **main tree**, partindo de
`feat/arquivados-e-restauracao@6fd0ad8` e não da `main`.

**O gate pegou um erro meu de escopo, e ele é o registro mais importante desta seleção.** Ao oferecer
as opções eu descrevi o escopo como `Budget`/`Quote`, `Redator`, **`Student`** e `Turma`/`Enrollment`
— montado sobre os 8 roots do Context Packet de 2026-08-18. A linha 101 do backlog diz outra coisa:
**`Budget`, `Quote`, `User`, `Redator`, `Turma` e `Enrollment`**, com `Student` em **"Fora de
escopo"** por não ter `destroy` hoje. Eu **incluí `Student`** e **omiti `User`**. O João escolheu
seguir o backlog, e o escopo do bloco são os **seis roots** da linha 101. A medição do próprio turno
confirmou o motivo do backlog: `students` é `apiResource` com `index/store/show/update` apenas
(`Identity/routes.php:46`), então arquivar aluno seria superfície nova com regra a inventar — não
replicação.

**Por que a branch não nasce da `main`.** `App\Shared\Concerns\ArchivesChildren`,
`LoadsCascadedChildren`, `useArchivedPage`, `ArchiveSwitch` e o `archived` do `createCrudResource`
existem **só** na `feat/arquivados-e-restauracao`, que segue sem merge por decisão do João. Nascer da
`main` significaria reimplementar ou conflitar. A branch `feat/arquivados-roots-restantes` foi criada
de `6fd0ad8` ANTES deste commit, seguindo o precedente do bloco anterior.

**`state_basis_commit` passa de `3d02a46` a `6fd0ad8`, e isso não é divergência.** `3d02a46` era o
baseline escrito quando o bloco anterior entrou em `ready_for_review`; os dois commits seguintes
(`1e07786` correções do review, `3d7e95c` fechamento) e o `6fd0ad8` desta sessão vieram depois. Com
`active_work_item` `null` não havia trabalho ativo cujo baseline pudesse derivar.

**Por que não há Context Packet novo.** O packet
`context-packets/2026-08-18-arquivados-e-restauracao.md` já foi gerado **sobre os 8 aggregate roots**,
não sobre os dois executados, e as fontes externas (Notion H.5.1–H.5.4 + Drive) foram esgotadas nele
— inclusive a ausência medida de documento funcional no Drive. O molde de decisão vive em
`specs/archive/2026-08-18-arquivados-e-restauracao-design.md` e a mecânica em código. Recuperação
externa não se repete sem fonte nova.

**`context_packet` aponta para o packet do bloco anterior, e isso é obedecer o invariante, não
reciclar por preguiça.** O invariante diz que, quando o trabalho depende de contexto externo, o
campo **não pode ser `null` em `ready_for_planning`**. O packet cobre os 8 roots, então é fonte
válida para estes seis; herdá-lo declarado é mais honesto que apagar a dependência escrevendo
`null`.

**Um commit fora de bloco entrou antes desta promoção.** `6fd0ad8` (`fix(cors)`) fecha o lado de
aplicação da **P-45**: `allowed_origins` tratava `FRONTEND_URL` como valor único e o `.env` de dev já
é lista (`5173,5174`). Não é deste bloco nem do anterior — era o WIP do João que atravessou os dois,
declarado na seleção anterior. Com ele, `php artisan test` dá **717 passed / 5 skipped** sem precisar
de `FRONTEND_URL` no comando. Pint também limpou a formatação pré-existente da linha `paths`.

### Medição da abertura — 2026-08-18, sobre `6fd0ad8`, não herdada

Sete medições, feitas antes do brainstorming e registradas para ele.

1. **Gates de arquivamento que já existem, por root.** `Budget` recusa se houver cotação **aprovada**
   (`DeleteBudgetAction:20`, 422 "Recuse-a antes"); `Quote` recusa `status === Approved`
   (`DeleteQuoteAction:19`); `Turma` recusa `status !== EmAndamento`
   (`Turma::assertAcademicallyWritable():143`, RN-15); `Enrollment` recusa pela turma
   (`RemoveEnrollmentAction:11`); `User` recusa o último superadmin ativo (`DeleteStaffUserAction` +
   `SuperadminGuard`) e o controller ainda faz `abort_unless($user->type === 'admin', 404)`
   (`UserController:60`). **`Redator` não tem gate nenhum** — `RedatorController:53-58` chama
   `$redator->delete()` cru, sem Action.
2. **Só dois dos seis roots cascateiam com a marca.** `Client` e `Course` usam `markAndDelete`
   (feitos). `Budget → quotes`, `Redator → documents + user` e `Student → user` cascateiam com
   `delete()` cru, **sem `archived_with_parent`**. `Turma` e `Enrollment` **não têm hook `deleting`
   nenhum**: arquivar turma hoje deixa matrículas, documentos e o pivot ativos.
3. **A coluna existe em 5 tabelas** — `client_addresses`, `client_contacts`, `users`,
   `course_modules`, `course_certificate_templates`. Faltariam ao menos `quotes` e `files`; `users`
   já tem e é reaproveitada por `Redator` e `Student`. **O bloco toca schema**, então o planejamento
   lê `docs/adrs.md` e `docs/der-fisico.md`.
4. **O gate de Operação torna a lista de Arquivados estruturalmente pequena.** `Concluida` é estado
   **terminal** (enum, D5) e `assertAcademicallyWritable` exige `EmAndamento`, então turma concluída
   e suas matrículas **nunca** chegam a Arquivados. Coerente com o peso legal; confirmar no
   brainstorming se é o comportamento desejado antes de construir a tela.
5. **`Certificate` é o piso legal e NÃO é soft-deletable.** `Certificate extends Model` sem
   `SoftDeletes`, com `enrollment()`, `course()` e `redator()` os três `belongsTo(...)->withTrashed()`.
   O certificado sobrevive ao arquivamento de tudo que o originou e lê os pais arquivados. Isso
   **valida** o modelo e impõe que arquivar `Redator` ou `Course` não quebre essa leitura.
6. **Redator arquivado some da turma em silêncio.** `turma_redator` é pivot cru (`id`, `turma_id`,
   `redator_id`, `timestamps`) — sem `deleted_at`. A FK é `restrictOnDelete` ("redator com turma não é
   apagado", lição #15), o que barra **hard** delete, não soft. `Turma::redatores()` é
   `belongsToMany` **sem `withTrashed`** (`Turma.php:82`), então a linha do pivot fica viva e a turma
   simplesmente para de listá-lo. Três saídas possíveis: gate, cascata do pivot, ou `withTrashed` na
   relação.
7. **Os dois restores automáticos seguem sem decisão.** `StudentResolver:71-79` restaura `User` e
   `Student` ao reencontrar o RUT na importação; `EnrollStudentAction:38` restaura a matrícula ao
   re-matricular. Com `*.restore` virando permissão por agregado, existem dois caminhos que
   restauram **sem permissão e sem intenção do usuário**. Pendência aberta desde o Context Packet.

**Débito com gatilho vencido, entra por construção:** `budget.confirmDeleteBody` e
`quote.confirmDeleteBody` dizem *"Esta acción no se puede deshacer."* — deixa de ser verdade no
instante em que `Budget`/`Quote` ganharem restore. Ficou registrado como gatilho no bloco anterior.

**Débito ligado, não vencido:** a **D-37** (backfill de `archived_with_parent`, publicada como `D-34` antes do merge da `main`) tem gatilho no
primeiro deploy, não neste bloco. Cada tabela nova da medição 3 amplia o alcance dela — registrar,
não resolver.

**Risco de review projetado: ALTO.** O bloco **toca schema** (colunas novas), **toca RBAC**
(permissões `*.restore` por agregado), **toca `generated.ts`** e **toca dado com peso legal**
(`Turma`, `Enrollment` e os documentos do `Redator`). A classificação final é do `/revisar-sprint`,
não desta promoção.

**Estado: `ready_for_planning`.** Próxima ação: brainstorming das decisões abertas, depois plano.

### Brainstorming e spec — 2026-08-18: sete decisões, e a medição achou um 500 alcançável

**O bloco não era o que o backlog previa, e a medição é que mostrou.** A linha 101 diz *"replicar é
ligar os hooks, a Action, o endpoint e a tela, não reescrever a semântica"*. Isso descreve `Budget`,
`User` e `Redator` — e é falso para os outros três. Os seis roots se separam em **três classes**:
replicação limpa (lista de topo + `createCrudResource`: `Budget`, `User`, `Redator`), lista de topo
fora da fábrica (`Turma`, com `useTurmas` artesanal) e **sem lista de topo** (`Quote` e `Enrollment`,
que vivem dentro do detalhe do pai).

**O achado que justifica o bloco inteiro: restaurar uma turma pode dar 500.** `turmas.active_quote_id`
é coluna gerada STORED `CASE WHEN deleted_at IS NULL THEN quote_id END` com `UNIQUE`, e
`Quote::turma()` é `hasOne` **sem `withTrashed`**, então `CreateTurmaAction:25` deixa criar turma
nova sobre a cotação de uma arquivada — por desenho, dito em texto no comentário da migration.
Restaurar a primeira estoura `SQLSTATE[23000]`. É o **primeiro conflito de unicidade alcançável** do
tema: a D4 do molde ("conflito não é alcançável") vale para `Client`, `Course` e também `Quote` —
`CreateQuoteAction:22` deriva `seq_in_budget` com `withTrashed()`, medido —, e é falsa só para
`Turma`.

**O segundo achado tem peso legal e é silencioso.** `turma_redator` não tem `deleted_at` e
`Turma::redatores()` é `belongsToMany` sem `withTrashed` (`Turma.php:82`). Arquivar um redator deixa
a linha do pivot viva e o faz **desaparecer** de três sítios — a listagem
(`TurmaQueryBuilder::LISTING:26`), o painel de emissão (`EmissionPanelQuery:94`) e
`CertificateEligibility:118`, que passa a **recusar a emissão de certificado** de turma concluída que
ele ministrou. Nada no código avisa.

**As sete decisões do João:**

1. **D1 — gate de conflito na `RestoreTurmaAction` → 422.** Aceita escrever a primeira
   `ValidationException` nova desde a **D-07** e reabri-la, porque a alternativa é 500 em operação de
   usuário sobre dado com peso legal.
2. **D2 — `Turma` ganha a cascata que nunca teve** (`enrollments` + `files`). Pivot fora.
3. **D3 — `Redator` ganha gate** (turma em andamento → 422) **e `redatores()` passa a `withTrashed`**.
   Os dois são necessários: o gate cobre turma em andamento, o `withTrashed` cobre a concluída, que é
   onde a emissão acontece.
4. **D4 — os dois restores automáticos ficam automáticos**, como exceção declarada com teste. A
   permissão guarda a ação Restaurar da tela, não todo caminho que revive uma linha.
5. **D5 — `Quote` e `Enrollment` têm Arquivados dentro do detalhe do pai**, com endpoints escopados.
   Os dois têm `DELETE` próprio hoje, então sem superfície de restauração o registro ficaria
   inalcançável para sempre.
6. **D6 — um bloco, três fases por módulo** (Commercial → Identity → Operation), um DoD no fim.
7. **D7 — o RBAC espelha o guard do arquivar: cinco permissões novas, não seis.** `User` staff **não
   ganha permissão nova** — seu `destroy` é guardado por `identity.access.manage`, que é
   `SEGREGATED`, e um `identity.user.restore` normal deixaria restaurar mais frouxo que arquivar.
   `identity.user.restore` cobre `Redator`, porque o módulo já usa `identity.user.*` para os três
   tipos de ator.

**Quatro decisões derivadas, tomadas por mim e declaradas na spec:** três colunas novas (`quotes`,
`files`, `enrollments`; `users` reaproveitada); as cascatas passam a marcar e **três Actions ganham
transação que não tinham** (`DeleteQuoteAction`, `DeleteTurmaAction`, e a `ArchiveRedatorAction` que
nasce) porque enumera-e-apaga sem transação é check-then-act; a lista de arquivados de `User` filtra
`type === 'admin'` espelhando o `abort_unless` do `destroy`, senão os usuários de cliente, redator e
aluno arquivados pelas cascatas vazam na tela de staff; e a **dívida de copy do molde é paga** —
`budget.confirmDeleteBody` e `quote.confirmDeleteBody` param de dizer "no se puede deshacer", cujo
gatilho era exatamente este bloco.

**A auto-revisão da spec achou três defeitos e os corrigiu inline.** Um glob (`useBudgetQuotes*`) no
lugar de path exato; a sigla `D10` colidindo entre esta spec e o molde; e uma **lacuna real** — o
binding do restore aninhado. `->scopeBindings()` resolve `{enrollment}` por `$turma->enrollments()`,
que é escopada por `deleted_at IS NULL`, então matrícula arquivada daria **404 antes de chegar à
Action**. A spec passou a exigir `onlyTrashed()` explícito no binding.

**O frontend não migra nada, e isso foi medido:** `useArchivedPage` aceita `ArchivableResource`
**estrutural** (`useArchivedList` + `useRestore`), não a fábrica. `Turma` satisfaz o contrato à mão
no `useTurmas.ts` artesanal, e os aninhados fecham o id do pai no próprio hook.

**Risco reavaliado: segue ALTO.** Schema (3 colunas), RBAC (5 permissões), `generated.ts` e dado com
peso legal — agora com um item a mais que a promoção não previa: o bloco **toca o caminho de emissão
de certificado**.

**Estado: `planning`.** Próxima ação: escrever o plano.

### Plano — 2026-08-18: 15 tasks, executor Claude, e a escrita achou oito coisas que a spec não podia saber

**`docs/superpowers/plans/2026-08-18-arquivados-roots-restantes.md`**, 15 tasks em três fases
(Commercial 1–6, Identity 7–10, Operation 11–14, fechamento 15). Cada task tem paths exatos, o código
inteiro de cada passo, o comando de verificação com a saída esperada e o commit — nada de "similar à
Task N".

**Escrever o plano contra o código exigiu oito decisões derivadas (P1–P8), todas declaradas no
próprio plano.** As três que mudam trabalho:

- **P7 — três telas expõem a rota de arquivar sem ter botão nenhum.** `DELETE /api/redatores/{redator}`,
  `DELETE /api/users/{user}` e `DELETE /api/turmas/{turma}` existem no backend, mas `RedatoresTable`,
  `Admin/UsersTable` e `TurmasTable` **não têm** ação de arquivar, e `api/useTurmas.ts` não tem
  mutação de DELETE. Uma visão de Arquivados sozinha nasceria impossível de exercitar pela interface —
  o DoD da lei §8 não teria como ser cumprido. As Tasks 10 e 14 trazem **as duas metades**, no molde
  exato do `ClientRowActions`. **É escopo que a spec não pediu**; se o João preferir o escopo estrito,
  as duas tasks perdem o botão de arquivar e aquelas fases passam a ser provadas por `curl`.
- **P4 — nascem dois QueryBuilders.** `Budget` monta `with([...])` solto no controller e
  `Identity/QueryBuilders/` está **vazio**. A lição Q-8 (a lista de Arquivados mostra o registro como
  ele estava no instante do arquivamento) exige `asOfArchiving`, que é método de trait e mora em
  builder. `BudgetQueryBuilder` e `RedatorQueryBuilder` nascem; `QuoteQueryBuilder` e
  `TurmaQueryBuilder` ganham `withArchivedListingData()`; `EnrollmentQueryBuilder` não ganha nada
  (matrícula é folha).
- **P6 — a turma arquivada mostraria `0 alumnos`.** `TurmaData::fromModel` lê
  `enrolled_count: $turma->enrollments_count` **sem fallback**, e `withCount('enrollments')` conta só
  as ativas — depois da cascata D2, toda turma arquivada apareceria vazia. O `withArchivedListingData`
  reescreve a contagem com o mesmo predicado do trait. É o Q-8 aplicado a um `withCount`.

As outras cinco: **P1** (o path `useBudgetQuotes.ts` da spec §4 não existe — o arquivo é
`useQuotes.ts`), **P2** (as duas mensagens novas saem em **es-CL**, por precedente de
`Turma::assertAcademicallyWritable()`, e são duas linhas se o João decidir a D-07 no outro sentido),
**P3** (`RestoreEnrollmentAction` aplica a RN-15, simétrica com `RemoveEnrollmentAction:12`), **P5**
(`Redator::turmas()` nasce, inversa de `Turma::redatores()`, para o gate D3) e **P8** (`lockRow` entra
em `Redator` e `Turma`, onde a cascata nasce inteira neste bloco, e **não** entra em `Budget`/`Quote`,
onde o caminho de arquivar já existia com transação e sem lock — acrescentar mutex só no restore
criaria assimetria pior que a que resolve).

**Nenhuma chave de locale nova.** O bloco `archive.*` dos três arquivos cobre confirmar, toasts,
colunas e ações. A única mudança de copy é a **D11**: os dois `confirmDeleteBody` de `budget` e
`quote`, que diziam *"Esta acción no se puede deshacer."* e deixam de ser verdade na Task 3.

**`generated.ts` tem commit próprio, no fim.** As Tasks 5, 10 e 14 rodam `typescript:transform` para o
`tsc` enxergar os DTOs novos, mas não o commitam: três commits deixariam o arquivo em três estados
intermediários e o manifesto do transformer fora de sincronia em dois deles. Task 15, um commit, seis
tipos.

**Handoff: `executor: claude`, risco projetado ALTO.** O bloco toca quatro leis do §5 (tipos gerados,
RBAC, fronteira de features, DoD provado) e tem três pontos que exigem julgamento fora do plano: a
Task 7 muda `Turma::redatores()`, lida por Operation e Certification, e manda **ler a asserção** de
qualquer teste que vire vermelho; a P7 é escopo declarado que o João pode cortar; e a P2 reabre a
D-07.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco arquivados-roots-restantes`, por
instrução posterior do João. Ordem obrigatória: a Task 1 (colunas + permissões) precede tudo, e dentro
de cada fase o backend precede o frontend.

### Execução — 2026-08-19

Técnica `subagent-driven-development` a partir da Task 2 — a restrição de AgentTool caiu no meio do
bloco e o João pediu a troca; a Task 1 saiu inline, sob `executing-plans`. Main tree pela P-03.
Ledger task a task em `.superpowers/sdd/progress.md`, com implementador e revisor próprios por task.

**A Task 1 achou um gap do plano, e ele é de guardrail.** `PermissionI18nParityTest` exige paridade
exata entre `PermissionCatalog::descriptions()` e as chaves `perm.*` das três locales — permissão
nova sem tradução reprova a suíte. O plano registrou "nenhuma chave de locale nova" pensando no bloco
`archive.*`; `perm.*` é outro namespace e as cinco permissões novas o obrigam. As cinco chaves
entraram no mesmo commit da Task 1, ao lado de cada `*_delete` correspondente. Sem isso a Task 15
descobriria o vermelho no fim, com cinco fases de distância da causa.


### DoD end-to-end — 2026-08-19 (Task 15): as três fases encadeadas, provadas no navegador

Chromium contra a API real e a MySQL de desenvolvimento. O frontend do main tree subiu na **5174** —
a 5173 é o `pnpm dev` do worktree `fix-frontend` do João, e provar a tela nela teria provado o
código de outro branch. O `.env` já previa a porta.

**Fase 1 — Comercial.** O primeiro alvo (`Scap 1`) recusou com **422** e uma frase em PORTUGUÊS:
*"Orçamento com cotação aprovada não pode ser excluído. Recuse-a antes."* É gate pré-existente e
correto (`DeleteBudgetAction:21`), mas a frase está hard-coded na Action e fora do idioma da tela —
achado registrado abaixo. Refeito em `Scap 8`, com cotação e anexo criados pelo próprio app:
arquivar levou cotação e anexo com `archived_with_parent = true`; Arquivados mostrou **`Quotes = 1`**
com a cotação já soft-deletada (a contagem as-of-archiving); restaurar devolveu os três totais
(**42 / 0 / 0 UF**), a cotação e o `anexo-dod.pdf`, com a marca limpa.

**Fase 2 — Identity, e o caso com peso legal (D3).** Nenhum redator do banco tinha só turma
concluída, então Ana Reyes saiu da turma 6 (em andamento, que ficou com Juan Morales) — ação do
próprio app, desfeita no fim. Com só a turma 3 (concluída), arquivá-la passou o gate; a cascata
levou `user#4` e o REUF. **Em `/certificados`, o diálogo de emissão listou `Redator: Ana Reyes` —
arquivada — e a emissão respondeu `201`**, gerando `LOT-2026-1005` (`redator_id = 3`, status
`emitido`, com UUID de validação). É o `Turma::redatores()->withTrashed()` da Task 7 provado onde
importa: sem ele o certificado não sairia. Restaurar devolveu redator, usuário e REUF com a marca
limpa, e Ana voltou à turma 6.

**Fase 3 — Operação.** Turma 2 (`Scap 4 - Cot 1`, 8 alunos, 3 documentos) arquivada pelo botão da
linha (P7): cascata de 8 matrículas e 3 documentos, todas com marca. Arquivados mostrou
**`Students = 8`** com as oito já soft-deletadas. Restore devolveu **200 — não 201** — e trouxe as
onze peças com marca zerada; o detalhe mostrou os 8 alunos e o switch local da D5. Arquivar e
restaurar UMA matrícula fechou o ciclo: a lista de arquivadas veio escopada pela turma, com data e
autor, e o restore (`POST /api/turmas/2/alunos/13/restore` → **200**) invalidou as duas listas.

**D10 na tela.** Com `user#5` (`type = redator`) arquivado, `/administracion` → Arquivados mostrou
**"No archived records"**. Usuário de redator não vaza para a lista de staff.

**O gate D1 na MySQL real.** A suíte roda em sqlite, então a premissa de banco foi conferida no
motor de verdade: `turmas.active_quote_id` existe como coluna gerada
`(case when (deleted_at is null) then quote_id end)` com o índice `turmas_active_quote_id_unique`
(`Non_unique = 0`). É o que torna o gate da `RestoreTurmaAction` um 422 em vez de um 500.

**O que ficou no banco de desenvolvimento.** Uma cotação (`Scap 8 - Cot 1`, 42 UF, pendente) e um
anexo em `Scap 8`, e o certificado `LOT-2026-1005` — artefatos que o próprio roteiro do DoD manda
criar. O anexo de teste que subiu em `Scap 1` foi removido. Todo o resto voltou ao estado anterior:
Ana Reyes na turma 6, Carlos Fuentes ativo, turma 2 e suas onze peças vivas.

### Achados fora do escopo do bloco, para a triagem do review

- **`DeleteBudgetAction:21` responde em português numa interface es-CL**, com a frase hard-coded na
  Action em vez de locale. Pré-existente; é a mesma D-07 que a spec deste bloco reabriu para as duas
  frases novas (que saíram em es-CL).
- **Requisição não autenticada sem `Accept: application/json` responde 500** (`Route [login] not
  defined`) em vez de 401. No `laravel.log` desde 2026-08-16, não é regressão deste branch.
- **Aviso do React `Each child in a list should have a unique "key" prop` no `TableBody`** do painel
  de emissão de certificados. Fora dos arquivos deste bloco.

### Encerramento da execução — 2026-08-19

Quinze tasks provadas, em **28 commits** sobre `6fd0ad8`. Backend **795 passed / 5 skipped**;
frontend `lint`, `build` e **391 testes** limpos. `backend/config/cors.php` não foi tocado por
nenhum commit do bloco — o único commit que o altera é `6fd0ad8`, do João, que é a base.

Os tipos gerados entraram num commit só, no fim (`fdc043e`): 30 inserções, zero remoções, com o
manifesto junto.

Dois desvios do plano, ambos registrados no ledger com a evidência:

1. **O Step 6 da Task 14, ao pé da letra, reprova o `pnpm lint`.** As colunas do rastreio mais a de
   ações levaram `TurmasTable.tsx` a 185 linhas contra a régua de 150 (catraca do D8 do B2). O
   implementador parou em vez de partir o arquivo sozinho; parti eu, em `c2e6c37` — cinco corpos de
   célula para `TurmaCells.tsx`, tabela em 143 linhas, comportamento intacto.
2. **O plano afirmou duas vezes que o `lockRow` fecha a janela contra quem escreve filho, e o código
   não faz isso** — no redator (Task 7) e na turma (Task 11). Os comentários dizem o que o código
   faz, e a P-47 passou a cobrir os dois roots. **O plano não é fonte sobre o comportamento do
   código.**


### Review — 2026-08-19: risco ALTO, duas lentes, seis achados e zero violação de lei

**Classificação ALTO e a segunda lente foi acionada.** Schema (3 colunas), RBAC (5 permissões),
`generated.ts` e o caminho de emissão de certificado — quatro dos gatilhos da skill num bloco só.
Codex rodou read-only sobre `6fd0ad8..HEAD` contra plano, spec e leis §5; os seis achados dele foram
verificados por mim no código antes de qualquer um entrar no relatório.

**Órfãos: zero**, nos dois lados. **Leis §5: nenhuma violação** — sem Repository, sem regra em
controller, cascata instância a instância, `generated.ts` regenerado com manifesto no mesmo commit,
`ValidationException` nas duas frases novas, zero `primereact` direto e zero import cruzado em
`features/`, financeiro não gateia nada. Suítes conferidas na hora: backend **795 passed / 5
skipped**, frontend **391 testes**.

**Seis achados, nenhum 🔴:**

1. **Q-1 🟡 P — `RestoreQuoteAction:34-47` restaura cotação sem exigir orçamento ativo.** A rota é
   plana e a Action não olha o pai, então cotação de orçamento arquivado volta sozinha: some da tela
   (o binding do pai dá 404) mas segue aprovável por API, e cotação aprovada origina turma. É o
   raciocínio da própria **D10** — aplicado a `User` e não a `Quote`.
2. **Q-2 🟡 P — `QuotesList.tsx:44-59`.** `nameLost` e o `InlineLoadState` com Reintentar existem só
   no ramo ativo; o ramo `archived` volta a pintar `—` em silêncio quando o GET de cursos falha,
   justamente na tela que existe para reconhecer a cotação antes de restaurar. É o defeito do BD-6
   reentrando pela porta nova.
3. **Q-3 🟡 M — o kit de arquivados está copiado por root em três camadas:** 6 `*RowActions.tsx` (397
   linhas), 6 hooks `use*Archived`, e o par `toArchive` + `ConfirmDialog` em cinco Pages.
   **Reincidente (2ª sprint)** — proposta de regra para `.claude/rules/frontend-fsliced.md`
   apresentada ao João junto do relatório.
4. **Q-4 🟢 P — o teste 9 da spec §5 não foi escrito, e o código faz o contrário do que ele
   prometia:** `useQuotes.ts:21` invalida `budgetsApi.keys.all`, não a chave do pai.
5. **Q-5 🟢 P — `RestoreTurmaAction:40-55` é check-then-act:** trava a turma que volta e pergunta
   sobre a cotação, que ninguém trava. Mesma classe da **P-47**, ator diferente (criador de irmã, não
   escritor de filho) — a ficha atual não alcança.
6. **Q-6 🟢 — o gate D3 não vale na volta.** Arquivar turma, arquivar redator, restaurar turma
   devolve turma em andamento com redator arquivado. Fecha com gate no restore ou com declaração na
   spec, como a exceção da D4.

**Três achados do Codex foram descartados, com razão registrada:** a audit `restored` duplicada sob
concorrência é simetria deliberada e comentada (decisão consciente não é achado); o `—` do cliente em
`ArchivedBudgetData` é pré-existente e aparece igual na visão ativa, com o erro já escalando; e o
redator no restore de turma entrou rebaixado a 🟢 porque a emissão segue íntegra pelas três peças da
D3. **Zero divergência de julgamento entre as duas lentes.**

**Estado: `blocked`, `resume_state: reviewing`.** Próxima ação: o João aprova o que entra. Somente
achado aprovado vira código.


### Correções do review — 2026-08-19: os seis achados aprovados, em seis commits

O João aprovou **Q-1 a Q-6**. Nenhum foi deferido para o backlog.

**Q-1 — o restore da cotação passou a exigir orçamento ativo.** `RestoreQuoteAction` lê
`$quote->budget->trashed()` e recusa com **422** em es-CL. O teste que provava a limpeza da marca
virou dois: o 422 do gate e o caminho que ele obriga a usar (restaurar o pai devolve a cotação com
`archived_with_parent` em `false`) — sob o gate, cotação marcada implica orçamento arquivado, então
o antigo cenário deixou de ser alcançável.

**Q-5 e Q-6 saíram no mesmo commit, porque tocam a mesma Action.** `Quote::lockRow()` nasceu e os
DOIS caminhos que decidem sobre a cotação a travam: `CreateTurmaAction` — que também moveu as duas
checagens para dentro da transação — e `RestoreTurmaAction`. É o **primeiro eixo com tomador dos dois
lados** desde que a P-47 foi aberta. O segundo gate da turma recusa restaurar turma **em andamento**
com redator arquivado; turma concluída fica de fora, porque é nela que o certificado é emitido e a
emissão já lê redator arquivado pelo `withTrashed` da D3.

**Q-2 — o aviso de nome perdido passou a valer nos dois modos** do `QuotesList`, com o cálculo sobre
a lista VISÍVEL e o `InlineLoadState` extraído para um nó reaproveitado — para não haver um terceiro
sítio onde esquecer.

**Q-4 — o critério 9 da spec §5 existe e o código passou a cumpri-lo.** `useRestoreQuote` recebe o
`budgetId` e invalida o detalhe do pai (que alcança a lista de arquivadas por prefixo) mais a lista
de orçamentos, cujos totais mudam. As outras mutações seguem em `keys.all`: nascem dentro do detalhe
do pai, onde não há outro orçamento montado. O teste vive em `quoteKeys.invalidatedByRestore` e
reprova contra o código antigo.

**Q-3 — o kit de arquivados virou um só, e a regra foi escrita.** Nascem `useArchiveToasts` (interno,
fora do barrel), `useArchiveAction`, `ArchiveRowActions` e `ArchiveConfirmDialog`; `useArchivedPage`
absorveu os toasts do restore e continua propagando os callbacks de quem chama. Os oito hooks de
página caíram de **370 para 162 linhas**, os seis `*RowActions` viraram adaptadores que só chamam
`can()` e passam **booleanos** — `shared/ui` não importa `shared/hooks` —, e os cinco blocos de
`ConfirmDialog` viraram cinco chamadas de cinco linhas. Saldo do commit: **603 linhas a menos, 403 a
mais**. O padrão reincidente virou o item **"Kit de arquivados"** em `.claude/rules/frontend-fsliced.md`.

**Verificação depois das correções:** backend **797 passed / 5 skipped** (era 795: +3 testes novos,
−1 que deixou de ser alcançável); frontend **394 testes em 67 arquivos**, `lint` e `build` limpos.
Zero `primereact` direto e zero import cruzado em `features/`. Nenhuma peça nova órfã. `generated.ts`
não foi tocado — nenhum DTO mudou.

**O que NÃO foi feito, e é do fechamento:** a prova no navegador dos dois 422 novos (cotação sob
orçamento arquivado; turma com redator arquivado) e das três telas que o Q-2/Q-3 tocaram. As suítes
provam os endpoints e o `pnpm build` prova os tipos; o DoD da lei §8 pede a tela, e esta sessão não
teve navegador. **Entra no `/fechar-sprint` como item obrigatório, não como opcional.**



### Fechamento — 2026-08-19: os dois 422 novos provados no navegador, e a `main` andou por baixo

**O item obrigatório que o review deixou para cá foi cumprido, no Chromium contra a API real e a
MySQL de desenvolvimento.** O frontend do main tree subiu na **5174** de novo — a 5173 é o `pnpm dev`
do worktree do João —, sessão de admin, interface em **es-CL**.

**O 422 do Q-6 é alcançável pela interface, e o roteiro é o da própria ficha.** Turma 2
(`Scap 4 - Cot 1`, em andamento, 8 alunos, redator Pedro Soto) arquivada pelo botão da linha — a
cascata marcou as **8 matrículas** (`archived_with_parent = 1`, medido no banco). Com a turma dele
arquivada, `/personas` deixou arquivar **Pedro Soto** (o gate da D3 só enxerga turma viva, por
desenho). Em `/operacion` → Arquivados, a linha veio como estava no instante do arquivamento —
**8 alunos** (P6) e o redator **arquivado ainda visível** (`withTrashed` da D3) — e **Restaurar
devolveu `POST /api/turmas/2/restore` → 422** com a frase da Action em es-CL: *"Un redactor de esta
clase está archivado: restáuralo antes de restaurar la clase."* Restaurado o redator (200), a mesma
turma voltou (200) com as 8 matrículas e a marca zerada.

**O 422 do Q-1 NÃO é alcançável pela interface, e isso é a razão de o gate existir — foi provado nos
dois passos.** Arquivado o orçamento `Scap 8`, a cascata marcou a cotação (`archived_with_parent =
1`); abrir `/comercial/presupuestos/8` devolveu **`GET /api/budgets/8` → 404** (*"No query results
for model … Budget 8"*), porque o binding do pai é padrão — a lista de arquivadas da cotação vive
dentro do detalhe e some junto. A rota que sobra é a **plana**, e ela foi exercida do contexto da
própria página (mesma sessão, mesmo `Origin`, mesmo CSRF): `POST /api/quotes/11/restore` → **422**,
envelope RFC 7807 com
*"El presupuesto de esta cotización está archivado: restáuralo primero."* Restaurar o orçamento pela
tela (200) devolveu a cotação com a marca limpa.

**Q-2 e Q-4 também foram provados na tela, e não por leitura.** Com `http://localhost:8080/api/courses*`
roteado para 500, a aba **Arquivados** do detalhe passou a mostrar *"No se pudo procesar la respuesta
del servidor."* + **Reintentar** ao lado da cotação com `—` no lugar do nome — o ramo que antes
pintava o traço em silêncio. Removida a rota, **Reintentar** trouxe *"Trabajos en líneas energizadas
220kV"* de volta. E o restore da cotação atualizou o **detalhe do pai sem reload**: `0 UF / 0
cotizaciones` viraram `42 UF / 1` no mesmo instante — a invalidação da chave do pai que o critério 9
da spec pedia.

**Q-3 exercitado nas telas, não só nos testes:** os diálogos de arquivar de turma, redator, cotação e
orçamento saíram todos do `ArchiveConfirmDialog` único, com o toast *"Registro archivado."* do
`useArchiveAction`; as listas de Arquivados de `/operacion`, `/personas`, `/administracion`,
`/cursos` e `/comercial` renderizaram pelo `useArchivedPage`. **Zero erro de console** em toda a
sessão. A **D11** apareceu onde devia: o diálogo da cotação diz *"Podrás restaurarla desde
Archivados."*, e o do orçamento avisa que *"Sus cotizaciones se archivarán junto con él."*

**Zero resíduo.** Tudo que o roteiro arquivou foi restaurado: turma 2 e suas 8 matrículas, Pedro
Soto (`redatores.id = 2`), o orçamento 8 e a cotação 11 com `archived_with_parent = 0`. O banco de
dev terminou o gate como começou.

**Resto do gate.** Backend **797 passed / 5 skipped** (2942 asserções); frontend `pnpm lint` exit 0,
`pnpm build` verde e **67 arquivos / 394 testes**; `pint --test` **`passed`** nos **54 arquivos PHP**
do bloco (nunca sem argumento); `typescript:transform` rodado de novo **sem drift** — `git diff` em
`shared/types/` vazio, então o `generated.ts` do commit `fdc043e` está em sincronia e não foi editado
à mão. Código morto: varredura nos **41 arquivos criados pelo bloco** (fora testes) não achou nenhum
sem consumidor; os `.gitkeep` de `features/*/stores|api|hooks` seguem alheios e não foram tocados.
Leis do §5: zero `primereact` em `features/`, zero import cruzado entre features, zero
`abort(4xx)` novo (o único do repositório é o `abort(404)` público pré-existente), nenhum Repository,
nenhum trigger de banco.

**Pendências.** A **P-45** cumpriu a sprint de rastro e saiu de `encerradas.md`. A **P-47** já tinha
sido reescrita pelas correções do review e cobre os dois eixos. Três fichas mexidas por medição
deste gate: a **P-35** (o gatilho venceu **pela metade** — o bloco tocou `Quote`, `DeleteQuoteAction`
e `RestoreQuoteAction`, mas **não** `CreateQuoteAction`, então a simetria do `$fillable` não foi
absorvida), a **P-44** (as telas de Arquivados deram um **segundo palco** às sondas: `E2E Gate
Redator 1/2` em `/personas`, `GATE T7` em `/cursos`, dois clientes de sonda em `/comercial` — nada
disso é deste bloco e nada foi apagado) e a **P-48**, que nasce aqui: o `title` do envelope RFC 7807
é português nos seis ramos enquanto os `detail` novos são es-CL. **Não é bug vivo** — `problemMessage`
não lê `title` — e traduzir é a decisão de idioma que a D-07 espera.

### A divergência que o fechamento encontrou e NÃO resolve: a `main` fechou outro bloco em paralelo

`origin/main` está **56 commits à frente** da base deste branch (`6fd0ad8`) e contém o
`feat/identity-ativacao-acesso-redator` inteiro, fechado pelo João em **2026-08-19 16:05**
(`967cc618`, merge `f2d74da7`). O `state.md` da `main` diz `workflow_state: idle` com
`last_completed_work_item: identity-ativacao-acesso-redator`; o deste branch dizia
`ready_for_closure` para `arquivados-roots-restantes`. **Dois `active_work_item` viveram ao mesmo
tempo, em linhas diferentes** — o invariante de um só valeu dentro de cada branch, não entre elas.

**O fechamento não escolheu por heurística e não importou nada da `main`:** o estado deste branch,
o plano, a spec, os 36 commits e o `progress.md` concordam entre si sobre a etapa do bloco, então o
gate rodou sobre o que existe aqui. O que fica para a decisão do João, no merge:

1. **`backlog.md` conflita nos dois sentidos.** A `main` ainda traz o item 1 na redação **anterior**
   aos dois blocos de arquivamento ("tornar o lifecycle de archive/restore explícito") — ela nunca
   recebeu nem o `arquivados-e-restauracao` nem este —, e já removeu o item de **ativação de acesso
   do redator**, que neste branch continua listado (renumerado para 3 por este fechamento, porque a
   regra manda remover **somente** o item concluído).
2. **`pendencias/` conflita.** Na `main` a **P-45** segue **aberta**; aqui ela foi encerrada dentro do
   `arquivados-e-restauracao` e o rastro saiu agora. A **P-48** não colide: o maior ID da `main`
   também é o P-47.
3. **`progress.md` tem dez linhas dos dois lados, com conjuntos diferentes** — a `main` tem a linha
   do bloco de identidade e não tem as dos dois blocos de arquivamento.
4. **`state.md` vai conflitar inteiro**, e a janela de cinco fechamentos difere.

Nada disso é regressão deste bloco: nasce de a `feat/arquivados-e-restauracao` seguir sem merge por
decisão do João, com este branch nascendo dela. **Reconciliar é decisão dele, não do fechamento.**

### Merge da `main` — 2026-08-19: a divergência acima foi resolvida por instrução do João

O João mandou trazer a `main` para este branch antes do PR. `git merge origin/main` (base
`b758068b`) trouxe os 56 commits do `identity-ativacao-acesso-redator` e abriu **10 conflitos** —
6 de doc, 3 de componente e 1 de manifesto. Suítes depois do merge: **828 passed / 5 skipped**
(3006 asserções) no backend, **77 arquivos / 435 testes**, `lint` 0 e `build` verde no frontend.

**Código — três conflitos, três composições, nenhum "escolhe um lado":**

1. **`QuotesList.tsx`** — a `main` tinha o `InlineLoadState` inline com `t(courses.errorHint)`; este
   branch tinha o mesmo nó **extraído** em `avisoDeNome`, porque o Q-2 o reusa nos dois modos. Ficou a
   extração daqui **com o `errorHint` de lá**: o `useLoadState` da `main` escolhe a dica por status
   (403/404/genérico), e o nosso literal `'common.loadErrorHint'` era mais burro.
2. **`RedatoresTable.tsx`** — a `main` pôs o botão de **reenviar convite** na célula de ações; este
   branch trocou a célula inteira pelo `RedatorRowActions` do kit. A célula agora tem os dois, e o
   convite **só aparece na lista ativa**: o `User` do redator desce com a cascata, então reenviar
   acesso a um redator arquivado não é ação que exista. Coluna de `8rem` para `10rem`.
3. **`PeoplePage.tsx`** — a `main` desceu o dado para `RedatoresTab`/`StudentsTab` (D-04: com o hook
   acima das abas, o `renderActiveOnly` não alcançava e a tela buscava as duas listas). Ficou a
   estrutura de lá, e **a fiação de arquivados deste branch desceu junto** para a `RedatoresTab` —
   `useRedatoresArchived`, o `toArchive`, as props de modo e o `ArchiveConfirmDialog`. A casca voltou
   a não ter hook de dado nenhum.

**`generated.ts` e o manifesto foram regenerados, não resolvidos à mão** — `typescript:transform`
sobre o backend já mesclado, que é a única fonte válida (lei §5.3). O `RedatorData` da `main` ganhou
`is_active`, e o fixture do `RedatorRowActions.test.tsx` passou a trazê-lo: o `tsc -b` reprovou
primeiro, o teste foi corrigido depois.

**Três colisões de ID, resolvidas pelo precedente da P-35 (quem renumera é quem ainda não publicou
na `main`):**

- **`D-34` → `D-37`** — a `main` publicou um `D-34` (gate RBAC do Dashboard atravessando o seam como
  `null`) e um `D-35`; o backfill de `archived_with_parent` deste branch ficou com o próximo livre, e
  as três citações em `state.md`/`progress.md` acompanharam.
- **`P-47` → `P-49`** — a `main` publicou uma `P-47` (os 7 redatores do seed sem a role `redator`); a
  ficha do `lockRow` meio mutex é a renumerada.
- **`P-48` foi retirada** — era duplicata da **D-36** da `main`, que já registrava o envelope RFC 7807
  não localizado desde o BD-13. A medição do nosso fechamento (o 422 com `title` em PT e `detail` em
  es-CL no MESMO envelope) foi **enxertada na D-36**, que é a ficha dona do assunto.

**Doc — o que ficou de cada lado:**

- **`backlog.md`:** o item de arquivamento sumiu (entregue nos dois blocos desta linha) e o de
  **ativação de acesso do redator** também (entregue na `main`) — sobraram Roles/permissões e
  Hardening. O texto do B2 passou a ser o da `main`: o bloqueio do valor da view do Redator **caiu**.
- **`pendencias/`:** a **P-45** continua **encerrada**, e agora com prova de código em vez de
  histórico — depois do merge o `explode` existe nos dois sítios que leem `FRONTEND_URL`
  (`tests/TestCase.php:25` e `config/cors.php:22`). As duas fichas da `P-44` (sondas nas telas de
  Arquivados, daqui; rastro do gate do identity, de lá) ficaram as duas.
- **`progress.md`:** as quatro entregas novas entraram em ordem de data e as duas mais antigas
  desceram para o `progress-archive.md`, que também perdeu **3 linhas duplicadas** — os dois lados
  tinham arquivado as mesmas entregas por conta própria.
- **`state.md`:** a janela voltou a cinco fechamentos, intercalando os dois lados
  (`arquivados-roots-restantes` → `identity-ativacao-acesso-redator` → `arquivados-e-restauracao` →
  `bd13-listagens-e-abas` → `bd16-perfil-e-kit-compartilhado`). Saíram da janela, para o git e para o
  `progress-archive.md`: `dashboard-frontend-analitico-e-redator`, o trabalho fora de bloco de
  2026-08-17 e `meu-perfil-frontend`.

**O merge achou uma coisa que nenhum dos dois lados tinha:** juntas, as duas suítes passam de
**828 testes** e estouram o `memory_limit` de **128M** do container — o `docker compose exec -T app
php artisan test` do `CLAUDE.md` §6 morre com `Allowed memory size … exhausted` no
`ManualTurmaTest`. Não é defeito de teste (o `--filter` passa em 2,35s) nem do merge: o pico é
**129 MB**, um megabyte além do default. Pelo binário direto com `-d memory_limit=1G` a suíte fecha
verde. Virou a **P-50**, travada em decisão do João, porque `docker/php/uploads.ini` cai em `conf.d`
e vale para o PHP-FPM de produção também.

**Estado: `idle`.** O backlog não promove nada sozinho: o próximo item é escolha explícita do João.

## Quarto item fechado — 2026-08-19 (`identity-ativacao-acesso-redator`, item 4 de "Próximos blocos")

### Seleção — 2026-08-18

**Item 4 de "Próximos blocos" (`backlog.md`), promovido explicitamente pelo João** com o estado em
`idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre: o
argumento era a **linha do backlog** ("Identity · ativação de acesso do redator"), com bullet e
markdown, não slug promovido.

**Três decisões dele fecharam o gate:** o slug `identity-ativacao-acesso-redator`; a rota
**`context_required`**, porque "como o redator recebe a credencial" é decisão de produto e a fonte é
externa ao repositório; e a **worktree `fix-frontend`** como área de trabalho, contra a regra do
comando — a exceção está declarada abaixo, não descoberta na execução.

**A branch nasceu ANTES deste commit**, seguindo o precedente do B1 e do B2:
`feat/identity-ativacao-acesso-redator`, criada de `main@2c7b249`. Este arquivo já é escrito na
branch, não na `main`. Árvore limpa na promoção.

### Duas regras cedem por decisão explícita do João — declaradas na abertura

1. **P-03 · bloco de backend rodando em worktree linkada.** A regra do `/planejar-bloco` é "toque
   backend assume main tree por causa da P-03", e a main tree é `/home/jvbat/projetos/lotus`
   (primeira linha de `git worktree list`), não esta árvore. **Não há compose por worktree:** o
   MySQL e o container `app` são um só, então migration, seed e teste de integração deste bloco
   disputam o mesmo banco com a outra árvore. A mitigação não está desenhada — entra como custo do
   planejamento, e o gatilho da P-03 vence aqui em vez de ser adiado de novo.

2. **A base não contém `arquivados-e-restauracao`.** Medido na promoção: `/home/jvbat/projetos/lotus`
   está em `feat/arquivados-e-restauracao@3d7e95c` ("docs(state): fecha o bloco
   arquivados-e-restauracao"), com `state.md` próprio em `idle` e
   `last_completed_work_item: arquivados-e-restauracao` — e a `main` **não tem esse merge**
   (`main@2c7b249` é o PR #59, do BD-13). Os dois `state.md` concordam na **etapa** (`idle` nos
   dois) e divergem na **história**: o `backlog.md` desta árvore ainda lista "Arquivados e
   restauração de soft-delete" como Próximos blocos #1, e o estado daqui não sabe do fechamento.
   **Conflito de merge é provável e está previsto** — aquele bloco mexe no lifecycle de arquivamento
   dos agregados e este mexe em `User`/Identity. Integrar primeiro foi oferecido e recusado; a
   reconciliação fica para o fechamento.

### Quatro medições da abertura, feitas sobre `2c7b249` e não herdadas do backlog

1. **`password_reset_tokens` existe e ninguém a usa.** A tabela nasce em
   `database/migrations/0001_01_01_000000_create_users_table.php` e `config/auth.php:98` a aponta;
   não há uso do broker `Password::` no `app/` nem rota de reset em
   `app/Domains/Identity/routes.php`, que expõe apenas `/login`, `/logout`, `/me` e `profile/*`.
   **A infra está pronta e o fluxo é o que falta** — o bloco decide se a usa ou não.

2. **Não existe transporte de e-mail.** `MAIL_MAILER=log` no `.env.example` e nenhum
   `app/Notifications`. Se a decisão de produto for convite por e-mail, o custo não é "escrever a
   Notification": é escolher e configurar transporte para dev e para produção, e isso é infra nova
   num bloco de identidade.

3. **Ativar o login não basta: o redator nasce sem role.** `syncRoles` só existe em
   `CreateStaffUserAction.php:45` e `UpdateStaffUserAction.php:62` — `CreateRedatorAction` e
   `UserProvisioner` não atribuem nada, embora `RolePermissionSeeder.php:38` já defina a role
   `redator` com quatro permissões (`operation.turma.view`, `operation.turma.submit_docs`,
   `feedback.feedback.view`, `feedback.feedback.manage`). **Um redator ativado hoje autenticaria sem
   permissão nenhuma**, e a view do dashboard dele abriria assim mesmo, porque o gate é por `type`
   (`DashboardController.php:37`) e não por role. É a metade do defeito que o backlog não registrava.

4. **Nenhuma escrita de `is_active = true` alcança um redator.** `UserProvisioner.php:40` grava
   `false` para todo ator (RN-01), e o campo só é escrito depois em `CreateStaffUserAction:42` e
   `UpdateStaffUserAction:54`, que são staff. `AuthController.php:52` recusa o inativo. Não há
   endpoint, tela ou comando que vire o bit para redator — a promoção confirma o que o fechamento do
   `dashboard-backend-agregacoes` mediu em 2026-08-15.

**Risco de review projetado: ALTO pelo gate binário.** O bloco toca autenticação (lei §5.4, Sanctum
cookie/CSRF), a RN-01 (lei §5.5) e RBAC, e provavelmente cria caminho de credencial. A classificação
final é do `/revisar-sprint`, não desta promoção.

**O que a promoção NÃO decide, e é entrada do brainstorming:** o mecanismo de entrega da credencial
(convite por e-mail × senha definida no cadastro × link de ativação assinado), se `is_active` vira
ação administrativa explícita, e se a role `redator` passa a ser atribuída no cadastro. **O packet
vem antes** — nenhuma dessas respostas se supõe a partir do código.

**Estado: `context_required`.** Próxima ação: Context Packet pelo Codex, read-only, sobre
`feat/identity-ativacao-acesso-redator` a partir de `main@2c7b249`.

### Context Packet — 2026-08-18: a fonte canônica decide o canal e não decide o mecanismo

Gerado pelo Codex (`lotus-context-packet`, sandbox read-only, sobre `03a0b72`) e validado contra o
contrato item a item: marcadores exatos, frontmatter completo com `plan_path`/`spec_path` em
**`null`** (registrados, não omitidos), **8 key facts** — o teto —, fonte indisponível registrada
como tal e `RECOMMENDED_TRANSITION` presente. Salvo em
`context-packets/2026-08-18-identity-ativacao-acesso-redator.md`. **Uma re-invocação não se
justifica:** o contrato não foi violado, o packet respondeu o que pôde e nomeou o que falta.

**O que o Drive decide, e o backlog não sabia:** a credencial de admin e de redator **vai por
e-mail do sistema** (RF-USR-09 em `requisitos-negocio.md`), não há auto-registro, e a role
correspondente ao tipo deve ser associada **automaticamente no cadastro** (RF-ROL-05) — o que
transforma a medição 3 da abertura de "achado de desenho" em **divergência com a fonte canônica**:
o código não atribui role nenhuma ao redator.

**O que nenhuma fonte decide, e é por isso que o estado vai a `blocked`:** o Drive fixa o canal e
não o conteúdo — senha gerada, senha escolhida pelo admin, convite para definir senha ou link
assinado de ativação são todos compatíveis com o que está escrito. `modulo-identidade-acesso.md`
prevê recuperação de senha e verificação de e-mail, **e prever recuperação não autoriza usá-la como
convite**. A EAP do Notion não tem task de ativação, convite, primeiro acesso ou verificação: as
adjacentes são login (2.2.2), administração de staff (2.6.2), CRUD de redator (4.1.4/4.2.2), troca
autenticada da própria senha (8.5.7) e rate limit (9.1.1).

**Figma ficou `unavailable` e isso está registrado, não maquiado:** o runtime do Codex não tem
ferramenta de descoberta de arquivo, e nenhuma fonte consultada forneceu `fileKey`/`nodeId`. Se
existir tela de primeiro acesso no protótipo, ela não foi vista — e virou staleness trigger.

**Duas perguntas bloqueiam o brainstorming**, e as duas são de produto, não de código:

1. **O que o e-mail entrega** — senha gerada, convite para definir senha, link assinado de
   ativação/redefinição, ou mecanismo já acordado com a Lotus.
2. **Em que evento `is_active` passa a `true`** — no cadastro, no envio do convite, na conclusão do
   link, ou por ação administrativa explícita.

Expiração, reenvio, revogação e e-mail não recebido dependem da primeira e ficam registrados como
terceira pergunta, não bloqueante.

**Estado: `blocked`, com `resume_state: context_required`.** Respondidas as duas, o packet é
atualizado (não regerado do zero) e o estado retorna a `ready_for_planning`. **Não implemento, não
escolho por ele, e não trato "recuperação de senha" como convite por conveniência.**

### Bloqueio resolvido — 2026-08-18: as duas decisões de produto saíram do João

O packet voltou `blocked` porque nem Drive nem Notion decidiam o mecanismo. **O João decidiu os
dois pontos, e a decisão é dele — não está escrita no Drive**, então virou fonte `[JOAO-DEC]` no
packet e staleness trigger no sentido contrário: se a Lotus registrar algo que contradiga, o packet
envelhece.

1. **Um mecanismo, dois fluxos: link por e-mail.** O mesmo caminho serve **primeiro acesso**
   (disparado no cadastro do redator) e **recuperação de senha** (self-service). Isso põe em uso a
   `password_reset_tokens` que a medição 1 da abertura achou pronta e órfã, e satisfaz o canal que o
   RF-USR-09 exige sem inventar um segundo padrão de credencial.
2. **`is_active` nasce `true` para o redator, no cadastro, e o admin pode revogar.** Cliente e aluno
   continuam `false` por padrão — a RN-01 fica intacta onde ela vale. A consequência prática é que
   o gate de acesso do redator passa a ser *saber a senha*, não *estar ativo*: `UserProvisioner`
   grava `false` para todo ator hoje (`:40`), então o default deixa de ser único e passa a depender
   do `type`.

**O que a decisão NÃO fecha, e é o que o brainstorming resolve:** expiração/reenvio do link de
primeiro acesso (a política de 60 min do broker foi desenhada para recuperação), por qual superfície
o admin revoga, se o bloco entrega backend e frontend juntos — "esqueci minha senha" e "definir
senha" são telas **públicas** que não existem — e como o DoD prova o e-mail com `MAIL_MAILER=log`.

**Estado: `ready_for_planning`.** Packet atualizado no lugar (`status: ready`), não regerado.

### Brainstorming e spec — 2026-08-18: seis decisões, e uma delas nasceu de medição, não de pergunta

Cinco perguntas fecharam o desenho, e uma sexta decisão entrou **porque a medição a exigiu**: sem
reenvio de convite não há caminho para os redatores já cadastrados, que nasceram `is_active=false`
com senha aleatória — o switch liga a conta e ninguém sabe a senha, e eles não sabem que existem
para pedir recuperação.

**As escolhas:** só redator agora (staff segue com senha digitada, e isso vira débito contra o
RF-USR-09); bloco único ponta a ponta, fugindo do corte por camada do Dashboard e do Meu Perfil,
porque o DoD é "o redator autentica" e isso não se prova sem as telas públicas; dois brokers sobre
`password_reset_tokens` (7 dias para convite, 60 min para recuperação), com link morto caindo na
tela de recuperação em vez de virar chamado; `is_active=true` no cadastro com switch de revogação
no formulário do redator, encerrando todas as sessões; e Mailpit no compose, para o DoD clicar o
link real em vez de ler o `laravel.log`.

**Uma medição nova durante o brainstorming mudou o alcance da pergunta, e foi respondida:** staff
hoje recebe senha digitada pelo admin no formulário (`CreateStaffUserAction.php:41`), enquanto o
RF-USR-09 fala de admin **e** redator. O mecanismo novo tem um segundo consumidor óbvio; o João o
deixou fora, com o custo declarado.

Spec em `specs/2026-08-18-identity-ativacao-acesso-redator-design.md`.

### Plano — 2026-08-18: escrever o plano derrubou o mecanismo da D5

14 tasks, executor **claude**. O critério do `/executar-bloco` não deixa margem: o bloco toca lei do
§5 em três pontos — §5.3 (`generated.ts` regenerado), §5.4 (rotas públicas novas, purga de sessões,
`sendPasswordResetNotification`) e §5.5 (o default de `is_active` deixa de ser único) — e decide
contrato de API em duas tasks. Nada disso é mecânico com paths fechados, então não vai ao Codex.

**A D5 aprovada não sobreviveu à escrita do plano, e a spec foi emendada (§9).** "Dois brokers sobre
a mesma tabela" não funciona: o `expire` é aplicado na validação, pelo broker que valida, então com
uma tabela só o endpoint de reset não distingue token de convite (7 dias) de token de recuperação
(60 min) — e validar pelo broker errado daria 7 dias à recuperação. Pior, `password_reset_tokens`
tem uma linha por e-mail: um "esqueci minha senha" apagaria o convite pendente do mesmo redator.
**Correção:** tabela `invitation_tokens` própria e dois endpoints (`/api/invitation/accept` e
`/api/password/reset`), com a tela pública única decidindo pelo `?flow=`. A decisão de produto do
João fica intacta; muda a mecânica que a sustenta.

**Segunda correção, menor, também medida:** a spec falava em "switch" de acesso, e não existe
`AppSwitch` em `shared/ui` — feature não importa PrimeReact direto (§5.6). O controle copia o molde
já existente do staff (`StaffUserDialog.tsx:118-130`): `FormField` + `AppDropdown` Activo/Inactivo.

Plano em `plans/2026-08-18-identity-ativacao-acesso-redator.md`.

### Execução — 2026-08-19: 14 tasks, e o DoD do gate provado no navegador

As 14 tasks do plano estão implementadas e commitadas, uma por commit, de `50e76cd` a `112b145`
(mais `644e372` e `18adad6`, os dois artefatos do transformer). Ledger com a prova task a task em
`.superpowers/sdd/progress.md`.

**Catracas (Task 14, Step 1):** suíte backend `5 skipped, 704 passed (2586 assertions)`; `pint --test`
verde nos arquivos do bloco; `pnpm lint` limpo, `pnpm build` ok, `pnpm test` `67 files / 401 tests`;
`typescript:transform` seguido de `git diff --exit-code` em `generated.ts` sem saída.

**A P-03 não travou o gate, e a stack do João não foi derrubada.** Override efêmero de portas fora do
repositório subiu a stack deste worktree em nginx **8081**, MySQL **3308** e Mailpit **8025**, com o
Vite do worktree em **5174** — a 5173 é o dev server da main tree. Depois do gate, só
`fix-frontend-app-1` ficou de pé, como a sessão encontrou o ambiente.

**Steps 2–6, no navegador contra a API real:** primeiro acesso ponta a ponta (cadastro → e-mail no
Mailpit com `?flow=invite` e "vence en 7 días" → senha definida → login → Dashboard na view do
redator); revogação (`is_active=0`, `sessions=0`, a aba logada cai para o login no reload e a nova
tentativa é recusada com "This account is not active."); recuperação com resposta idêntica para
e-mail que existe e que não existe, com entrega só no primeiro; reenvio de convite para redator
pré-bloco, com o toast e o primeiro acesso completo. RN-01 medida no fim: `cliente`/`aluno` ativos
= `0`.

**Dois achados do gate, ambos registrados no ledger e nenhum deles defeito do código entregue:**
reenviar convite **não** ativa — para redator pré-bloco o admin precisa marcar Access state = Activo
*e* reenviar (o desenho está certo: conceder acesso é o controle explícito, não efeito colateral do
reenvio); e os 7 redatores do seed seguem **sem a role `redator`**, que só é atribuída no cadastro
novo — não impede login nem Dashboard (a view sai de `user.type`), mas qualquer gate `permission:`
os barraria. É dado de seed, não código do bloco.

**Estado: `ready_for_review`.** Próxima ação: `/revisar-sprint` para `identity-ativacao-acesso-redator`.
O review **não** foi iniciado por este comando.

### Emenda — 2026-08-19: a recuperação de senha volta para dentro da tela de login

Pedido do João com o bloco em `ready_for_review`: *"quero deixar a recuperação de senha na mesma
tela de login mudando apenas os campos (inputs) quando clicado"*. **Não é bloco novo.** A tela
`/recuperar-clave` é entrega deste bloco (`9726eab`, `112b145`), então o pedido muda a forma de uma
superfície já entregue e o estado volta para `planning`, com o review adiado — não iniciado e não
cancelado.

**O que a emenda troca:** `ForgotPasswordPage` deixa de ser página. `/login` e `/recuperar-clave`
viram rotas irmãs do mesmo layout, as duas renderizando `LoginPage`; o modo sai do `pathname` e a
troca é um `<Link>`. O e-mail digitado sobe para um painel comum e sobrevive ao clique — é o ganho
que justifica a mudança, não a estética.

**A premissa foi medida antes de virar decisão.** Em `react-router@7.18.0`, `_renderMatches` monta
cada match dentro de `RenderedRoute` **sem `key`**: duas rotas irmãs com o mesmo `element`
reconciliam em vez de remontar, e o estado do painel sobrevive à troca de URL. Sem isso o desenho
inteiro cairia — o e-mail morreria na navegação, que é exatamente o defeito que a emenda fecha.

**Dois efeitos declarados, não descobertos:** visitante anônimo em `/recuperar-clave` passa a
disparar `GET /api/me` (a rota entra no `SessionBootstrap`), e usuário autenticado que abrir a URL é
redirecionado para `/`, porque herda o `LoginRoute`.

**Ponteiros:** `active_spec` passa a apontar a spec da emenda; `active_plan` volta a `null` até o
plano existir. O par de 2026-08-18 continua válido como spec e plano do bloco — a emenda substitui
só o desenho da superfície `/recuperar-clave`.

**Plano — 2026-08-19:** `plans/2026-08-19-login-recuperacao-inline.md`, 6 tasks. A ordem existe para
que **toda task deixe a árvore compilando**: o `ForgotPasswordPage` vira ponte de 13 linhas na Task 3
e só é apagado na Task 5, quando a rota muda de dono. Task 6 é o gate — catracas, prova de navegador
e fechamento do estado.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco identity-ativacao-acesso-redator`.
O `/revisar-sprint` permanece na fila, para depois da emenda executada.

### Execução da emenda — 2026-08-19: início, técnica `subagent-driven-development`

Abertura da execução do `plans/2026-08-19-login-recuperacao-inline.md` (6 tasks, executor
**claude** — o plano não declara `## Handoff de execução`, então o ciclo é o Superpowers normal).
**Técnica: `subagent-driven-development`, por instrução do João** — implementer por task, review de
task (spec + qualidade) depois de cada uma, review amplo no fim. O ledger local
(`.superpowers/sdd/progress.md`) ganha a seção da emenda; o do bloco de 2026-08-18 segue no mesmo
arquivo, acima.

**Área de trabalho: a mesma worktree `fix-frontend`**, branch `feat/identity-ativacao-acesso-redator`
a partir de `7c4704e`. O gate main tree/worktree não dispara: a emenda é **frontend puro** (spec §2),
nenhum arquivo de `backend/` é tocado, então não há Pint, migration nem `typescript:transform`.

Este commit abre a execução junto com a **Task 1** (`useAuthPanel`), que é a primeira fronteira
durável.

**Estado: `executing`.** Próxima ação: seguir o plano task a task.

### Emenda executada — 2026-08-19: as 6 tasks fechadas e o gate provado no navegador

As 6 tasks do `plans/2026-08-19-login-recuperacao-inline.md` estão commitadas, uma por commit:
`37e4c61` (`useAuthPanel`), `b7c6d98` (`password.forgotSubtitle` nos 3 dicionários), `186f07f`
(`ForgotForm` controlado por props), `c04c27a` (`AuthPanel`), `df8f5e0` (rotas irmãs e morte do
`ForgotPasswordPage`) e este commit (gate). Ledger com a prova task a task e os achados de review em
`.superpowers/sdd/progress.md`.

**Catracas (Task 6, Step 1):** `pnpm lint` exit 0 sem saída, `pnpm build` verde, `pnpm test`
**69 arquivos / 408 testes** — frontend puro, sem Pint, migration ou `typescript:transform`.

**A prova no navegador, contra a API real, com a stack do João intacta.** Override efêmero de portas
fora do repositório (nginx **8081**, MySQL **3308**, MinIO 9002/9003, Mailpit 8025) e Vite do worktree
em **5174**. Medido: em `/login`, e-mail digitado, clique em "Forgot your password?" leva a
`/recuperar-clave` **com o e-mail preservado no campo**, foco no `<h1>` e
`performance.getEntriesByType('navigation')` ainda com **uma** entrada — a premissa da emenda (rotas
irmãs reconciliam, não remontam) confirmada na tela e não só na leitura do `react-router`. O envio
entrega no Mailpit para e-mail existente, devolve **a mesma** mensagem genérica para e-mail que não
existe e **não** entrega — a anti-enumeração sobrevive à mudança de superfície. Voltar (browser back)
devolve o campo de senha; deep link direto em `/recuperar-clave` abre em recuperação **sem roubar o
foco** (`document.activeElement` = `BODY`); link de definição expirado cai em "This link no longer
works" e "Request a new link" aterrissa em `/recuperar-clave`; autenticado, `/recuperar-clave`
redireciona para `/` — os dois efeitos declarados na abertura da emenda, medidos.

**Dois desvios do plano, decididos pelo João durante a execução, não pelo executor.**

1. **`eslint-disable react-hooks/refs` escopado no `useAuthPanel`.** O código do próprio plano reprova
   na régua, e o molde da casa para "ajustar estado no render" (`useEntityForm.ts`) foi **medido e
   quebra a feature**: o setState descarta o primeiro render e `switched` chega `false`, matando o
   movimento de foco. O disable tem precedente (`AppDialog.tsx:24-36`) e comentário com a medição.
2. **O caminho de erro da recuperação entrou na Task 3.** O review de task apontou que
   `ForgotForm`/`useForgotPassword` não davam retorno nenhum de falha; medido em
   `git show b7c6d98:…/ForgotPasswordPage.tsx`, o buraco é **pré-existente** (veio em `9726eab`), não
   regressão da emenda. Consertado agora com o molde do `LoginForm` (`FormErrorBanner` +
   `aria-invalid`/`aria-describedby`) e teste do ramo de falha. **A spec foi emendada** (§5, §6 e a
   nova §6.1): `generalError` e `fieldErrors` são falha de transporte e não desmentem a resposta
   genérica.

**Uma lacuna do plano ficou registrada:** ele afirmava que `FRONTEND_URL` não precisaria mudar para a
prova de navegador, e precisou — `config/cors.php:22` deriva a origem permitida dela, e o Vite do
worktree corre na 5174. `backend/.env` e `frontend/.env.local` foram alterados para o gate e
**restaurados** ao fim; ao término só `fix-frontend-app-1` ficou de pé, como a sessão encontrou o
ambiente.

**Estado: `ready_for_review`.** Próxima ação: `/revisar-sprint` para
`identity-ativacao-acesso-redator`, cobrindo o bloco de 2026-08-18 **e** esta emenda. O review **não**
foi iniciado por este comando.

### Revisão de sprint e correções — 2026-08-19: 6 achados, os 6 aprovados e corrigidos

O `/revisar-sprint` cobriu o bloco de 2026-08-18 **e** a emenda, e devolveu **6 achados**, todos
aprovados pelo João e corrigidos em quatro commits, cada um com regressão provada contra o código
antigo. **O relatório da revisão não virou arquivo próprio** — o rastro dela é o resumo do
`review_findings_approved` no commit `929b1e6` e os quatro commits abaixo:

1. **Q-1 · reenvio de convite não dava acesso, só senha** (`1483fd1`) — a role `redator` só era
   atribuída no `CreateRedatorAction`, então o redator **anterior ao bloco** autenticava com
   `roles: []` e `permissions: []`, e o gate de cada seção é permissão, não `type`. O `syncRoles`
   (idempotente) subiu para o `SendRedatorAccessInvitationAction`, que é a fonte única dos dois
   caminhos.
2. **Q-2 · as rotas públicas de senha enumeravam usuário** (`e54ce42`) — `PasswordBroker::validateReset`
   resolve o usuário **antes** de checar o token, então `INVALID_USER` e `INVALID_TOKEN` com mensagens
   distintas faziam de qualquer token inventado um oráculo de "este e-mail tem conta"; os dois passam
   a subir a **mesma** mensagem.
3. **Q-3 · o convite de senha alcançava cliente e aluno** (`e54ce42`) — `sendResetLink` ganhou
   `'is_active' => true` (vira `where` no `EloquentUserProvider`): pela RN-01 esses atores não
   autenticam, e a rota anônima chegava a mandar "defina sua senha" para contato comercial de cliente.
   No mesmo commit, o `try/catch` + `report()` fecha o outro oráculo, o da falha: com SMTP fora do ar,
   e-mail existente estourava 500 e inexistente devolvia 200.
4. **Q-4 · falha que não nomeia campo ficava muda** (`389ac4f`) — 429, 419 e 500 não trazem `errors`,
   e o `SetPasswordPage` parava de girar sem dizer nada. `useSetPassword` passa a derivar
   `generalError` do `detail`, no mesmo molde do `useForgotPassword`, e a tela mostra o
   `FormErrorBanner`.
5. **Q-5 · recuperar a senha não derrubava as sessões vivas** (`e54ce42`) — `auth:sanctum` não
   reconsulta senha nem `is_active` a cada request, então quem já estava dentro continuava dentro
   depois do reset. O `PurgeOtherSessionsAction` entrou **na mesma transação** da troca de senha.
6. **Q-6 · o TTL dos dois brokers era afirmação de config, não comportamento** (`8a11889`) — o
   `InvitationBrokerTest` passou a envelhecer o token na tabela e medir os quatro cantos: convite de
   6 dias vale, convite vencido é recusado, recuperação de 59 minutos vale, recuperação de 1 hora é
   recusada. Com o `expire` trocado entre os brokers, o teste cai.

Catracas do passe de correção: `pnpm lint` limpo, `pnpm build` verde, `pnpm test` 409/409, backend
**710 passed / 5 skipped**.

### Fechamento — 2026-08-19: o acesso do redator provado ponta a ponta contra a API real

**Item 0 — critério de aceite do bloco.** Stack deste worktree nas portas padrão (nginx 8080, MySQL
3307, Mailpit 8025) — a do main tree estava desligada, então não houve override de portas. Tudo via
`curl` com `Origin: http://localhost:5173` **e** `Accept: application/json`, mais Chromium via
`@playwright/cli` para as duas provas de tela. Medido, nesta ordem:

1. **Reenvio de convite atribui a role e entrega a credencial (Q-1).** `juan.morales@lotus.cl`
   (redator anterior ao bloco) saiu de `roles=[]` para `roles=[redator]` no `POST
   /api/redatores/1/invitation` (204), e o e-mail chegou ao Mailpit com
   `/definir-clave/<token>?email=…&flow=invite` e "Este enlace vence en 7 días".
2. **Primeiro acesso completo.** `POST /api/invitation/accept` (204) definiu a senha; o `POST
   /api/login` seguinte devolveu `type: redator`, `roles: ["redator"]` e as **4** permissões da role
   (`operation.turma.view`, `operation.turma.submit_docs`, `feedback.feedback.view`,
   `feedback.feedback.manage`), e o `GET /api/me` confirmou a sessão.
3. **Anti-enumeração nas duas rotas (Q-2, Q-3).** `POST /api/password/forgot` devolveu **a mesma**
   mensagem genérica (200) para o e-mail que existe, para `no-existe-jamas@lotus.cl` e para o
   **cliente** `contacto@transelec.demo.cl`, com entrega no Mailpit **só** no primeiro. `POST
   /api/password/reset` com token falso devolveu resposta **idêntica byte a byte** (422,
   `errors.token`) para e-mail existente e inexistente.
4. **Recuperar derruba quem está dentro (Q-5).** Com a sessão do Juan viva (`sessions` = 1), o reset
   consumiu o token e devolveu 204; `sessions` foi a **0** e o cookie antigo passou a receber **401**
   no `GET /api/me`, no envelope RFC 7807.
5. **Revogação é controle explícito do admin.** `PUT /api/redatores/1` com `is_active: false` (200)
   levou `sessions` a 0, o cookie vivo a 401 e o login novo a **422 "Esta cuenta no está activa."**
6. **A emenda, no navegador.** Em `/login`, e-mail digitado, clique em "Forgot your password?": a URL
   virou `/recuperar-clave` com o e-mail **no campo**, `performance.getEntriesByType('navigation')`
   ainda com **uma** entrada (irmãs reconciliam, não remontam) e foco no `<h1>`.
7. **O caminho de erro mudo, na tela (Q-4).** Com a quota do `throttle:6,1` gasta por `curl`, o
   submit do `/definir-clave/<token falso>` recebeu **429** e a tela mostrou o alerta
   **"Too Many Attempts."** — antes do `389ac4f` não mostraria nada.
8. **RN-01 medida no fim:** `cliente` ativos = **0**, `aluno` ativos = **0**.

**Catracas:** backend `710 passed / 5 skipped (2601 assertions)`; `pnpm lint` exit 0 sem saída;
`pnpm build` verde; `pnpm test` **69 arquivos / 409 testes**; `pint --test` **passed** nos 29 arquivos
PHP do bloco; `typescript:transform` seguido de `git diff --exit-code` em `generated.ts` **sem saída**
(o arquivo veio do transformer em `644e372`, nunca de edição à mão).

**Leis do CLAUDE.md §5:** nenhuma contrariada. Sem Repository sobre Eloquent (o bloco é Actions);
zero trigger de banco na migration nova; `generated.ts` gerado; auth só por cookie de sessão Sanctum
com CSRF, e os erros subindo pelo handler global (o único `abort(` do domínio Identity está **dentro
de um comentário** que manda nunca usá-lo); RN-01 medida; nenhuma feature importando PrimeReact
direto nem outra feature; financeiro intocado.

**Ambiente devolvido — com um excesso declarado.** A sonda `gate.task14@lotus.cl` (user 58 / redator
8, sem curso, documento ou turma), criada pelo gate da Task 14 **deste** bloco, foi removida
(`users` 58 → 57, `redatores` 8 → 7), junto dos dois `password_reset_tokens` deixados pelos gates.
O Juan voltou ao estado pré-gate: ativo, sem role, com senha aleatória inutilizável. **O excesso:** ao
limpar as sessões do gate, a tabela `sessions` foi apagada inteira (13 linhas), não só as 2 que este
fechamento criou — o efeito é que qualquer sessão de dev anterior precisa logar de novo. Mailpit
esvaziado; os containers deste worktree ficaram parados, como a sessão encontrou a máquina.

**Pendências:** nasce a **P-47** (os 7 redatores do seed não têm a role `redator`; só cadastro novo e
reenvio de convite a atribuem — dado de seed, não código do bloco). **P-03** e **P-45** ganharam
medição nova e seguem abertas: a P-03 porque o compose por worktree continua não existindo — o que
existe é override manual de portas, e o gatilho formal (dois blocos de backend em paralelo) não
venceu, houve um só; a P-45 porque a suíte saiu **verde** só por o `.env` ter voltado a
`FRONTEND_URL` de valor único, com `TestCase.php:18` e `config/cors.php:22` intocados. Nenhuma
pendência fechou; as encerradas seguem vazias. Total: **30 abertas**.

**Estado: `idle`.** O backlog **não** promove nada sozinho: o próximo item é escolha explícita do
João.

## Quinto item fechado — 2026-08-18 (`arquivados-e-restauracao`, Próximos blocos item 1)

### Seleção — 2026-08-18

**Primeiro item de "Próximos blocos" (`backlog.md:101`), promovido explicitamente pelo João** com o
estado em `idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de
sempre — **décima segunda** vez (BD-1, BD-2, BD-7, BD-8, BD-9, BD-5, `login-fora-do-adr16`,
`celula-de-identidade`, `dashboard-backend-agregacoes`, `meu-perfil-backend-self-service`,
`dashboard-frontend-central-controle`, `dashboard-frontend-analitico-e-redator`): o argumento era
**linha do backlog** ("**Arquivados e restauração de soft-delete** adicionando o rastreio dos dados e
objetos soft-deletados e 'restaurados'"), não slug promovido.

**Três decisões dele fecharam o gate:** o slug `arquivados-e-restauracao`; a rota
**`context_required`**, porque o detalhe canônico é Notion H.5.1–H.5.4 e não vive no repositório; e
**main tree** como área de trabalho.

**A área de trabalho mudou durante a própria seleção, e o motivo fica registrado.** A escolha inicial
foi a worktree `fix-frontend`, onde a sessão rodava. A **P-03 proíbe worktree para bloco de backend**
em texto literal — *"o stack monta o main tree e o teste rodaria contra o código errado"* — e este
bloco toca backend. A medição da hora: stack `lotus` up montando `/projetos/lotus/backend`, portas
`8080`, `3307` e `9000-9001` ocupadas por ela; `docker compose` a partir de `fix-frontend` seria
projeto separado e colidiria nas mesmas portas, então provar backend de lá exigiria derrubar o stack
do main tree. Apresentado o conflito, **o João trocou para main tree**. O gatilho formal da P-03
(mais de um `active_work_item` de backend) **não venceu** — não há outro item ativo.

**A branch nasceu ANTES deste commit**, seguindo o precedente: `feat/arquivados-e-restauracao`,
criada de `main@b758068`. Este arquivo já é escrito na branch, não na `main`.

**`state_basis_commit` passa de `0a1918b` a `b758068`, e isso não é divergência.** Com
`active_work_item` `null` não havia trabalho ativo cujo baseline pudesse derivar. `b758068` é o merge
do fechamento do BD-16 na `main`, e `main == origin/main` na hora da promoção, árvore limpa exceto
`backend/config/cors.php`.

**Fonte externa declarada:** o backlog aponta Notion **H.5.1–H.5.4** como detalhe do bloco, com o
objetivo *"tornar o lifecycle de archive/restore explícito e seguro por agregado"*, a ordem
*semântica → Actions → endpoints → UI* e **`forceDelete` e exclusão permanente fora de escopo**. Não
há arquivo de escopo funcional no Drive citado para este bloco; se o packet não achar um, a fonte é
o Notion e a lacuna vira limitação declarada, não suposição.

**Seis medições da abertura, feitas sobre `b758068` e não herdadas:**

1. **15 models usam `SoftDeletes` hoje.** `Shared/Files/File`; `Commercial/{Budget, Client, Quote,
   ClientAddress, ClientContact}`; `Operation/{Enrollment, Turma}`; `Catalog/{Course, CourseModule,
   CourseCertificateTemplate}`; `Identity/{User, Student, Redator, StudentClientLog}`. **A superfície
   candidata do bloco é essa lista**, e decidir *quais* agregados ganham archive/restore é decisão de
   escopo — não se supõe que sejam os 15.
2. **A maioria dos agregados nem tem rota `DELETE`.** As 15 rotas `DELETE` existentes cobrem
   `turmas/{turma}`, `templates/{template}` e sub-recursos (addresses, contacts, photos, files,
   `turmas/{turma}/alunos/{enrollment}`, `turmas/{turma}/redatores/{redator}`,
   `redatores/{redator}/documents/{document}`). **`Client`, `Course`, `Budget`, `Quote`, `User`,
   `Redator` e `Student` não têm `destroy` exposto** — então "arquivar" nesses casos é **superfície
   nova**, não renomeação de rota existente.
3. **`restore()` já existe, mas implícito e sem intenção do usuário.** Só dois sítios:
   `Identity/Services/StudentResolver.php:72,78` (revive `User` e `Student` ao reencontrar o RUT) e
   `Operation/Actions/EnrollStudentAction.php:38` (revive matrícula soft-deletada ao re-matricular).
   **Tornar o restore explícito precisa decidir o que acontece com esses dois caminhos** — se
   continuam automáticos, se passam a exigir ação, ou se ficam como estão.
4. **`withTrashed()` é onipresente na leitura, e por desenho.** 20+ sítios, com comentário de motivo
   nos principais: relações de histórico (`Enrollment::turma()`, `Quote::budget()`), unicidade
   (`UserProvisioner`, `CreateQuoteAction`) e projeção do Dashboard (`AnalyticsQuery`, 6 sítios).
   **Isso é a favor do bloco:** o dado arquivado já é legível; o que falta é o lifecycle explícito.
5. **A auditoria já cobre o evento — `config/audit.php:59-63` audita `deleted` e `restored`.** Então
   o rastreio pedido no argumento do João **não parte do zero**: a trilha existe em `audits`; o que
   não existe é *superfície de consulta* dela. Se "rastreio" significa expor a trilha na UI, isso é
   decisão de escopo para o brainstorming, não implementação nova de auditoria — e a **lei 2** segue
   valendo (auditoria só na aplicação, nunca em trigger de banco).
6. **Zero UI de arquivado ou restauração no frontend.** `grep -riE "arquivad|restaur"` em
   `frontend/src` retorna **nenhuma ocorrência**; os únicos hits de `inativ` são
   `shared/api/axios.ts`, `useLoginForm.ts` e um teste de filtro. **Toda a camada de UI do bloco é
   superfície nova.**

**Autorização é lacuna medida, não detalhe de implementação.** Os cinco diretórios
`app/Domains/*/Policies/` **estão vazios** — não há Policy nenhuma no projeto, e nenhuma permissão
`*.delete` / `*.restore` no `RolePermissionSeeder`. "Seguro por agregado", que é o objetivo do bloco
no backlog, **exige decidir o mecanismo de autorização** — permissão do spatie por agregado, Policy
nova, ou ambos. Isso toca ADR-07 e é assunto do brainstorming, não do packet.

**Interseção anotada no próprio backlog (`backlog.md:430`):** o manual em PDF/DOCX pré-preenchido é
apontado como interseção com "Arquivados e restauração". Verificar no planejamento se ela vence
agora ou segue no bloco de origem.

**Risco de review projetado: MÉDIO-ALTO pelo gate binário** — o bloco **toca schema em potencial**
(se algum agregado precisar de coluna própria de arquivamento além de `deleted_at`), **toca
autorização** (superfície inexistente hoje) e **toca dado com peso legal** (certificados, documentos
de redator e matrículas estão entre os agregados soft-deletáveis). A classificação final é do
`/revisar-sprint`, não desta promoção; toca schema → o planejamento lê `docs/adrs.md` e
`docs/der-fisico.md`.

**`backend/config/cors.php` está modificado no working tree e não é deste bloco** (WIP do João, o
outro lado da P-45). Fica fora de todo `git add`; os commits usam paths exatos.

**Estado: `context_required`.** Próxima ação: Context Packet pelo Codex, read-only, sobre
`feat/arquivados-e-restauracao` a partir de `main@b758068`.

### Context Packet — 2026-08-18: gerado, contrato válido, veredito `blocked`

**O Codex rodou read-only e o packet passou na validação de contrato:** markers exatos, frontmatter
completo, 8 key facts (teto é 8), fontes endereçadas por ID e `RECOMMENDED_TRANSITION` presente.
Nenhuma re-invocação foi necessária. Packet salvo em
`context-packets/2026-08-18-arquivados-e-restauracao.md`.

**Seis artefatos externos, um a mais que o teto de cinco, e a exceção está justificada no packet:**
as quatro páginas Notion do bloco (H.5.1–H.5.4), a pasta canônica do Drive
(`1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3`) e a **H.3.1**, consultada porque a H.5.3 a declara dependência
e autorização é fato bloqueante. A H.3.1 cobre ownership e 403/404 — **não define papéis.**

**O que as fontes DECIDEM, e isso é ganho real do packet:**

1. **A superfície é de 8 aggregate roots em 6 grupos, não os 15 models soft-deletáveis:** `Client`,
   `Redator`, `Student`, `Course`, `Budget`/`Quote` e `Turma`/`Enrollment`. Os demais models
   soft-deletáveis são filhos ou infra até a matriz decidir o contrário. **Isso corrige a medição 1
   da seleção**, que tratava os 15 como candidatos.
2. **"Arquivado" NÃO é estado novo.** É o nome de usuário do soft-delete restaurável que já existe —
   `deleted_at` não ganha companhia. **Consequência de schema: o bloco pode não tocar migration
   nenhuma**, o que derruba metade do risco projetado na seleção.
3. **Endpoints por domínio, com `onlyTrashed`/restore por root e módulo.** Proibido endpoint global
   genérico que apague a diferença entre agregados.
4. **A UI mínima é uma visão de Arquivados** com alternância, restauração, feedback e invalidação da
   lista ativa. **Badge na listagem ativa não é exigido pela fonte** — se entrar, entra por decisão,
   não por requisito.
5. **Linguagem de exclusão irreversível sai da UI.** Confirmação de soft-delete não pode afirmar que
   é permanente, e exclusão permanente não aparece em tela.

**O que as fontes EXIGEM mas NÃO registram — e é por isso que o veredito é `blocked`.** A H.5.1 pede
uma matriz por agregado e não a contém; a H.5.3 diz "autorização equivalente ao módulo" e a
dependência que deveria detalhar isso só fala de ownership. **Cinco fatos de negócio faltam, e a
regra do skill é explícita: falta de decisão sobre regra de negócio bloqueia; falta de fonte não.**
Estão enumerados no `blocker` do frontmatter e nas Open questions do packet.

**A pasta do Drive estava disponível e foi consultada — não há documento funcional deste bloco
lá.** Isso não é fonte indisponível, é ausência medida: as buscas direcionadas só acharam material
genérico de arquitetura e entidades. Por isso o packet é `blocked` e não `partial`.

**A interseção da `backlog.md:430` (manual PDF/DOCX pré-preenchido) segue sem decisão externa** —
nenhuma das quatro páginas nem o Drive a mencionam. Vira pergunta ao João, não suposição.

**Estado: `blocked`, `resume_state: ready_for_planning`.** A recuperação externa está feita e não se
repete; o que falta são cinco decisões do João. Respondidas, o bloco volta a `ready_for_planning` e
o brainstorming começa com elas como entrada.

### Brainstorming e spec — 2026-08-18: o bloqueio caiu, e a medição derrubou duas afirmações minhas

**O João destravou mandando o brainstorming absorver as cinco perguntas**, em vez de respondê-las
soltas. Estado vai de `blocked` direto a `planning` — a fronteira durável é esta spec, e ela entra
no mesmo commit.

**Duas correções à medição da própria seleção, ambas minhas e ambas medidas:**

1. **"A maioria dos agregados nem tem rota `DELETE`" estava errado.** O grep de `Route::delete` não
   enxerga `apiResource`. `route:list --method=DELETE` devolve 21 rotas, e **sete dos oito roots já
   têm `destroy`** — só `Student` não tem. A superfície nova do bloco é menor do que a promoção
   projetou.
2. **A cascata de arquivamento já existe, e é boa.** Hooks `deleting` instância a instância em
   `Client`, `Budget`, `Course`, `Redator`, `Student` e `Role`; `DeleteClientAction` com transação e
   `lockForWrite`; gates de negócio escritos (`DeleteTurmaAction` recusa turma concluída, RN-15;
   `DeleteBudgetAction` recusa orçamento com cotação aprovada). O código **já chama a operação de
   "Arquiva"**. O bloco não é archive/restore: é **o lado do restore**, que não existe.

**As cinco decisões do João, todas tomadas:**

1. **Escopo: `Client` + `Course`**, fatia vertical. Cobrem toda a dificuldade — `Client` com três
   relações heterogêneas e filhos com rota própria, `Course` com cascata simples e zero gate.
2. **Cascata de restore por coluna marcadora** (`archived_with_parent` em 5 tabelas). Casar pai e
   filho por `deleted_at` foi **medido e descartado**: a coluna é `timestamp` de precisão 0 nas sete
   tabelas, e segundo inteiro não é identidade.
3. **Permissão `*.restore` nova por agregado**, admin e superadmin, fora de `SEGREGATED`; a lista de
   arquivados abre com a `*.view` do módulo.
4. **Rastreio = data + autor na lista**, lido da última audit `deleted`. É o **primeiro caminho de
   leitura de `audits` do projeto** — a tabela era write-only, com 16 models `Auditable`.
5. **Alternância na própria tabela**, não aba: `CommercialPage` tem abas e `CatalogPage` não.

**A quinta pergunta do packet caiu sem decisão nova.** A interseção do manual PDF/DOCX é com a
**FUT-1** e trata de documento de **turma**; com o escopo em `Client` + `Course` ela sai por
construção.

**Um achado do brainstorming ampliou o bloco, e o motivo é DoD, não escopo criativo:** `useRemove`
de `createCrudResource.ts:46` tem **zero consumidores** e nem `ClientsTable` nem `CoursesTable` têm
botão de excluir. Os endpoints `DELETE /clients/{client}` e `/courses/{course}` existem e são
**inalcançáveis pela UI**. Sem o botão de arquivar, a visão de Arquivados listaria registros que
ninguém produz pelo app e o DoD só seria demonstrável semeando o banco. **Arquivar entrou** (D9).

**Um débito NÃO foi corrigido, de propósito:** `budget.confirmDeleteBody` e
`quote.confirmDeleteBody` seguem dizendo *"Esta acción no se puede deshacer."* Para orçamento e
cotação isso é **verdade hoje** — o restore deles não existe. Trocar a frase antes do restore
substituiria um texto certo por um errado. Gatilho no bloco que trouxer `Budget`/`Quote`.

**O bloco não escreve `ValidationException` nova** — registro ativo no restore dá 404, não 422. Isso
o mantém fora da **D-07**, o débito de idioma canônico travado em decisão.

**Risco reavaliado: de MÉDIO-ALTO para MÉDIO.** A D1 derruba a metade de schema que a promoção
temia — `arquivado` é o `deleted_at` existente, sem estado novo. Sobra que o bloco **toca `users`**
(coluna marcadora), abre o primeiro caminho de leitura de `audits` e tira `useRemove` de zero
consumidores. Classificação final é do `/revisar-sprint`.

### Plano — 2026-08-18: 11 tasks, executor Claude, e o plano corrigiu um mecanismo da própria spec

**11 tasks, executor `claude`.** Seis de backend, quatro de frontend e uma de DoD. Cada uma fecha com
teste próprio; nenhuma depende de julgamento fora do plano, mas o conjunto toca lei demais para ir
ao Codex — ver o Handoff no fim do plano.

**O plano derrubou um mecanismo que a spec tinha escrito errado.** A spec (D2/D3) manda hook
**`restoring`**; o plano usa **`restored`**. Com `restoring`, os filhos voltariam a ativos enquanto o
**pai ainda está arquivado**. O par correto é `deleting` (antes) / `restored` (depois): os filhos
saem antes do pai e voltam depois dele. Nada mais da spec mudou.

**Uma medição obrigou um passo que a spec não previa: `Client::lockForWrite()` RECUSA cliente
arquivado.** Ele lança `ValidationException` quando `trashed()` — comportamento certo para escrita,
e exatamente o estado de quem vai ser restaurado. A Task 2 extrai `Client::lockRow()` (trava sem
julgar) e reescreve `lockForWrite` sobre ela, preservando a guarda. **É mutex com história de review
(Q-2, Q-5) e não quebra teste em sqlite** — `SQLiteGrammar::compileLock()` devolve string vazia —,
então errar ali só apareceria em produção. Está declarado no Handoff.

**Como a marca é gravada, e por que não polui a trilha.** `SoftDeletes::runSoftDelete()` só persiste
`deleted_at`/`updated_at`, então um atributo sujo **não chega ao banco pelo `delete()`**. O plano usa
`saveQuietly()` antes do `delete()`: grava a marca sem emitir evento, e por isso não cria um
`updated` por filho na trilha. O evento que importa — `deleted` — continua auditado normalmente
(ADR-08).

**`MAX(id)` e não `MAX(created_at)` no `ArchiveTrailQuery`:** `audits.created_at` é `timestamp` de
segundo inteiro, e dois `deleted` no mesmo segundo empatariam. O id é monotônico. É a mesma classe de
erro que a D2 evita na cascata.

**Três correções da auto-revisão do plano contra a spec, aplicadas inline:** um `actions={...}`
placeholder na Task 9 (substituído pelo bloco real da `CommercialPage`), a assinatura do
`ArchiveSwitch` escrita com três props na linha `Produces` quando são duas, e uma condicional
inútil na Task 6 — `Course::query()->withListingData()` existe e é o que o `index` já usa. Uma
quarta: `RestoreCourseAction` devolvia o curso sem `loadListingData()`, o que faria `CourseData`
montar sem a carga da projeção.

**Um item da spec estava sem task e ganhou uma.** O §5 pede que o restore invalide as **duas**
listas; o teste do `useArchivedPage` usa fake estrutural e não exercita isso. Entrou
`createCrudResource.test.ts`, que prova pelo **prefixo das chaves** que
`invalidateQueries({ queryKey: keys.all })` alcança tanto `[resource, 'list']` quanto
`[resource, 'archived']` — sem TanStack no teste, mantendo o padrão do repositório.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco arquivados-e-restauracao`.

### Execução — 2026-08-18: início, técnica `executing-plans`

**Main tree**, conforme a decisão do João na seleção e a P-03. Técnica `executing-plans` e não
`subagent-driven-development`: a sessão está sob restrição de AgentTool, e o precedente dos dois
últimos blocos é o mesmo.

**O fixture da Task 1 do plano não batia com o schema e foi corrigido na escrita do teste.** O plano
escreve `modules()->create(['name' => …, 'order' => 1])` — a coluna é `sort_order` — e
`certificateTemplates()->create(['version' => 2, 'body' => …])`, mas `version` está **fora do
`$fillable`** por decisão registrada (D10 do bloco de templates) e `body` não é coluna. O teste usa
`sort_order` e o helper `Tests\Support\CreatesCertificateTemplates::makeTemplate()`, que existe
exatamente para esse caso. Nenhum comportamento sob teste mudou.

**Task 1 verde e a suíte inteira medida nos dois sentidos.** `ArchiveCascadeMarkTest` passa com 3
testes / 8 asserções. `php artisan test` dá **12 failed / 675 passed / 5 skipped**; com
`FRONTEND_URL=http://localhost:5173`, **687 passed / 5 skipped / zero falha**. As 12 são a **P-45**
pelo terceiro fechamento seguido — `Session store not set on request.` no `.env` multi-origin —, não
regressão desta task.

### DoD end-to-end — 2026-08-18 (Task 11): provado no navegador, com dois defeitos de ambiente achados no caminho

**Ferramentas antes do navegador.** Backend `710 passed / 5 skipped` (2616 asserções) com
`FRONTEND_URL=http://localhost:5173`; sem a variável a P-45 continua devolvendo as mesmas 12 falhas
de sessão, que não são deste bloco. Frontend `376 passed` em 62 arquivos, `pnpm lint` e `pnpm build`
exit 0. O `typescript-transformer-manifest.json` estava sujo desde a Task 6 (o hash do `generated.ts`
mudou e o manifesto não entrou naquele commit) — corrigido em commit próprio antes da prova.

**O que só o navegador achou: o banco de dev não tinha nem a migration nem as permissões.** A suíte
roda em sqlite `:memory:` e migra do zero a cada execução, então verde na suíte não diz nada sobre o
MySQL de desenvolvimento. Ao arquivar o cliente pela tela, o `DELETE /api/clients/13` voltou **500**
com `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'archived_with_parent' in 'field list'`;
depois de `php artisan migrate`, o arquivamento passou, mas a lista de Arquivados abriu **sem botão
Restaurar para o superadmin** — `commercial.client.restore` e `catalog.course.restore` existiam no
`PermissionCatalog` e não no banco, porque o `RolePermissionSeeder` nunca foi re-executado.
`db:seed --class=RolePermissionSeeder` resolveu. Nenhum dos dois é defeito de código do bloco; ambos
são exatamente a classe de falha que a lei §8 existe para pegar — build verde não é DoD.

**Roteiro do cliente (Steps 3 e 7), provado ponta a ponta em `E2E Gate Client D` (id 13).** Arquivar
um contato "pela ficha" tem uma mecânica que o plano não previa: o `UpdateClientAction` faz *replace*
dos nested, então remover o contato no dialog e salvar soft-deleta a coleção inteira e recria os
sobreviventes (contatos 33 e 34 arquivados, contato 39 recriado vivo). O efeito exigido pelo roteiro
— filho arquivado ANTES da cascata, portanto com `archived_with_parent = false` — foi obtido do mesmo
jeito, e é justamente o que a spec D2 distingue. Sequência medida: `DELETE /api/clients/13` **204**;
o cliente sai da lista ativa ("No results"); em **Arquivados** ele aparece com `ARCHIVED ON 8/18/2026`
e `ARCHIVED BY Andreoli` — primeira leitura de `audits` chegando à tela; `POST /api/clients/13/restore`
**200**; e o estado do banco volta idêntico ao de antes: endereço 25 e contato 39 vivos, contatos
31–34 e endereços 19–21 (pré-arquivados) **continuam arquivados**, marca `archived_with_parent` de
volta em `false` em todos. A ficha reaberta mostra o endereço e só o contato vivo — "Joao Andreoli",
arquivado antes da cascata, **não voltou**.

**Step 4 (403), provado nas duas camadas.** Usuário temporário `dod.viewonly@lotus.cl` sem role e com
`commercial.client.view` avulsa: `/comercial` abre, o switch alterna, `GET /api/clients/archived`
volta **200** com as quatro linhas e **nenhum botão Restaurar renderiza**. O mesmo usuário em
`POST /api/clients/1/restore` recebe **403** RFC 7807 (`"detail": "User does not have the right
permissions."`). O usuário foi apagado com `forceDelete()` ao fim da prova; o banco de dev não ficou
com resíduo.

**Gêmeo do Catálogo, provado com verificação imediata no banco.** `DELETE /api/courses/3` **204**
marca `archived_with_parent = 1` e arquiva os módulos 6–8; `POST /api/courses/3/restore` **200**
devolve os três e zera a marca. A primeira tentativa (curso 1) foi descartada porque a auditoria
mostrou um `restored` do curso 1 e um `deleted` do curso 8 **entre os meus comandos** — outra sessão
mexendo no mesmo banco de dev. Nada a corrigir no código; o curso 8 (`GATE T7`) permanece arquivado
por mão alheia e foi deixado como está.

**Observação registrada, não corrigida:** na lista de Arquivados as colunas COMMUNE e CONTACTS
aparecem como `—` e `0`, porque o listing lê endereço e contatos ativos e a cascata acabou de
arquivá-los. É consequência coerente do desenho (a listagem não olha `onlyTrashed`), mas empobrece a
linha justamente onde ela precisa identificar o registro. Fica como achado para o review decidir.

**Ambiente durante a prova:** o Docker Desktop caiu no meio da sessão (daemon fora, stack inteira
parada) e o Vite junto; ambos foram religados e a prova refeita do início. Nenhum dado do bloco
dependeu do que rodou antes da queda.

### Review — 2026-08-18: `/revisar-sprint`, risco ALTO, duas lentes, 7 achados (2 🔴)

Risco ALTO pelo gabarito: o bloco tocou migration, `users`, `generated.ts` e RBAC. Então além da
revisão Claude rodou a segunda lente do **Codex** (`read-only`, mesmo intervalo `main...HEAD`).

**Achados aprovados pelo João — todos os sete — e corrigidos:**

**Q-1 🔴 — a cascata levava embora o `User` que já estava arquivado.** `addresses()` e `contacts()`
escondem o filho arquivado pelo escopo global, mas `Client::user()` é `belongsTo(...)->withTrashed()`
— então o `User` arquivado de propósito ANTES do pai entrava na cascata, ganhava
`archived_with_parent = true`, tinha o `deleted_at` reescrito pelo `delete()` e **voltava junto no
restore**. É exatamente o modo de falha que a spec D2 existe para impedir, na única relação que
escapava dela. Convergiu com a segunda lente do Codex. Provado por teste antes de corrigir
(`user arquivado antes do cliente nao volta na cascata`) e por mutação depois.

**Q-4 🟡 — os helpers da cascata estavam duplicados**, idênticos, em `Client` e `Course`, com mais
seis roots previstos para replicá-los. As duas correções viraram uma só: nasceu
`App\Shared\Concerns\ArchivesChildren`, e a guarda do Q-1 (`if ($child->trashed()) return;`) mora
lá dentro, num lugar só — com os helpers copiados, o defeito teria de ser corrigido em oito arquivos.

**Q-2 🔴 — arquivar e restaurar não davam retorno nenhum.** Nem sucesso nem erro: as chaves
`archive.archivedToast` e `archive.restoredToast` estavam nos três locales com zero consumidor
(i18n órfão), e um 403 de quem não tem `*.restore` não mudava nada na tela. `useArchivedPage` passou
a aceitar `RestoreOptions`, os hooks de feature ganharam `useToast` nos dois sentidos, e o `busy`
desce até os botões da linha (clique duplo disparava dois POSTs). `problemMessage` subiu de
`useTurmaDocsSection` para `shared/api/` — o segundo consumidor nasceria como cópia, e feature não
importa de feature (lei §6). Convergiu com o Codex.

**Q-3 🟡 — o achatamento adivinhava o agregado** com `Object.values(resto)[0]`, contrato refém da
contagem e da ordem das chaves do DTO, com o cast calando o `tsc`. Agora o seletor é explícito
(`(row) => row.client`). O teste novo prova o caso que quebrava em silêncio: DTO com um campo a mais.

**Q-5 🟡 — `CourseController::destroy` cascateava sem transação**, assimétrico ao `Client` e à
própria `RestoreCourseAction`. Código pré-existente, mas foi este bloco que lhe deu o primeiro
consumidor de UI (D9) e tornou a janela alcançável. Nasceu `ArchiveCourseAction`; o teste prova o
ROLLBACK — falha no meio da cascata não pode deixar template arquivado sob curso ativo.

**Q-6 🟢 — `POST /api/clients/abc/restore` dava 500**, não 404: `int $client` estoura `TypeError`
antes de qualquer consulta. `->whereNumber()` nas duas rotas de restore.

**Q-7 🟢 — a migration não tem backfill e não há como ter.** Documentado no docblock e registrado
como **D-37** no `backlog.md`, com gatilho no primeiro deploy. Casar por `deleted_at` é o que a spec
D2 recusou; marcar todo filho arquivado ressuscitaria o que alguém arquivou de propósito.

**Prova por mutação, nos dois lados:** desfeitas a guarda do trait, a transação da Action e o
`whereNumber`, os três testes novos de backend reprovam (`3 failed`); desfeitos o seletor explícito
e o repasse de `RestoreOptions`, os dois testes novos de frontend reprovam, um de cada vez.

**Divergência entre as lentes, mostrada e não resolvida em silêncio:** o Codex apontou
`RestoreCourseAction` sem lock e `useArchivedPage` apagando a lista em cima de cache quando o refetch
falha. Os dois foram **rejeitados** — o primeiro é decisão registrada na spec D3 e no docblock da
Action; o segundo é literalmente o código de `useCrudPage.ts:48`, padrão vigente do projeto. O João
não contestou a rejeição.

**Um defeito de ambiente achado no gate, e ele não é do bloco:** a suíte completa devolveu
**12 failed** em `AuthTest`/`LoginLogTest`/`ProfilePasswordTest`, todas com
`RuntimeException: Session store not set on request`. Medido em árvore limpa (`git stash -u`, sem
uma linha do review): **falha igual em HEAD**. A causa é o `.env` local — `FRONTEND_URL` virou
`http://localhost:5173,http://localhost:5174` (dois dev servers), e `TestCase::setUp` mandava a
string inteira como `Referer`, produzindo host inválido e request não-stateful. Provado nos dois
sentidos: com uma URL só, `12 passed`. Corrigido no `TestCase`, que agora usa a **primeira** origem
da lista — a mesma leitura que `config/cors.php` passou a fazer com `explode(',')`.

**Q-8 — herdado da nota do DoD, aprovado pelo João e corrigido.** Na lista de Arquivados as colunas
COMMUNE e CONTACTS mostravam `—` e `0`: `withListingData()` lê endereço e contato ATIVOS e a cascata
acabou de arquivá-los, então o eager load vinha vazio pelo global scope de `SoftDeletes`. A linha
negava o registro justamente onde o operador precisa reconhecê-lo antes de restaurar.

A correção tem home própria — `App\Shared\Concerns\LoadsCascadedChildren`, o gêmeo de LEITURA do
`ArchivesChildren`, pela mesma razão do Q-4: os outros seis aggregate roots replicam o padrão, e o
filtro copiado teria de ser corrigido em oito arquivos. `asOfArchiving()` carrega a coleção como ela
estava no instante do arquivamento — filho ATIVO **ou** com `archived_with_parent = true` —, e
`ClientQueryBuilder`/`CourseQueryBuilder` ganharam `withArchivedListingData()`, que os dois
controllers usam só na rota `archived`. O `LISTING` da tela ativa não mudou.

O filho arquivado de propósito ANTES do pai continua fora, e isso é regra, não detalhe: ele não volta
no restore (spec D2), então mostrá-lo aqui prometeria uma restauração que não acontece. O curso
entrou junto porque o payload do arquivado tinha o mesmo defeito em `templates`/`modules`, ainda que
a tabela dele não exiba as colunas — deixar só o cliente corrigido é o assimétrico que o Q-4 pune.

Quatro testes novos, dois por entidade (mostra o que a cascata levou / não mostra o que veio antes),
provados por **duas** mutações: trocar `withArchivedListingData()` de volta por `withListingData()`
reprova os 4; tirar o filtro da marca e deixar só `withTrashed()` reprova exatamente os 2 do
contorno (`2 failed, 14 passed`).

**Gate após as correções:** backend **717 passed / 5 skipped** (2636 asserções) · `pnpm test`
**378 passed** · `pnpm lint` 0 · `pnpm build` exit 0 · `typescript:transform` re-rodado **sem drift**
· Pint `passed` em todos os `.php` do bloco. A única reprovação de Pint é `config/cors.php`, que é
alteração local do João ainda não commitada. O Q-8 não mexeu em DTO nem em frontend: o contrato da
resposta é o mesmo `ClientData`/`CourseData`, só deixou de vir vazio.

**Review encerrada sem achado pendente.** Falta a prova no navegador do toast e do `busy` do Q-2 e
da comuna/contatos do Q-8 — isso é do `/fechar-sprint`, não do review.

### Fechamento — 2026-08-18: o critério de aceite provado contra a API real e em Chromium, e a P-45 encerrada

**O item 0 do gate não aceita suíte verde no lugar da prova**, então o bloco foi exercido duas
vezes fora do teste: contra a API em `:8080` (MySQL real, não o sqlite `:memory:` da suíte) e no
navegador.

**Contra a API real, o roteiro inteiro da spec D2 num cliente novo:** dois contatos e um endereço,
`DELETE /api/contacts/{id}` num deles, `DELETE /api/clients/{id}`, e a lista de arquivados devolveu
`COMMUNE: Providencia` e `CONTACTS: 1 ['Vivo']` — o contato arquivado antes do pai **fora da
lista**, que é a metade que a Q-8 existe para não estragar. Depois do restore, `['Vivo']` e um
endereço de volta, e o contato de antes ainda arquivado. `POST /api/clients/abc/restore` deu **404**
(Q-6). O gêmeo do curso passou pelo mesmo caminho, com a coleção replace-total no lugar do delete
nested: `MODULES: ['Modulo Vivo']` na lista e no pós-restore.

**No navegador, o que só a tela responde.** Arquivar a Transelec pela lista ativa e alternar para
Arquivados mostrou `Providencia` e `3` — as duas colunas que o review encontrou vazias —, com data e
`Andreoli` em "Arquivado por". A Enel repetiu com `Santiago` e `1`. O toast apareceu nos dois
sentidos, com o texto do i18n: **`Record archived.`** e **`Record restored.`**; e os botões de
Restaurar foram lidos `disabled` com a mutação em voo, que é o `busy` da Q-2 — medido por polling
dentro da página, não por inspeção depois do fato. O ramo de ERRO do toast (403 de quem não tem
`commercial.client.restore`) segue provado só pelo teste de unidade do `useArchivedPage`; montar o
papel reduzido no banco de dev sairia mais caro que o risco que cobre.

**Zero resíduo no banco de dev.** Os registros de sonda (3 clientes `E2E Q8 Ltda`, 2 cursos
`E2E Q8 Curso`, filhos e usuários) foram removidos com `forceDelete` no mesmo gate, conferidos em 0.
As duas linhas antigas `E2E Gate Client A/B` — sondas de gates anteriores, da **P-44** — foram
restauradas sem querer durante a condução do navegador e **rearquivadas** no mesmo passo, de volta
ao estado em que estavam.

**Gate:** backend **717 passed / 5 skipped** (2636 asserções) · `pnpm test` **62 arquivos / 378
testes** · `pnpm lint` 0 · `pnpm build` exit 0 · Pint `passed` em todos os `.php` do bloco ·
`typescript:transform` sem drift em `generated.ts`. A única reprovação de Pint da árvore continua
sendo `backend/config/cors.php`, alteração local do João.

**A P-45 fecha aqui, pelo gatilho literal.** A ficha previa "o commit que ligar multi-origin **ou** o
próximo `/fechar-sprint` que encontrar a suíte vermelha por este motivo" — o segundo ramo venceu
pela terceira vez, e desta vez o bloco é de backend, então não havia por que não abrir o arquivo.
`TestCase.php` passou a tratar `FRONTEND_URL` como a lista que ela é. A **P-36** e a **P-37**
cumpriram a sprint de rastro e saíram das encerradas.

**Fica registrada a D-37** no `backlog.md` (nasceu como `D-34` e foi renumerada no merge da `main`, que já publicara um D-34): `archived_with_parent` nasceu sem backfill e não há como
recuperá-lo — qualquer agregado arquivado antes de 2026-08-18 restaura o pai sem os filhos. O item 1
de "Próximos blocos" foi reescrito para o que sobra: replicar o padrão nos seis roots restantes,
com o molde apontando para a spec arquivada.
