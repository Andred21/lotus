---
schema_version: 1
active_feature: null
active_work_item: null
workflow_state: idle
next_owner: joao
next_action: select_backlog_item
resume_state: null
active_spec: null
active_plan: null
context_packet: null
blocker: null
last_completed_work_item: celula-de-identidade
state_basis_commit: 9ed7351
updated_at: 2026-08-14T18:35:00-03:00
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

## Último item fechado — 2026-08-14 (`celula-de-identidade`, item 4 de "Próximos blocos")

### Exceção declarada à invariante de um `active_work_item` — terceira ocorrência

**Existem dois itens ativos ao mesmo tempo, por decisão explícita do João em 2026-08-14**, e isto
está escrito porque a invariante do topo deste arquivo diz o contrário. O `falha-vs-lista-vazia`
(BD-6) está em `workflow_state: executing` no main tree `/home/jvbat/projetos/lotus`, branch
`feat/falha-vs-lista-vazia` (`d20bebc`), com **cinco tasks de conteúdo já commitadas**. Este bloco
nasce na worktree `fix-frontend`, branch `feat/celula-de-identidade` criada de `0a1439f`.

**A diferença para as duas ocorrências anteriores (BD-4 × BD-9 e BD-5 × login) é que aqui não há
divergência de base:** a branch do BD-6 declara `state_basis_commit: 0a1439f` e **descende** do HEAD
da `main` a partir do qual este bloco nasce. Não são dois `state.md` incompatíveis promovidos do
mesmo ponto em paralelo — é um bloco ativo ainda não mergeado mais um bloco novo atrás dele. O
`state.md` da `main` dizia `idle` porque o BD-6 vive na branch dele, não porque nada esteja ativo.

**A sobreposição foi medida antes da decisão, não depois — três pontos, e o João a aceitou de
antemão** em vez de descobri-la no merge:

1. `frontend/src/features/commercial/hooks/useCommercialClients.ts` — o BD-6 **já o reescreveu**
   (`f64ba33`…`d20bebc`), e o **Grupo B** deste bloco exige expor o `ClientData` inteiro nesse mesmo
   hook, que hoje estreita para o nome (`backlog.md`, Grupo B, `BudgetsTable.tsx:88`). Colisão de
   conteúdo, não só de texto.
2. `frontend/src/shared/ui/index.ts` — o BD-6 acrescenta `InlineLoadState` ao barrel; este bloco
   acrescenta a célula nova. Mesma região do arquivo.
3. `shared/config/locales/{es-CL,pt-BR,en}.json` — o BD-6 escreve nos três; este bloco escreve **se**
   a decisão 1 criar rótulo de ausência ("sin correo"). Condicional, não certo.

**O que NÃO colide, também medido:** nenhum dos 13 sítios de renderização do item 4 aparece no diff
`main...feat/falha-vs-lista-vazia`. Os arquivos do BD-6 em `commercial` são `BudgetDialog`,
`CourseStep`, `QuoteWizard` e `QuotesList` — `BudgetsTable.tsx`, que é o sítio do Grupo B, está
fora deles.

**Alternativas recusadas por ele:** esperar o BD-6 fechar e mergear (manteria a invariante e
permitiria planejar o Grupo B sobre a forma nova do hook, ao custo de o bloco não começar hoje); e
promover em paralelo **cortando o Grupo B**, que teria eliminado a colisão de hook na origem.

### Seleção — 2026-08-14

**Item 4 de "Próximos blocos" (`backlog.md:33`), promovido explicitamente pelo João.** O gate do
`/planejar-bloco` reprovou pelo motivo de sempre (BD-1, BD-2, BD-7, BD-8, BD-9, BD-5, login): o
estado era `idle` e o argumento era **título de seção**, não slug promovido. As quatro decisões dele
fecharam o gate: o slug `celula-de-identidade`; a rota **`context_required`** com Context Packet
gerado pelo Codex; o **paralelismo** com o BD-6; e a **worktree `fix-frontend`** como área de
trabalho.

**A rota do packet é decisão dele contra a medição, e isso fica escrito.** A ausência de fonte
externa foi **medida**: grep por `drive.google`, `notion.so`, `figma.com`, `docs.google` e `http` nas
105 linhas do item 4 devolve **zero ocorrência**, e a superfície dos 13 sítios, os três grupos, as
cinco decisões abertas e a ordem sugerida estão **transcritos** no `backlog.md`. Pela medição, o
precedente seria rota direta a `ready_for_planning` (BD-8, BD-9, BD-5, login). O João escolheu o
packet mesmo assim — as duas capturas de tela que abriram o pedido são a única entrada que não vive
no repositório, e o packet é o mecanismo que registra o que existe e o que está indisponível em vez
de deixar a lacuna implícita.

**A direção decidida entra neste commit.** As **105 linhas** do item 4 estavam **não commitadas** no
working tree desta worktree quando o comando abriu — decisão durável vivendo onde um `git checkout`
a apagaria. É a repetição exata do que aconteceu no `login-fora-do-adr16` (§"Seleção — 2026-08-13"),
e entram aqui como artefato do mesmo commit da promoção.

**`state_basis_commit` passa de `024673a` a `0a1439f`** — o HEAD da `main` de onde esta branch nasce.
Não era divergência: com `active_work_item` `null` não havia trabalho ativo cujo baseline pudesse ter
derivado.

**Frontend puro por escopo declarado: a P-03 não dispara.** O bloco é apresentacional, e o único
caminho que tocaria backend é a alternativa (b) da decisão 1 (alargar DTO, `generated.ts`, lei §5.3)
— que é justamente uma das cinco decisões que o planejamento tem de fechar, não um dado do bloco.

### Context Packet — 2026-08-14: `partial`, e a rota se pagou

Packet em `docs/superpowers/context-packets/celula-de-identidade.md`, gerado pelo Codex read-only
com a skill `lotus-context-packet`. **Contrato validado item a item, não aceito de chegada:**
marcadores exatos, frontmatter completo com `plan_path`/`spec_path` corretamente em `null`,
**8 key facts** (o teto exato da skill), `RECOMMENDED_TRANSITION: ready_for_planning`, e nenhum
staleness trigger apontando para hash de proveniência ou para a própria transição promotora — que é
a armadilha que a skill documenta.

**Os quatro hashes de proveniência foram remedidos aqui e batem:** `base_commit`
`fb443ee41af6…`, `state_blob_sha` `f4ac80fc…`, `progress_blob_sha` `35d631aa…` e o HEAD do BD-6
`d20bebc78aa9…`. Foram obtidos, não adivinhados.

**A rota que o João escolheu contra a medição se pagou, e o retorno é o oposto do esperado.** O
packet consultou as três fontes canônicas do Drive por **file ID** (`tela-pessoas.md`,
`tela-turmas.md`, `tela-servicos.md`) e a base canônica do Notion por **collection ID** — e o achado
é que **nenhuma delas prescreve célula de identidade, uso de foto, fallback sem imagem, fusão de
coluna ou tratamento de N redatores**. As cinco decisões abertas do item 4 continuam abertas, agora
com **prova de ausência** em vez de suposição de ausência: o brainstorming as fecha com o João
sabendo que não há respaldo externo a contrariar. Um único sinal de aceite externo apareceu, e é
restritivo: a task `388bc960-3dfa-8188-b051-e0f4feb08943` exige que a lista de designação **continue
filtrada por habilitação** — decide só isso, e não a aparência do card ou do picker.

**As duas capturas viraram lacuna declarada, não fonte `unavailable`**, e a distinção é a que a
skill exige: elas não têm arquivo, ID nem path, e não existe locator de Figma nos artefatos
canônicos. Consequência escrita no packet: **não há aceite por equivalência visual** neste bloco.
Isso não bloqueia o planejamento — vira `## Deferred`.

**Uma afirmação do packet foi medida e reprovou, e a correção está no próprio arquivo.** Ele
afirmava em `## Constraints` que o main tree tinha WIP não commitado em `CourseStep.tsx`; medido,
`git -C /home/jvbat/projetos/lotus status --short` devolve **vazio** com HEAD em `d20bebc`. A
cláusula saiu e a correção ficou registrada no cabeçalho do packet, com o resto verbatim — packet
revisado é packet cujo revisor mediu, não cujo revisor confiou.

**`status: partial` prossegue** pela regra da própria skill: fonte não canônica indisponível não
bloqueia, e o fato faltante que bloquearia — uma regra de negócio ou critério de aceite — não
existe, porque as cinco decisões são de apresentação e pertencem ao João.

### Spec — 2026-08-14: o bloco deixou de ser frontend puro

Spec em `docs/superpowers/specs/archive/2026-08-14-celula-de-identidade-design.md`, aprovada pelo João
depois de onze decisões fechadas uma a uma (D1–D11, tabela §10 da spec). `active_spec` já entra
preenchido: a spec existe no disco, e deixá-la `null` criaria exatamente a divergência que a
invariante deste arquivo proíbe.

**A decisão D2/D3 invalida a frase "frontend puro" escrita acima em "Seleção — 2026-08-14".** O
Grupo C resolve-se **alargando dois DTOs no backend** (`TurmaData` ganha `client_rut` e
`client_photo_url`; `TurmaRedatorData` ganha `email` e `photo_url`), o que regenera `generated.ts`
pela lei §5.3 / ADR-04. A frase antiga previa esse caminho como alternativa (b) da decisão 1 — foi
ele que o João escolheu. Duas consequências entram aqui porque mudam o gate, não a implementação:

1. **Risco de review sobe a ALTO**, pelo gatilho binário do projeto (`generated.ts` regenerado,
   precedente BD-9).
2. **A P-03 continua não disparando, e isto foi remedido, não herdado.** O gatilho dela exige
   *mais de um* `active_work_item` de **backend**; o diff `main...feat/falha-vs-lista-vazia` do BD-6
   tem **zero** arquivo em `backend/`. Este é o único bloco de backend ativo.
3. **A escolha da worktree sobrevive, sob uma condição escrita.** O João escolheu `fix-frontend` no
   gate quando o bloco era declaradamente frontend. Medido: `docker compose ps` vazio e os mounts do
   compose são relativos (`./backend`, `./frontend`), então `docker compose up -d` **desta** worktree
   serve o backend **desta** branch em `:8080`. A condição é **um stack por vez**: se um stack subir
   do main tree, o `:8080` passa a servir a outra branch e os testes deste bloco mentem. O BD-6 é
   frontend e consome o mesmo backend sem dano, porque o alargamento é aditivo.

**Custo do alargamento, medido e não estimado:** `TurmaQueryBuilder::LISTING` já traz
`redatores.user` e `quote.budget.client.user`. Zero query nova, zero eager load novo, zero migration.
Eu havia precificado esta rota como cara (risco de N+1, assinaturas por request) **antes** de medir;
a medição desmentiu o meu próprio quadro de custo e isso está dito na spec §3. Sobra **uma**
incerteza real e ela é verificação obrigatória do plano: `redatores` é `array` sem
`#[DataCollectionOf]`, e não está provado que o `WithTransformer` dispare ali — o teste prova que
`redatores[0].photo_url` volta assinada, ou o campo passa a ser resolvido no `fromModel`.

### Plano — 2026-08-14: 12 tasks, executor dividido

Plano em `docs/superpowers/plans/archive/2026-08-14-celula-de-identidade.md`. **Doze tasks, cada uma com
entregável testável isolado.** Ordem obrigatória: 1–2 (backend) antes de 3 (`typescript:transform`);
3 e 4 antes de 5–10 (os sítios precisam do TS e do componente); 11 depois de tudo; 12 é o gate.
As tasks 5–10 são independentes entre si.

**O executor é dividido por decisão do João (D12): `codex` nas tasks 1, 2 e 11 (`backend/**`),
`claude` no resto.** Os `paths_autorizados` do Codex são cinco arquivos nomeados um a um, e
`frontend/src/shared/types/generated.ts` **não está entre eles** — a lei §5.3 proíbe editá-lo à
mão, e a garantia mais barata é o executor do backend não alcançar o arquivo. A regeneração é task
do Claude.

**A ordem "depois de teste" do pedido está no plano, não na cabeça de ninguém:** o
`DemoPhotosSeeder` é a task 11, depois das dez tasks de conteúdo, porque sem ele a revisão visual
exercitaria só o fallback de iniciais — o caminho `photo_url` → `SignedUrlTransformer` → `<img>`,
que é exatamente o que este bloco acrescenta, ficaria sem prova.

**A revisão visual entra no plano como lista fechada de 13 telas com o que provar em cada uma**
(task 12, step 8). `/lotus-ui-review` tem `disable-model-invocation: true`: é passo do João, e
planejá-lo agora é o que evita descobri-lo no gate, como no `login-fora-do-adr16`.

### Execução — 2026-08-14: início, e a premissa da worktree caiu antes da Task 1

`/executar-bloco celula-de-identidade` validou as âncoras (spec, plano e packet no disco; Git em
`abe976a` na branch `feat/celula-de-identidade`; `active_plan` cobrindo o work item) e abriu os dois
gates. O ciclo foi escalado ao João pelo mesmo impasse recorrente do BD-4, do
`rastro-unicidade-e-gates` e do login — o plano pede `subagent-driven-development` e a sessão não
chama o Agent tool sem autorização: **SDD, Agent tool autorizado para este bloco.**

**A condição escrita em §"Spec — 2026-08-14" item 3 estava falsa quando o comando abriu, e isso foi
medido, não deduzido.** Aquele parágrafo autorizou a worktree com base em `docker compose ps`
**vazio**. Na abertura da execução o stack `lotus-*` estava de pé havia 3h, servido pelo main tree em
`feat/falha-vs-lista-vazia` (BD-6, `ready_for_closure`), e `lotus-app-1` monta
`/home/jvbat/projetos/lotus/backend` — **não** esta árvore. Como as Tasks 1, 2 e 11 são de
`backend/**`, `php artisan test` naquele container teria medido a outra branch.

**O mecanismo do defeito ficaria invisível, e é isso que o torna grave.** Os três hashes de
`TurmaData.php` — container, main tree e worktree — batiam em `f59c2df7…`, mas **por conteúdo**:
`git diff main -- backend/` desta branch é vazio. A Task 1 escreve na worktree; o container seguiria
lendo a cópia do main tree, **sem o campo**. Vermelho permanente contra código correto, sem nada na
tela apontando para a causa.

**Decisão do João: manter o stack de pé, sem derrubar nada.** Mecanismo:
`docker compose up -d --no-deps app` desta worktree, que cria `fix-frontend-app-1` montando
`fix-frontend/backend`. O serviço `app` não publica porta, então há zero colisão com os 8080/3307/9000
do stack do main tree — conferido depois da subida: os cinco containers `lotus-*` seguem `Up`.
`--no-deps` porque `mysql`/`minio` colidiriam, e o `phpunit.xml` usa sqlite `:memory:` (linhas 26-27),
então teste de backend não precisa de MySQL. Sem build: `fix-frontend-app:latest` já existia.

**Isso resolve as Tasks 1–11 e NÃO resolve a Task 12 Step 7**, que precisa de MySQL com dado real,
MinIO e `pnpm dev` para o `DemoPhotosSeeder` e a revisão visual. Fica declarado agora como decisão
pendente do João, em vez de descoberto no gate — que é a lição do `login-fora-do-adr16`.

**Baseline medido nesta branch, não herdado:** backend **591 passed / 5 skipped** (2149 asserções);
`pnpm lint` exit 0; `pnpm build` verde; `pnpm test` **32 arquivos / 163 testes**.

**Pre-flight scan das 12 tasks — três achados, nenhum bloqueante.** O desvio de mecanismo acima (F1);
um falso alarme descartado por medição (F2: `AppAvatarProps.image` já é `string | null` e o tipo já é
exportado, então a Task 4 compila); e uma justificativa errada com conclusão certa (F3: a Task 10
diz que o `field` alimenta a busca do `useTableFilter`, mas quem varre é o `searchable`, e o
`EmissionStudentsTable` chama `useTableFilter(enrollments)` **sem** `searchable` — a tabela não tem
busca nenhuma, então a fusão de colunas custa ainda menos do que D5 supôs). Detalhe em
`.superpowers/sdd/progress.md`.

**Nota de higiene:** o `updated_at` anterior dizia `17:10:00-03:00`, à frente do relógio real
(`date -Is` na abertura: `15:18:17-03:00`). O campo passa a registrar a hora medida, então ele
**recua** — o valor antigo é que estava errado.

### Execução — 2026-08-14: Tasks 1 e 2, e a incerteza do bloco caiu por medição

**O sandbox do Codex não alcança `/var/run/docker.sock`**, então ele não chegou ao PHPUnit e parou nos
Steps 2 das duas tasks, corretamente marcando `blocked` em vez de alegar verde. **Escalar a permissão
foi recusado**: o `/executar-bloco` já exige que Claude rode a verificação do plano antes de aceitar o
diff, então o arranjo passou a ser Codex autora o diff e Claude mede — sem nenhum ganho de permissão.

**Vermelho medido, e é literalmente o que o plano previu:** Task 1 com
`Undefined property: App\Domains\Operation\Data\TurmaData::$client_rut`; Task 2 com
`Failed asserting that null is identical to 'ana.silva@lotus.cl'`.

**A única incerteza real declarada na spec §3 e no plano foi resolvida, e resolveu-se a favor do
caminho barato.** `TurmaData::$redatores` é `array|Optional` com `@var TurmaRedatorData[]` e **sem
`#[DataCollectionOf]`**, e não estava provado que um `WithTransformer` de propriedade disparasse
dentro desse aninhamento. O `assertStringStartsWith('http', …)` **passou**: o transformer atravessa.
O Step 6 alternativo do plano (resolver a assinatura no `fromModel`) **não foi aplicado** — não era
necessário, e aplicá-lo por precaução teria trocado um mecanismo medido por um palpite.

**Suíte inteira: 592 passed / 5 skipped** (2154 asserções) contra o baseline de 591/5 (2149) — +1
teste e +5 asserções, exatamente o que as duas tasks acrescentam, zero regressão. Pint `passed` nos
quatro arquivos. Diff revisado contra o plano antes do commit e integralmente dentro dos
`paths_autorizados`; `generated.ts` intocado, como a lei §5.3 exige.

### Execução — 2026-08-14: Tasks 3–12, o bloco fecha em `ready_for_review`

**Task 4 (`IdentityCell`) não foi delegada a subagente.** SDD com Agent tool estava autorizado pelo
João para o ciclo do bloco, mas a tentativa de spawn foi rejeitada em tempo real; executada inline
por Claude a partir daí — Tasks 4 a 10 e o gate (12) inteiros sem subagente.

**Um rabo solto da Task 3 apareceu ao abrir a Task 4:** `typescript-transformer-manifest.json`
estava modificado na árvore sem nunca ter sido staged junto de `0c4e9ac` — hash novo já batendo com
o `generated.ts` commitado. Corrigido em commit próprio (`a81adb2`), separado da Task 4.

**Grupo A, B e C (Tasks 5–10) fecham os 13 sítios da superfície do bloco**, cada um com gate
build+lint+test verde e commit isolado. Dois achados de execução, nenhum de código: `useCommercialClients.ts`
seguia na forma pré-BD-6 (`clients.data?.find`, não `useLoadState`) — a variante Step 1b do plano
previa exatamente esse caso, aplicada sem ambiguidade (Task 7). A catraca de cor provou nos dois
sentidos (Task 5 Step 6): reintroduzir `text-gray-400` faz `pnpm lint` falhar nomeando arquivo e
linha; revertido à mão, sem `git checkout`.

**Task 11 (`DemoPhotosSeeder`, executor `codex`) repetiu a forma das Tasks 1/2** — Codex escreveu o
arquivo verbatim ao plano, Pint passou, e os Steps dependentes de Docker (rodar o seed, provar
idempotência) foram bloqueados no sandbox por desenho. Mas a causa raiz chegou uma task antes do
previsto: o `--no-deps app` do gate de abertura resolvia teste (sqlite `:memory:`), não `db:seed`,
que precisa de MySQL/MinIO reais — gap que o F1 do pre-flight só havia antecipado para a Task 12
Step 7. **Decisão do João:** `docker network connect lotus_default fix-frontend-app-1` — sem subir
ou derrubar container, sem tocar porta, só entrar como membro adicional da rede; o seed grava no
MESMO banco de dev que o BD-6 usa, reuso deliberado, não isolamento. Medido depois: 33 semeadas na
primeira rodada, `0 semeadas` e todos `já tem foto, pulado` na segunda — idempotência provada.

**Gate do bloco (Task 12), todos os seis passos verificáveis sem exceção:** suíte de backend 592
passed / 5 skipped (2154 asserções, mesma contagem desde a Task 3); frontend `pnpm build`/`pnpm lint`/`pnpm test`
os três exit 0, 171 testes; `grep "text-gray-"` zero ocorrências; `CATRACA_COR` com exatamente 4
linhas, sem `ClientsTable.tsx`; `grep "AppAvatar"` fora de `shared/ui` aponta só para
`UserMenu.tsx`, a única exceção deliberada; `typescript:transform` reexecutado devolve diff vazio
em `generated.ts` — nenhuma edição à mão.

**O que o bloco NÃO provou, sem maquiagem:** `/lotus-ui-review` não rodou — os 13 sítios da lista do
plano (Task 12 Step 8) nunca foram vistos no navegador nesta execução. A porta 5173 está ocupada
pelo `pnpm dev` do main tree (BD-6, `/home/jvbat/projetos/lotus/frontend`), e o `docker compose up
-d` sem `--no-deps` do texto original do plano colidiria de porta com aquele stack — mesma classe
de desvio de mecanismo do F1. A revisão visual é passo do João na sessão interativa; a lista das 13
telas foi entregue a ele em chat, não através de skill.

**Estado: `ready_for_review`.** Este comando não inicia review — a próxima instrução do João aciona
a revisão do trabalho ativo.

### Extensão — 2026-08-14: foto no header, foto de redator sai de Turma/detalhe

**O bloco já estava `ready_for_review` quando o João pediu, em chat, dois itens novos sobre a mesma
superfície:** foto do usuário logado no header (via `IdentityCell`) e remoção da foto de redatores
em Turma/detalhe da turma. Decisão dele: dobra no MESMO `active_work_item`, estado volta a
`executing` para a extensão e fecha de novo em `ready_for_review` — sem abrir item novo.

**`IdentityCell.tsx` não foi tocado — o João já o tinha editado à mão antes desta sessão** (`<p>` virou
`<span>`, WIP não commitado quando a sessão abriu). A única consequência disso: `IdentityCell.test.tsx`
estava quebrado (3 testes contando `<p>`, que não existe mais), achado no gate desta extensão e não
por ele. Corrigido só o teste, trocando a asserção por `span.truncate` — o contrato real que o
próprio componente documenta ("a forma empilhada trunca; a inline não"), não a tag incidental.

**Foto no header exigiu DTO novo, não só JSX.** `SessionUserData` (`/login` e `/me`) não carregava
`photo_url` — medido antes de mexer no front, não assumido. Campo acrescentado no mesmo molde de
`UserData::$photo_url` (`#[WithTransformer(SignedUrlTransformer::class, 60)]`, `fromModel` lendo
`$user->photo_path`), `typescript:transform` reexecutado, diff de `generated.ts` de uma linha só.
`UserMenu.tsx` ganhou `image={user.photo_url}` no `AppAvatar` já existente.

**`IdentityCell` NÃO entrou no header, por decisão do João contra a leitura literal do pedido.**
O trigger do `UserMenu` tem desenho específico documentado no próprio arquivo — avatar `aria-hidden`
(nome acessível vem do texto), texto colapsa por `sr-only` abaixo de `sm` (UI-04 do review de
2026-08-12, chevron cortava a 320px), branco cravado (D-P13, a navy é fixa nos dois temas).
`IdentityCell` empacota avatar+texto num bloco só, sem gancho pra isolar só o texto do colapso — usá-lo
ali regrediria o UI-04. Escalado, e o João escolheu manter o `AppAvatar` com a foto encaixada, sem
importar `IdentityCell` no header.

**Redator sai de 2 sítios, os outros 11 já estavam certos — medido, não author.** Grep de
`image={.*photo_url}` em todo `IdentityCell` do repo antes de editar: 3 sítios de Turma mostravam foto
de redator (`RedatorDesignation.tsx:37,72`, `TurmasTable.tsx:106`), removida a prop `image` dos três
(cai no fallback de iniciais do `AppAvatar`, sem tocar `IdentityCell`). Os sítios de aluno em
Certificados e no detalhe da turma (`EnrollmentTable`, `EmissionStudentsTable`, `HistorialTable`) **já
não passavam `image`** — commit `9e3a68e` desta mesma branch já fechou isso. `client_photo_url` em
`TurmasTable`/`TurmaDetailPage` fica — é cliente, fora do pedido.

**Gate reproduzido depois da extensão:** backend 592 passed / 5 skipped (2154 asserções, mesma
contagem — a extensão não muda regra de negócio, só projeta um campo já resolvido);
`pnpm build`/`pnpm lint`/`pnpm test` os três exit 0, **171 testes** (mesma contagem da Task 12 — a
correção do `IdentityCell.test.tsx` troca asserção, não adiciona/remove teste); `typescript:transform`
reexecutado de novo ao final, diff vazio.

**O que esta extensão NÃO provou, sem maquiagem:** a foto aparecendo de fato no header não foi vista
no navegador. `:5173`/`:8080` seguem ocupados pelo stack do main tree (mesma causa registrada acima
para os 13 sítios da Task 12); um nginx+`pnpm dev` avulsos em portas alternativas (`8081`/`5174`),
ligados só a este container via `fix-frontend_default`, chegaram a subir para o teste de rota
(HTTP 200 confirmado) e foram desmontados em seguida sem login nem screenshot — checagem visual seguiu
fora do escopo desta sessão, pelo mesmo motivo que já vale pro resto do bloco (`/lotus-ui-review` é
`disable-model-invocation: true`, passo do João).

**Estado: `ready_for_review`.** Mesma regra da Task 12 — este comando não inicia review.

### Correção de rumo — 2026-08-14: "não exibe foto" era BUG, não pedido — foto entra em todos os sítios

**A extensão acima leu o pedido ao contrário, e o João corrigiu em chat.** A frase "em turma,
certificados e detalhes da turma não exibe foto de redatores, alunos" era RELATO de defeito, não
pedido de remoção. Instrução corrigida: a foto deve aparecer **em todos os sítios que chamam
`IdentityCell`** — redator e aluno inclusos — e no header. A remoção da subseção anterior foi
desfeita e a direção invertida.

**Causa raiz de "nunca apareceu, nem na 1ª nem na 2ª execução": stack misto — medido, não
teorizado.** O `pnpm dev` em `:5173` é DESTA worktree (`/proc/<pid>/cwd` conferido), mas
`VITE_API_URL` apontava `:8080` = nginx do MAIN tree = backend da branch do BD-6, **sem nenhum DTO
alargado desta branch**. Todo `photo_url` que o front pedia chegava `undefined`; o header idem
(`SessionUserData.photo_url` só existe aqui). Defeito latente adicional: o `backend/.env` desta
worktree assinava URL pública contra `localhost:9002`, porta sem listener nenhum (o MinIO
compartilhado publica `9000`) — mesmo com backend certo, a foto morreria no `onImageError`.

**Código (commitável):** `image` restaurado nos 3 sítios de redator (`RedatorDesignation.tsx` ×2,
`TurmasTable.tsx`); `EnrollmentData::photo_url`, `EmissionPanelEnrollmentData::student_photo_url` e
`CertificateData::aluno_photo_url` criados no molde do `StudentData` (`#[Computed]` +
`SignedUrlTransformer`), com os 3 sítios de aluno consumindo (`EnrollmentTable`,
`EmissionStudentsTable`, `HistorialTable`). No `CertificateData` a foto é VIVA e deliberadamente
fora do snapshot — a decisão de auditoria do `9e3a68e` ("snapshot não se ilustra com dado mutável")
foi revertida por instrução explícita do João **para a listagem**; PDF e rota pública do QR seguem
só-snapshot. `CertificateController::index` ganhou `with('enrollment.student.user')` (a listagem não
tinha eager load porque só lia snapshot), e o `SoftDeletedRelationProjectionTest` ganhou o caso do
certificado de aluno arquivado, na regra da rule backend-ddd. `generated.ts` regenerado (3 campos
novos); 3 fixtures de teste TS ajustadas no mesmo passo (ADR-04, "quem regenera ajusta consumidor").
O painel de emissão não custa query nova (`withListingData()` já carregava `student.user`).

**Ambiente (não commitável, worktree):** `backend/.env` — `AWS_ENDPOINT_PUBLIC`/`AWS_URL`
`9002→9000`, `FRONTEND_URL` e `SANCTUM_STATEFUL_DOMAINS` ganham `localhost:5173` (o vite real);
`frontend/.env` — `VITE_API_URL` `8080→8081`; container avulso **`fix-frontend-nginx`**
(nginx:alpine, `:8081`) servindo o backend DESTA branch via `fix-frontend-app-1`, que já vivia nas
duas redes (`fix-frontend_default` + `lotus_default`) e por isso usa o MySQL e o MinIO do stack
principal — mesmo banco de dev, mesmas fotos do `DemoPhotosSeeder`. O stack do main tree não foi
tocado; `:8080`/`:5173` seguem dele.

**Gate:** backend **593 passed / 5 skipped (2156 asserções)** — +1 teste, o caso novo de
soft-delete; Pint passed nos 4 PHP; front `build`/`lint`/`test` verdes, **171 testes** (fixtures
mudaram, contagem não).

**Provado por request real, não só por suite:** login curl `admin@lotus.cl` em `:8081` →
`/api/me` 200 com `photo_url` assinada contra `localhost:9000` → `curl` da própria URL = **200
`image/png` (1,87 MB)**; `/api/turmas` = 6 turmas, 6 com `redatores[0].photo_url` assinada;
`/api/certificates` = 5 linhas, `aluno_photo_url` em 3 (o seed é "um sim, um não" — as outras 2
caem nas iniciais, que é o ramo correto); CORS respondendo
`Access-Control-Allow-Origin: http://localhost:5173` + credentials.

**NÃO provado: o pixel no navegador** — `/lotus-ui-review` segue sendo passo do João. O vite
reinicia sozinho ao detectar o `.env` novo; se a aba ainda apontar `:8080`, reiniciar o `pnpm dev`
e relogar (a sessão anterior era do backend do main tree).

**Estado: `ready_for_review`.** Mesma regra de sempre — review só quando o João acionar.

### Review — 2026-08-14: risco ALTO, duas lentes, 9 achados

`/revisar-sprint` abriu em `ready_for_review`, transicionou a `reviewing` e classificou o bloco
como **ALTO risco** pelo gatilho binário do projeto: `generated.ts` regenerado (lei §5.3), DTO de
documento legal alargado (`CertificateData`) e Tasks 1/2/11 com `executor: codex`. Por isso a
revisão do Codex read-only rodou como segunda lente, sobre o intervalo `0a1439f..840edf0`.

**Os gates do bloco foram REPRODUZIDOS aqui, não herdados:** backend **593 passed / 5 skipped
(2156 asserções)**; `pnpm lint` exit 0; `pnpm test` **33 arquivos / 171 testes**;
`typescript:transform` reexecutado devolve `generated.ts` sem diff; `grep text-gray-` zero;
`CATRACA_COR` com 4 linhas; `AppAvatar` fora de `shared/ui` só em `UserMenu.tsx`. Nenhum órfão.

**Dois 🔴, e os dois são o mesmo tipo de defeito — texto afirmando o que o código não faz:**
o comentário do `HistorialTable.tsx:54-57` diz "SEM `image`, e isto é decisão de auditoria" três
linhas acima de `image={c.aluno_photo_url}` (a reversão do João está no `state.md`, mas a spec §D4 e
o comentário seguem dizendo o contrário); e o `IdentityCell` perdeu o `min-w-0` que o plano
escrevia, o que deixa o `truncate` inerte nos 13 sítios — com o teste verde, porque ele conta a
classe `.truncate` em vez de medir o comportamento (lição 10, cobertura fantasma).

**A segunda lente achou um que a primeira não tinha, e ele foi verificado no código antes de
entrar:** o `SignedUrlPropertyReadTest` varre `app/` por `->photo_url` e `->download_url`, e os três
campos novos do bloco (`client_photo_url`, `student_photo_url`, `aluno_photo_url`) **escapam da
regex pelo prefixo** — a guarda existe e não cobre o que o bloco criou.

**Um achado do Codex foi medido e reprovou, e não entra como ele o escreveu:** o
`DemoPhotosSeeder` "sem guarda de ambiente" já é barrado em produção pelo `ConfirmableTrait` do
`db:seed`, que exige `--force`. Fica como 🟢 de higiene, não como risco de produção.

**Medição própria que desmontou uma suspeita:** os dois campos de foto aninhados em `array` sem
`#[DataCollectionOf]` (`EmissionPanelEnrollmentData::student_photo_url` e
`EnrollmentData::photo_url`) **voltam assinados** — verificado por tinker contra o banco de dev,
`http://localhost:9000/lotus/user-photos/…`. Não é bug; é lacuna de teste de regressão.

### Triagem do João (2026-08-14): 7 entram, 2 são decisão dele

**Entraram e estão corrigidos** — Q-1, Q-4, Q-5, Q-6, Q-7, Q-8, Q-9:

- **Q-1** — o comentário do `HistorialTable` passou a descrever a reversão, e a spec §D4 ganhou a
  nota do que ficou de pé: **o PDF e a rota pública do QR seguem só-snapshot**; a fronteira mudou de
  lugar, não sumiu.
- **Q-4** — a regex da guarda virou `/->\s*\w*(download_url|photo_url)\b/`. Os três campos novos
  passam a ser cobertos e nada de `app/` reprova.
- **Q-5** — a forma inline devolve `<div>`. **Sem mudança visual**: o `flex` já cravava o `display`
  nas duas grafias, e as classes são as mesmas — a troca só corrige `<div>` do avatar dentro de
  fraseado. Teste novo prova o container de fluxo, e reprovou contra o `<span>` antes de entrar.
- **Q-6** — nasceu o `CertificateQueryBuilder` (`LISTING = ['enrollment.student.user']`), com
  `withListingData()` no `index` e `loadListingData()` em `show`/`store`/`revoke`, que
  lazy-loadavam três relações cada. Guarda de runtime em
  `tests/Feature/Certification/CertificateEagerLoadTest.php`, no molde do `ContratanteEagerLoadTest`
  (duas cadeias distintas, `preventLazyLoading`) — **vista vermelha** com o eager load removido.
  O segundo teste do arquivo fecha a lacuna que a própria revisão mediu: `aluno_photo_url` chega
  **assinado** na listagem e no detalhe.
- **Q-7** — `aria-hidden` no avatar da célula: o nome deixa de ser anunciado duas vezes por linha
  nos 13 sítios, de uma linha só. Teste próprio, também visto vermelho antes.
- **Q-8** — `clientName` deriva de `client`; era a mesma varredura escrita duas vezes.
- **Q-9** — o seeder passa a contar quatro números separados (semeadas, já tinham, sem foto por
  propósito, falharam); "total menos semeadas" chamava de proposital quem falhou por rede.

**Não entraram, por decisão do João — as duas são alteração dele, à mão, depois do plano:**

- **Q-2** (`min-w-0` ausente, `truncate` inerte nos 13 sítios) — "deixe como está". Registrado em
  `docs/pendencias.md` (**P-38**) para não voltar como achado novo.
- **Q-3** (grafia diverge do D1: `font-semibold`, `text-sm`, `gap-2`) — "eu que mudei". Registrado
  em `docs/pendencias.md` (**P-39**); o D1 da spec segue com a grafia planejada.

**Gates repetidos depois das correções:** backend **595 passed / 5 skipped (2162 asserções)**;
`pnpm lint` exit 0; `pnpm build` sem erro de tipo; `pnpm test` **33 arquivos / 173 testes**;
`typescript:transform` reexecutado não move `generated.ts`.


### Integração — 2026-08-14: a `main` entra na branch antes do fechamento

**A `main` andou 24 commits desde o `0a1439f` de onde esta branch nasceu**, e dois deles mudam o
chão que o `/fechar-sprint` pisa: o BD-6 mergeado (PR #50) e a **reorganização da pasta de docs**
(PR #51). `docs/pendencias.md` deixou de existir — virou `docs/superpowers/pendencias/` com
`README.md` (índice), `abertas.md` (fichas) e `encerradas.md`; `progress.md` e `progress-archive.md`
desceram para `docs/superpowers/historico/`. O próprio `.claude/skills/fechar-sprint/SKILL.md` foi
reescrito na `main` com os paths novos. Fechar antes de integrar escreveria em dois arquivos mortos,
então a ordem foi **merge primeiro**, por decisão do João (a alternativa, rebase dos 27 commits sobre
a reorg, replayaria o mesmo conflito de `state.md` commit a commit).

**Cinco conflitos, e três eram exatamente os que este arquivo previu em §"Exceção declarada".**
`frontend/src/shared/ui/index.ts` (união: `IdentityCell` + `InlineLoadState`) e
`frontend/src/features/commercial/hooks/useCommercialClients.ts` são as colisões 2 e 1 medidas antes
da promoção paralela; a colisão 3 (os três locales) **auto-mergeou limpo**. Os outros dois são de
documento: `docs/superpowers/backlog.md` e este arquivo.

**O hook resolveu-se pela rule, não pelo meio-termo.** `.claude/rules/frontend-fsliced.md` escreve
que estado de carga de lista **não se deriva à mão na feature** — vem do `useLoadState`. A forma do
BD-6 (`...load`) fica inteira e o Grupo B deste bloco volta por cima dela como `client`, com
`clientName` derivando dele. Medido: `useLoadState` já expõe `isLoading`, `loadError` e `refetch`,
que eram os três campos que a forma antiga montava à mão, então `BudgetsTable` e `BudgetDialog`
seguem compilando sem tocar em consumidor.

**`backlog.md` ficou com o lado da `main` inteiro, e isso já cumpre o passo 9 do gate.** O único
acréscimo desta branch ao arquivo eram as 105 linhas do item 4 (a própria célula de identidade), e a
reorg da `main` já as removeu ao reescrever a fila em Sprint 5/6 + BD-10..BD-15.

**P-38 e P-39 desta branch colidiram de ID e foram renumeradas para P-41 e P-42**, no precedente que
o próprio repositório fixou duas vezes (a segunda `P-30` virou `P-33`; a segunda `P-28` virou
`P-32`): a reorg chegou à `main` primeiro e já usava `P-38`/`P-39` para outras pendências, e vai até
`P-40` — quem renumera é a recém-chegada. As fichas foram portadas para
`docs/superpowers/pendencias/abertas.md` na forma nova, sob `# Travadas em decisão do João`, com o
índice do `README.md` acompanhando.

**O gatilho da P-34 venceu neste bloco e já tem casa: `BD-11`.** Este bloco tocou o shell
(`frontend/src/app/layouts/Header/UserMenu.tsx`, a foto no `UserMenu`), que é o gatilho literal da
pendência. Não foi absorvido — as 3 classes `text-slate-*` vivem em `Sidebar/`, não no Header, e a
reorg da `main` já agrupou P-34 + D-03 no **BD-11 · shell: catraca de cor e navegação no toque**, com
DoD escrito. O gatilho fica cumprido pelo agrupamento, não por alargamento desta sprint.

**A promoção do `dashboard-backend-agregacoes` que veio da `main` NÃO fica de pé neste fechamento**,
por decisão do João: o `workflow_state` vai a `idle` e ele repromove o bloco explicitamente. A
narrativa dela está preservada logo abaixo e a spec, o plano e o Context Packet do dashboard
**continuam no disco, nas pastas ativas** — nada foi arquivado, porque nada foi entregue.

### Fechamento — 2026-08-14

`/fechar-sprint` abriu com `workflow_state: ready_for_closure` e o item batendo. **O gate rodou
inteiro DEPOIS do merge da `main`** (§"Integração" acima), porque a reorg de docs mudou o destino de
dois passos dele — as pendências e o histórico.

**O passo 0 fechou em duas metades, e a segunda não é artefato desta sessão.** A metade de API foi
provada por request real contra o backend DESTA branch (`:8081`, sessão Sanctum, `Origin` +
`Accept`): `/api/me` devolve `photo_url` assinada e o GET da própria URL responde **200 `image/png`,
1.877.301 bytes**; `client_photo_url` em 3 de 6 turmas, `redatores[0].photo_url` em 5 de 6,
`EnrollmentData::photo_url` em 27 de 55 matrículas, `student_photo_url` em 7 de 15 do painel de
emissão e `aluno_photo_url` em 3 de 5 certificados — preenchimento parcial é o "um sim, um não" do
`DemoPhotosSeeder`, e o resto cai nas iniciais, que é o ramo correto. Os **16 call sites** de
`IdentityCell` passam `image`, conferidos um a um. **A metade de pixel veio do João**, que confirmou
a checagem visual em chat; `/lotus-ui-review` não rodou e continua sendo passo dele
(`disable-model-invocation: true`), com a porta 5173 ocupada pelo stack do main tree durante toda a
execução. Fica escrito qual metade tem artefato no repositório e qual não tem.

**Placar do gate, medido pós-merge e não herdado:** backend **595 passed / 5 skipped (2162
asserções)**; `pnpm lint` exit 0; `pnpm build` exit 0; `pnpm test` **36 arquivos / 186 testes**;
Pint `passed` nos 15 `.php` do bloco; `typescript:transform` reexecutado não move `generated.ts`;
zero `.gitkeep` órfão, e os 9 arquivos novos são todos entregável nomeado no plano. Leis §5: zero
import de `primereact` fora de `shared/ui`, zero import cruzado entre features, e o
`CertificateQueryBuilder` é o sétimo `Eloquent\Builder` do padrão — não Repository.

**Docker caiu inteiro no meio da sessão** (`Exited (255)` simultâneo nos sete containers, daemon/WSL)
e o stack foi restaurado com `docker start`, com as duas redes de `fix-frontend-app-1` intactas. A
suíte foi remedida depois da restauração, com o mesmo placar — o número acima é o de depois, não o de
antes.

**Arquivamento e histórico, já no layout novo da `main`:** plano em `plans/archive/`, spec em
`specs/archive/`, com as duas referências dentro deste arquivo atualizadas para os paths movidos. O
Context Packet fica onde está — `context-packets/` não tem convenção de arquivo. A entrega entrou em
`docs/superpowers/historico/progress.md` e a mais antiga das dez (o BD-2, 2026-08-11) desceu
**verbatim** para `historico/progress-archive.md`, mantendo o teto de dez.

**O passo 9 do gate já estava cumprido pela `main`:** a reorg removeu o item 4 de "Próximos blocos"
ao reescrever a fila em Sprint 5/6 + BD-10..BD-15, e nada foi removido daqui.

**A P-26 saiu das encerradas.** Ela fechou na varredura pós-BD-6 com "sai no próximo
`/fechar-sprint`", e este é o próximo; o rastro durável fica em `historico/progress-archive.md` e na
spec arquivada do bloco de 2026-08-04.

**Estado: `idle`, com a promoção do dashboard desfeita por decisão do João.** O `state.md` que veio
da `main` trazia `dashboard-backend-agregacoes` em `ready_for_execution`; a alternativa era preservar
a promoção e mexer só em `last_completed_work_item`, e ele escolheu **fechar a `idle` e repromover
depois**. A spec, o plano e o Context Packet do dashboard **continuam nas pastas ativas** — nada foi
arquivado, porque nada foi entregue —, e a narrativa da promoção segue logo abaixo, intacta.
`state_basis_commit` aponta para `9ed7351`, o merge que integra a entrega; não para o commit deste
fechamento.

## Promoção desfeita no fechamento — `dashboard-backend-agregacoes` (Sprint 5 · Dashboard, bloco 1 de 2)

> **Esta narrativa veio da `main` e está preservada inteira, mas o item NÃO está ativo.** O
> `/fechar-sprint` de 2026-08-14 devolveu o estado a `idle` por decisão do João, e a repromoção é
> instrução explícita dele — a spec, o plano e o Context Packet citados abaixo continuam no disco,
> nas pastas ativas. O texto seguinte descreve a promoção como ela foi escrita, não o estado atual.

### Seleção — 2026-08-14

**Primeiro bloco da Sprint 5 (`backlog.md:39`), promovido explicitamente pelo João** com o estado em
`idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre: o
argumento era **título de seção** (`## Sprint 5 · Dashboard`), não slug promovido. As duas decisões
dele fecharam o gate: o slug `dashboard-backend-agregacoes` (a ordem escrita do backlog — backend
antes do frontend); e a **rota `context_required`**, exatamente como o backlog exige para a Sprint 5.

**Aqui a fonte externa EXISTE declarada — o oposto dos BDs:** o backlog aponta o escopo canônico no
Drive (`Planejamento/dashboard-escopo-funcional-analitico.md`) e a execução detalhada no Notion
(EAP 8.4.0–8.4.7). Nenhuma rota direta a `ready_for_planning` se aplica; o Context Packet do Codex
(`lotus-context-packet`, read-only) vem antes de qualquer brainstorming.

**`state_basis_commit` passa de `2511501` a `1e40acb`** — o merge do PR #51, HEAD atual da `main`.
Não era divergência: com `active_work_item` `null` não havia trabalho ativo cujo baseline pudesse
ter derivado.

**Árvore ainda não decidida:** bloco de backend assume main tree pela P-03; branch nasce no
planejamento/execução, não nesta promoção. O packet é gerado sobre `main@1e40acb`.

### Context Packet — 2026-08-14

Gerado pelo Codex (`lotus-context-packet`, sandbox read-only, sobre `a3833e0`) e validado contra o
contrato da skill: markers exatos, frontmatter completo (`plan`/`spec` `null` registrados, não
inventados), **8 key facts**, fontes por ID, `status: ready`,
`RECOMMENDED_TRANSITION: ready_for_planning`. Salvo em
`docs/superpowers/context-packets/2026-08-14-dashboard-backend-agregacoes.md`.

**As duas fontes canônicas foram recuperadas, não presumidas:** o Drive
(`dashboard-escopo-funcional-analitico.md`, ID `1HlT8kUsnoGsRJpYmryHacZ8zBZnDQgRa`) e as oito tasks
EAP 8.4.0–8.4.7 na base canônica do Notion, endereçadas por ID de página — a lição das 12 falsas
divergências de 2026-07-30 aplicada.

**Uma divergência externa foi achada e reconciliada com base declarada, não em silêncio:** as
descrições e critérios de aceite das EAP **8.4.0 e 8.4.7 estão trocados entre si** no Notion (títulos
apontam backend/frontend correto; corpos invertidos). Resolução: o Drive decide o escopo — domínio e
dependências ficam neste bloco, UI review fica no bloco frontend. A correção da troca no Notion é
staleness trigger do packet.

**O que o packet fixa para o desenho:** domínio `App\Domains\Dashboard` read-only **sem** Model,
migration ou tabela; `GET /api/dashboard/metricas`; ownership e filtros aplicados **antes** da
agregação no backend (nada de payload administrativo ocultado no React); sequência backend
EAP 8.4.0→8.4.1→8.4.2→8.4.3→8.4.6; Notifications fora. Open questions não bloqueantes (semântica dos
KPIs, filtros MVP, ranking do Redator) vão para o brainstorming.

**Estado: `ready_for_planning`.** Próxima ação: `/planejar-bloco` prossegue para `planning`
(brainstorming → spec → plano).

### Brainstorming e spec — 2026-08-14

Spec em `docs/superpowers/specs/2026-08-14-dashboard-backend-agregacoes-design.md`, com **nove
decisões**: D1–D6 escolhidas pelo João entre alternativas com o custo declarado (recorte analítico
sem tempos de ciclo; sem ranking de redatores nem séries próprias do Redator; filtro só de período;
janelas 7d/30d; **dois DTOs raiz num endpoint só** — vazamento de payload vira erro de tipo, não bug
de runtime; certificado revogado não devolve a matrícula a "a emitir"), D7–D9 derivadas e declaradas
(sem permissão `dashboard.*` nova — view por `type`, seções por permissão existente com `null`
tipado; regra de domínio reusada de `TurmaHabilitacaoService`/`BudgetSummaryService`, nunca
duplicada; agregação por query, sem cache).

**Três medições entraram na spec, não em memória:** o catálogo RBAC real (33 permissões, redator só
com `operation.turma.view`/`submit_docs`/feedback) sustenta a D7; `certificates` **não tem coluna de
data de emissão** — `created_at` é a data do ato, não proxy, e foi isso que expôs a ambiguidade do
revogado que virou a D6; e o funil do Drive §3.4 tem sete rótulos com dois sobrepostos ("concluída"
× "a emitir") — a spec fixa **seis baldes exclusivos** com o split por estado de emissão declarado.

**Risco de review declarado ALTO** pelo gate binário (regenera `generated.ts`; eixo central é
RBAC/ownership) — duas lentes no `/revisar-sprint`. O `der-fisico.md` listando `certificates` como
"planejada" é divergência preexistente, registrada na §10 da spec para o fechamento.

O estado entra em `planning` no commit da spec; `active_plan` segue `null` até o João ler a spec
escrita e autorizar o `writing-plans`.

### Plano — 2026-08-14

**O João aprovou a spec e cravou execução MESCLADA claude/codex** ("delegue tarefas de backend ao
codex, mesclando entre você e ele"). O plano saiu em
`docs/superpowers/plans/2026-08-14-dashboard-backend-agregacoes.md`: **oito tasks**, uma por commit,
na ordem contrato → queries por área (Operation, Commercial, Certification/Analytics) → ownership do
Redator → assemblers/endpoint/gates → feature tests do endpoint → gate final e2e.

**O handoff estende o contrato do comando por instrução explícita dele:** `executor: misto`, task a
task — **codex nas Tasks 2, 3 e 4** (queries mecânicas com contrato fechado na Task 1, verificação
executável e `paths_autorizados` de globs exatos, incluindo o `DomainDependencyTest` restrito à
chave `'Dashboard'`); **claude nas Tasks 1, 5, 6, 7 e 8** (contrato/`generated.ts` §5.3, ownership
do Redator, gates RBAC por seção, classificação do pipeline, gate final). Task de codex só fecha
depois de revisão do claude; violação de path reprova a task.

**Três coisas apareceram só ao escrever o plano:**

1. **D-P1** — agrupar série por mês em SQL diverge entre engines (a suíte roda sqlite, sem
   `DATE_FORMAT`): o bucketing `YYYY-MM` vai para PHP sobre projeção mínima, exceção declarada à
   D9; contagens e somas de KPI seguem 100% em SQL.
2. **`Enrollment` não tem relação com `Certificate`** — o vínculo é unidirecional
   (`certificates.enrollment_id`). O "sem certificado" da D6 sai por `whereNotIn` sobre subselect,
   sem criar relação nova em model de outro domínio.
3. **O self-review achou dois órfãos de spec antes de commitar:** ninguém produzia
   `RedatorLoadData` (seção `redatores` da D2 — nasceu o `RedatorLoadQuery` na Task 6) e o alerta
   `TurmaOverdue` não tinha dono declarado (composição no `AdminDashboardAssembler`, registrada no
   plano).

**Baseline declarado:** backend `591 passed, 5 skipped`; frontend 35 arquivos / 176 testes.
Projeção: +~24 testes backend, frontend inalterado (nenhum consumidor novo do `generated.ts`).

**Estado: `ready_for_execution`.** `/executar-bloco dashboard-backend-agregacoes` exige instrução
posterior do João. Branch `feat/dashboard-backend-agregacoes` nasce no `/executar-bloco` (main
tree, P-03).

## Penúltimo item fechado — 2026-08-14 (`falha-vs-lista-vazia`, BD-6)

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

Spec em `docs/superpowers/specs/archive/2026-08-14-falha-vs-lista-vazia-design.md`, com **nove decisões**
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
`docs/superpowers/plans/archive/2026-08-14-falha-vs-lista-vazia.md`: **seis tasks**, uma por commit, na ordem
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

### Execução — 2026-08-14: fechamento

As seis tasks do plano completaram via `subagent-driven-development` — implementador + revisor por
task, todas **Approved** sem achado Critical/Important (só Minor, cada um julgado e registrado em
`.superpowers/sdd/progress.md`). Suíte final **35 arquivos / 174 testes**, `pnpm lint`/`pnpm build`
verdes, `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts` vazio
(lei §5.3 e P-03 fora de escopo, medidos).

**Task 6 (gate final) mediu a spec §7 ponta a ponta contra a stack real** — sonda nos três testes
novos nos dois sentidos (planta, confirma por grep, reprova nomeado, restaura), Playwright CLI com
`--browser chromium` (canal `chrome` do playwright-cli tentava Chrome de sistema, ausente; o binário
Chromium empacotado do Playwright resolveu sem instalar nada), falha real de `/api/courses` e
`/api/clients` provocada via patch de XHR e medida nos dois sítios de cada vez, catálogo vazio de
verdade provado e distinguido da falha via soft-delete com restauração (`vivos=4 trashed=0` antes e
depois), e a aditividade das quatro chaves novas de `useCommercialClients` confirmada ao vivo contra
o consumidor antigo (`BudgetsTable`) sem tocá-lo. Evidência completa por step em
`.superpowers/sdd/progress.md`, entrada "Task 6 — GATE FINAL".

**Revisão final de branch** (modelo opus, base `0a1439f`, head `d20bebc`): zero achado Critical.
Um Important, não-código — este `state.md` preso em `executing`, que esta própria transição fecha.
Sete achados Minor, nenhum bloqueante, todos registrados em `.superpowers/sdd/progress.md` (um é
observação sobre a spec, não sobre a implementação segui-la; um é a pendência P-37 ganhando um
segundo sítio já mapeado; um é dívida documental preexistente em `frontend-fsliced.md`; os demais são
follow-up de escopo explicitamente fora deste bloco). **Ready to merge: With fixes** — o único fix é
esta transição.

Working tree e commits conferem com o plano: seis commits de implementação
(`f64ba33`..`d20bebc`), `git status --porcelain` vazio, nenhum artefato de prova ficou no repositório
ou no banco.

**Estado:** `ready_for_review`. Próxima ação: revisão do trabalho ativo, por instrução explícita do
João — não iniciada automaticamente aqui.

### Review de sprint — 2026-08-14: BAIXO risco, duas lentes, 5 achados (3+1+1)

**BAIXO pelo gate binário da skill:** zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal gerado; `executor: claude`. A spec §9 declara o mesmo BAIXO —
sem divergência a mostrar. **Só lente Claude, sem Codex.**

**Gate reproduzido, não herdado do relatório de execução:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **35 arquivos / 174 testes** — exatamente a projeção do plano (+3 arquivos, +11 casos
sobre 32/163); `git diff --name-only 0a1439f..HEAD -- backend/ generated.ts` com **zero arquivo**,
o que mantém backend/Pint/`typescript:transform` N/A por escopo medido; zero import de `primereact`
e zero import cruzado `@features/*` dentro de `src/features` (§5.6, por busca); `CourseStep` em 94
linhas, abaixo da régua de 150.

**Órfãos: zero.** `InlineLoadState` tem 3 consumidores mais o barrel; toda chave nova dos três hooks
tem leitor (`isEmpty`/`noResults` no `CourseStep`, `isError`/`errorDetail`/`refetch` na `QuotesList`,
`unusable`/`showEmptyHint` no `BudgetDialog`); `budget.noClientsAvailable` é lida pelo
`BudgetDialog` e coberta pelo `parity.test`; `dangerText` e `AppButton` continuam vivos depois de
saírem do `StudentClientField`.

**Duas afirmações da spec foram verificadas no código, não aceitas do relatório:** o `edit` do
`BudgetDialog` é mesmo inalcançável sob falha de clientes — o segundo call site
(`CommercialPage.tsx:66`) só produz `create`, porque a `BudgetsTable` navega para o detalhe em vez de
abrir diálogo, e o detalhe reprova a página inteira; e `common.noResults` **tem** o `{{term}}` nos
três locales, então a interpolação do ramo 4 não é decorativa.

**A premissa central do Q-1 foi medida por sonda, não assumida:** `renderHook` com `queryFn` que
resolve e depois rejeita, `retry: false` — o refetch falho deixa `isError === true` **com `data`
ainda definido**. A sonda rodou como arquivo temporário sob `src/` e foi removida; árvore limpa.

**Os três achados:**

1. **Q-1 🟡 P** — `isError` cru ignora o cache, nos dois sítios que compartilham a mesma query
   `['courses','list']`. `CourseStep.tsx:36-49` troca a lista inteira pelo `AppErrorState` mesmo com
   `courses.list` populado; `QuotesList.tsx:33-38` anuncia falha mesmo com todo nome resolvido do
   cache. O caminho é reentrada normal, não hipótese: `staleTime` é 0, então abrir o wizard sobre a
   `QuotesList` refaz o GET, e um refetch falho apaga uma lista utilizável e o termo digitado. É o
   inverso da própria D3 do bloco ("não travar com lista utilizável em cache", precedente `03280c6`)
   e, na `QuotesList`, a tela afirma falha que não se vê — a tese do próprio bloco.
2. **Q-2 🟡 M** — a derivação de load-state foi duplicada, não extraída: `isError`/`errorDetail`/
   `refetch` em **6** hooks, o predicado de vazio **verbatim** em 3
   (`!isError && isSuccess && length === 0`), e `errorDetail ?? t('common.loadErrorHint')` em **6**
   call sites — com dois nomes para o mesmo predicado (`isEmpty` × `showEmptyHint`). O bloco extraiu
   a **view** (D4, precedente `mergePt`) e replicou a **fonte**.
3. **Q-3 🟢 P** — `BudgetDialog.tsx:63` desabilita o dropdown por `unusable`, que também é verdadeiro
   **durante o carregamento**, e o `InlineLoadState` não fala nesse estado: controle morto e mudo,
   enquanto o `CourseStep` do mesmo bloco mostra esqueleto para o mesmo estado. `isLoading` já existe
   no hook e não é consumido ali.

**O que NÃO virou achado, e por quê:** as duas utilities de cor grandfathered do `CourseStep` estão
declaradas fora de escopo no plano; o segundo sítio do `<label>` sem `htmlFor` é a **P-37**, já
registrada; a duplicação estrutural dos dois ramos do `InlineLoadState` é desenho explícito da
spec §4; e o ramo "os dois juntos" ser inalcançável é contrato defensivo, não teste falso.

**Duas divergências documentais propostas** (registram-se em `docs/pendencias.md` só depois da
aprovação): `.claude/rules/frontend-fsliced.md` ainda diz que teste de componente com PrimeReact em
jsdom fica fora do corte, e a spec §10 repete — este bloco montou três desses; e a P-37 passa a ter
dois sítios (`StaffIdentifyFields` e `BudgetDialog`).

**Veredito: o bloco está bom.** Seis commits, gate reproduzido nos números projetados, nenhuma lei §5
tocada, nenhum órfão. Q-1 é comportamento reincidente (o molde `RedatorCourseSelector` tem a mesma
forma) e candidato a regra, não só a fix; Q-2 é abstração faltando; Q-3 é acabamento.

### Segunda lente — revisão independente do Codex (2026-08-14)

**Pedida pelo João apesar do risco BAIXO**, que não a exigia. Codex rodou read-only sobre
`0a1439f..HEAD`, restrito a `frontend/src/`, com spec, plano, CLAUDE.md §5, a rule da camada e
`docs/pendencias.md` como gabarito. Devolveu 5 achados.

**Três coincidem com a lente Claude** (Q-1 no `CourseStep`, Q-2 na derivação duplicada, Q-3 no
dropdown mudo) — convergência independente: o prompt do Codex não citava achado nenhum do Claude.

**Um achado é só do Codex e foi verificado no código antes de aceito (regra da skill): Q-4** — o
`BudgetDialog` desabilitava o dropdown por `unusable` e **não** passava `disabled` ao `CrudDialog`,
então Criar seguia vivo com o `client_id: 0` do form vazio. Verificação: o gêmeo
`StudentDialog.tsx:57` já faz `disabled={clientsUnusable || busy}`, e o docblock do próprio
`CrudDialog.tsx:23-26` nomeia exatamente este caso ("dependência externa que ainda não carregou,
como a lista de clientes do create de aluno"). Achado real.

**Um achado do Codex é corolário do Q-1 e foi absorvido nele:** `CourseStep.test.tsx:48` força
`list: []` no ramo de falha, então o caso que quebra — `isError` **com** lista populada — não tinha
teste e a regressão passava com a suíte verde.

**Divergência entre as lentes, mostrada ao João em vez de resolvida em silêncio:** o aviso da
`QuotesList` quando o cache resolve todos os nomes. Codex avaliou o sítio como bom (D2 cumprida, as
cotações nunca somem); Claude o leu como falha anunciada e invisível. Eixos diferentes, cada um
correto no seu. **João aprovou os dois lados**: as cotações continuam sempre visíveis **e** o aviso
passou a depender do nome perdido.

### Correções aplicadas — 2026-08-14 (João aprovou tudo)

Cinco commits, um por achado, cada um com o gate verde na árvore do próprio commit (verificado com
`git stash --keep-index`, não só no final):

- `501d98c` **Q-2** — `shared/hooks/useLoadState.ts` centraliza `isLoading`/`isError`/`errorDetail`/
  `loadError`/`isEmpty`/`unusable`/`failedWithoutData`/`refetch`; os 6 hooks passam a espalhá-lo. O
  predicado de vazio fica com **um** nome (`isEmpty`), inclusive na prop do `StudentClientField`.
- `08cb01a` **Q-1** — `CourseStep` troca a tela pelo erro só em `failedWithoutData`; com catálogo em
  cache a falha vira `InlineLoadState` ao lado da lista, que segue utilizável com o termo digitado.
  Entra o teste do ramo COM cache, que faltava.
- `baf08e9` **Q-1b** — `QuotesList` avisa só quando a falha custou um nome (`hasCourse`); mais o
  teste do caso "cache absorveu a falha, nenhum aviso".
- `1ba7dbb` **Q-3** — `loading` + `aria-busy` no dropdown de cliente dos **dois** sítios (orçamento e
  aluno, que compartilham o molde): desabilitado sem sinal era controle morto.
- `4c7b61b` **Q-4** — `disabled={isCreate && clients.unusable}` no `CrudDialog` do `BudgetDialog`.

**Gate final:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **35 arquivos / 176 testes**
(+2 casos de regressão, ambos escritos para falhar no código antigo).

**Documentação (`2511501`):** a **P-38** abre a divergência do corte do runner (a rule diz que teste
de componente PrimeReact em jsdom fica fora, e o corte já tem três); a **P-37** ganha o segundo
sítio (`BudgetDialog`); o padrão reincidente do Q-1 virou **regra** em
`.claude/rules/frontend-fsliced.md` ("o que ramifica a tela é o dado que falta, não o `status` da
query"), e os dois sítios fora de escopo (`RedatorCourseSelector`, `CourseRedatoresSection`) foram
para o `backlog.md` com o fix de uma linha já descrito.

**Estado:** `ready_for_closure`. Nenhum achado aberto, nenhuma correção pendente. O fechamento é
passo explícito do João (`/fechar-sprint`) — não se executa sozinho.

### Fechamento — 2026-08-14

`/fechar-sprint` sem argumento, com o gate de estado conferido antes de qualquer medição
(`ready_for_closure`, `active_work_item: falha-vs-lista-vazia`).

**O item 0 foi REMEDIDO, não herdado — e essa era a única forma honesta:** os cinco commits de
correção (`501d98c`, `08cb01a`, `baf08e9`, `1ba7dbb`, `4c7b61b`) entraram **depois** do e2e da Task 6
e mexeram exatamente na ramificação de falha, então a evidência de `d20bebc` não vale para HEAD.
Sete provas ao vivo, locale es-CL, sessão Sanctum real, falha injetada por patch de `XMLHttpRequest`:
a `QuotesList` sob falha de cursos mantém as **3 cotações visíveis** (120/80/250 UF e status) com
alerta, Reintentar e nomes `—`, e o unpatch + Reintentar resolve os nomes e limpa o alerta; **com
cache quente, zero `[role=alert]`** e nomes renderizados (`baf08e9`); o wizard com cache quente
mantém os 4 cursos selecionáveis com a falha inline (`08cb01a`) e, com cache frio, troca o passo
pelo `AppErrorState` com `Siguiente [disabled]`, recuperando no Reintentar; o `BudgetDialog` sob
falha de clientes mostra motivo + Reintentar, dropdown `p-disabled` com `data-p-disabled="true"` e
**Crear presupuesto `[disabled]`** (Q-4); a `BudgetsTable`, o consumidor **antigo** do mesmo hook,
segue com o estado de erro próprio dela — a aditividade das quatro chaves novas medida ao vivo, sem
tocá-la; e o retrofit de `identity` (Personas → Alumnos) segue com motivo + Reintentar no dropdown
de empresa, liberando o formulário depois do unpatch.

**Dois percalços de método, registrados porque mudaram o resultado:** o patch de XHR foi instalado
**duas vezes** no mesmo contexto, então `window.__unpatch()` descascava uma camada só e o Reintentar
não recuperava — diagnosticado por `XMLHttpRequest.prototype.open.toString()` e resolvido restaurando
o método nativo de um iframe novo (`function open() { [native code] }`); e o `playwright-cli` exige
`--browser chromium` neste host, com o custo de abrir contexto novo e perder a sessão.

**A Prova B ficou de fora e virou pendência, por decisão do João:** esvaziar o catálogo exige
`artisan tinker`, recusado pelo classificador de auto mode, e **não há substituto pela API** (o
índice de cursos não aceita filtro e o wizard filtra client-side, então 200 vazio legítimo só sairia
de um mock — prova mais fraca que a do plano). Ela **rodou na execução**, em `d20bebc`, com
soft-delete e restauração conferida (`vivos=4 trashed=0`); o que falta é a remedição contra HEAD, e o
que a substitui é leitura de código — o predicado mudou de casa sem mudar de forma
(`useLoadState.ts:32`) e o ramo `if (courses.isEmpty)` do `CourseStep` está byte a byte igual ao
medido, porque o que os commits trocaram foi o gate ANTERIOR, que não dispara sem erro. Virou a
**P-40**, com o gatilho escrito.

**Ferramentas:** backend **591 passed, 5 skipped (2149 assertions)**; `pnpm lint` exit 0,
`pnpm build` verde, `pnpm test` **35 arquivos / 176 testes**. **Pint e `typescript:transform` N/A por
escopo medido** — dos 29 arquivos do diff, **zero** `.php` e `generated.ts` intocado. Zero código
morto (os oito artefatos do bloco têm consumidor), zero import de `primereact` em `features/`, zero
import cruzado `@features/*`, `shared/` sem importar feature — leis §5 limpas.

**Pendências:** nasce a **P-39** (o plano afirma que `GET /api/courses` só tem `auth:sanctum`, e o
`CourseController:19` declara `permission:catalog.course.view` — nenhuma prova cai por isso, porque
403 e rota inexistente entram no mesmo ramo do frontend, mas a premissa escrita fica errada) e a
**P-40** acima. Plano e spec **não** foram retro-editados: precedente da P-27, história de bloco
fechado não se reescreve.

**Arquivamento e histórico:** plano e spec foram para `plans/archive/` e `specs/archive/` por
`git mv`, com as referências repontadas em `pendencias.md` e neste arquivo; a linha do BD-6 entrou em
`progress.md` e a mais antiga das dez (`2026-08-11 · Hardening · guardas que faltam`) desceu
**verbatim** para `progress-archive.md`, na forma de cinco colunas que a P-23 registra. O **BD-6 e o
débito B-7** saíram do `backlog.md` — a fila de dívida agora está vazia nos dois lados, backend e
frontend —, e **nada foi promovido no lugar**.

**Estado: `idle`.** `state_basis_commit` segue em `2511501`, o commit que prova a entrega; a próxima
ação é escolha explícita do João no `backlog.md`.

## Antepenúltimo item fechado — 2026-08-13 (`login-fora-do-adr16`, item 4 de "Próximos blocos")

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

## Item fechado anterior — 2026-08-13 (`usecrudform-mais-fundo`, BD-5)

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
