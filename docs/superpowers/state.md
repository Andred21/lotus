---
schema_version: 1
active_feature: operation
active_work_item: abstracao-componentes-operation
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
active_spec: docs/superpowers/specs/2026-08-02-abstracao-componentes-operation-design.md
active_plan: docs/superpowers/plans/2026-08-02-abstracao-componentes-operation.md
context_packet: null
blocker: null
resume_state: null
last_completed_work_item: abstracao-componentes-redator
state_basis_commit: 2b95687
updated_at: 2026-08-02T21:15:00-03:00
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

## Estado atual — `ready_for_closure`

`abstracao-componentes-operation` — item 4 do `backlog.md`, selecionado explicitamente pelo João em
2026-08-02 ao invocar `/planejar-bloco` com o título do item. Saída do `/revisar-frontend` de
`features/operation` da mesma sessão: 3 achados C (violam a rule `frontend-fsliced.md`) + 3 B, lei
§6 limpa. Spec aprovada (D1–D11) e plano executado em 10 tasks via `/executar-bloco` +
`executing-plans` inline (`executor: claude` — sem task delegada ao Codex, frontend sem test
runner, DoD é comportamento idêntico provado na tela).

**Sem context packet** (`context_packet: null`): a fonte foi o código de
`frontend/src/features/operation/` e o relatório do `/revisar-frontend` da mesma sessão.

**Escopo entregue (6 achados fechados).** `useTableFilter` (`shared/hooks`) ganha `searchable`
opcional — os 7 consumidores antigos não mudaram uma linha (D4), prova por diff vazio; a aba
Alumnos (`EnrollmentTable`) vira o 8º consumidor e perde o `useState`/clamp/`onPage` copiados à mão
(C-2). A query do curso desce de `TurmaConfigCard` para `useTurmaConfigForm`, que expõe
`workloadHours` (C-1, mesmo achado do Q-4 do bloco anterior). `useImportStudentsFlow` novo absorve
mutation/`result`/`sizeError`/`close` do `ImportDialog` (C-3, molde `useEnrollStudentFlow`). O
ternário de 4 níveis do picker de redator vira `PickerBody` com guardas sequenciais erro > loading >
vazio > lista (B-1, mesma lição do Q-2/`SlotBody` do bloco anterior). `useTurmaManualOpener` novo
absorve mutation do blob, refs de objectURL/aba e cleanup de unmount do `ManualButton` (B-2). O
handler de upload de 13 linhas do `DocumentTypeCard` sobe para `handleUpload` acima do `return`,
sem hook — estado local que não cruza componente (B-3, D8).

Branch `refactor/abstracao-componentes-operation` a partir do `main` (D2, sem worktree — bloco toca
`shared/hooks/useTableFilter.ts`, e o DoD se prova na tela contra o `docker compose` do main tree),
7 commits de conteúdo (`7c25a47`..`2b95687`).

**Prova visual em 2 checkpoints (D11), sem baseline capturada** (mesma limitação do bloco anterior —
sem ferramenta de browser/screenshot na sessão): **CP-1** (depois das Tasks 1–4) — carga horária em
Configuración, paginação/clamp de Alumnos, diálogo de import nos 3 casos — **aprovado pelo João em
2026-08-02**. **CP-2** (depois das Tasks 6–8) — os 4 estados do picker de Redator (erro/loading/
vazio/lista), upload/remoção/Manual em Documentación — **aprovado pelo João em 2026-08-02**.

**Gate automatizado (Task 10):** `git diff --name-only main...HEAD -- backend/` vazio (D1, bloco
100% frontend); `git diff --name-only main...HEAD -- frontend/src/shared/config/locales/` vazio
(D10, zero chave i18n nova); `git diff --stat main...HEAD -- frontend/src/features/catalog/
frontend/src/features/commercial/ frontend/src/features/identity/` vazio e `TurmasTable` fora do
diff (D4, os 7 consumidores antigos de `useTableFilter` intocados); grep de
`use(Query|Mutation)\b|Api\.useList` em `features/operation/components/` sem saída; grep de
`useState(0)` devolve só `TurmaDetailPage.tsx` (índice de aba, não paginação); greps da lei §6
(`primereact` direto, import cross-feature) limpos; `pnpm build` + `pnpm lint` verdes; suíte backend
**372 passed (1360 assertions)**, igual à baseline — sem regressão.

**Review em 2026-08-02 (`/revisar-sprint`, baixo risco — 100% frontend, sem schema/auth/RBAC/
`generated.ts`/dinheiro, `executor: claude`; só lente Claude, sem Codex).** Órfãos: nenhum (cada
hook novo com exatamente 1 consumidor). Leis §5: sem violação. Conferidos linha a linha contra o
`main`: retrocompatibilidade do `useTableFilter` (com `searchable` presente o caminho é idêntico;
ausente com termo não-vazio degrada para `rows = scoped` e **não** estoura); `rows === enrollments`
por referência no `EnrollmentTable`, com clamp e `onPage` idênticos aos apagados; markup de
`PickerBody`/`ManualButton`/`handleUpload` como cópia literal. A única condicional que mudou de
forma — `course ? …` → `f.workloadHours != null ? …` — foi checada nos 4 casos: `workload_hours: 0`
segue renderizando "0 horas" (o `??` não coage zero, o `!= null` não o rejeita) e curso não
resolvido segue `—`; o único caso divergente é inalcançável (`workload_hours` é `number` não-nulo em
`generated.ts:57`) e vai na direção conservadora. Descartado antes de virar achado: expor
`setSizeError` cru do `useImportStudentsFlow` **segue** o molde declarado — `useEnrollStudentFlow`
já expõe `setRut`.

**1 achado, aprovado pelo João e resolvido na mesma sessão — e não era defeito deste diff:**

- **Q-1 🟡** "query em componente de feature" é **padrão reincidente em 2 sprints** (Q-4 do
  `abstracao-componentes-redator`/`RedatorCourseSelector`; C-1 deste bloco/`TurmaConfigCard`) e
  sobrevivia em **7 pontos** de `catalog`/`commercial`/`identity`. A rule existia, mas era parágrafo,
  e o grep do DoD era por-pasta — só provava a feature recém-limpa. Pela cláusula de reincidência do
  `/revisar-sprint` + lição 14, virou **mecanismo**: `no-restricted-syntax` em `eslint.config.js`
  sobre `src/features/*/components/**`, reprovando `xxxApi.useAlgo()` e `useQuery`/`useMutation`
  diretos. **Provado nos dois sentidos** (lição 10): dispara no violador real (`QuoteWizard.tsx:20`
  e `QuotesList.tsx:23`, des-ignorados temporariamente) e **não** dispara no `useMutationErrors` da
  linha 28 do mesmo arquivo — o falso positivo que o `\b` do grep original protegia, aqui protegido
  pelo `$` da regex. Entrou com **catraca**: os 7 legados em `ignores`, lista que só encolhe, para o
  `pnpm lint` não quebrar na hora. Texto correspondente na `.claude/rules/frontend-fsliced.md`; o
  esvaziamento da lista é o **item 5 do `backlog.md`**, bloco próprio.

**Revalidação pós-correção:** `pnpm build` + `pnpm lint` verdes; DoD 6–11 reconferidos e intactos —
`backend/` e locales sem diff, as 3 features consumidoras de `useTableFilter` ainda com diff
**zero** (as correções tocaram só `eslint.config.js`, `.claude/rules/` e `docs/`), greps de
query-em-componente, `primereact` direto e cross-feature limpos, `useState(0)` só no
`TurmaDetailPage` (índice de aba).

Próxima ação: `/fechar-sprint`. **Nota para o fechamento:** o item 4 do `backlog.md` descreve o C-2
como "`searchable` aceita `() => []`" — desenho que a spec D4 depois rejeitou em favor do parâmetro
opcional. O fechamento remove esse item, o que já resolve; não deixar o texto sobreviver como está
(lição 13).

## Último item fechado — 2026-08-02

`abstracao-componentes-redator` — item 4 do `backlog.md`, selecionado explicitamente pelo João em
2026-08-02 depois do `/revisar-frontend` de `features/identity`. Spec aprovada (D1–D12) e plano
executado em 11 tasks (Task 0 branch/desvio + Task 1 baseline + 8 de conteúdo + Task 10 gate). Sem
context packet: a fonte foi o código e o relatório do review da mesma sessão.

Branch `refactor/abstracao-componentes-redator` a partir do `main` (D12, sem worktree), 8 commits
de conteúdo (`16e9cfc`..`fb25084`). `RedatorDialog.tsx` cai de 448 para 183 linhas; três
subcomponentes locais de `identity` (`RedatorIdentityFields`, `RedatorCourseSelector`,
`RedatorDocumentSlot`) e dois primitivos novos em `shared/` (`AppFileActions`, `useFilePreview`)
adotados também por `operation/DocumentTypeCard` e `commercial/FileList`. Mapas de severidade e
`DOC_TYPES` sobem para `shared/lib/redatorStatus.ts` (D8, D9).

**Task 1 (baseline de screenshots, D11) NÃO executada** — decisão do João em 2026-08-02: a sessão
do Claude não tinha ferramenta de browser/screenshot disponível. Nenhum arquivo salvo em
`docs/superpowers/audits/`. As verificações "conferir na tela" por task também não rodaram durante
a execução; a única prova visual do bloco foi a comparação ao vivo da Task 10 (Step 6), feita pelo
João sem baseline capturada antes — **aprovada** ("tudo certo") contra os 11 critérios do §7 da
spec. **Diverge de D11/R8** — risco aceito explicitamente pelo João, registrado no ledger local
(`.superpowers/sdd/progress.md`), não escolhido por heurística do executor.

Gate automatizado (Task 10, Steps 1–3 e 5): `pnpm build` + `pnpm lint` verdes; greps da lei §6
limpos (sem `primereact` direto em `features/`, sem import cruzado `catalog`/`commercial`/
`operation`↔`identity`); `git diff --name-only main...HEAD -- backend/` vazio (D1 preservado,
bloco 100% frontend); nenhum `useState` de preview sobrou em `features/`.

**Review em 2026-08-02 (`/revisar-sprint`, baixo risco — 100% frontend, sem schema/auth/RBAC/
`generated.ts`/dinheiro, `executor: claude`; só lente Claude, sem Codex).** Órfãos: nenhum. Leis §5:
sem violação. `orderKey` do `useEnabledFirstCourses`, ordem dos botões do `edit` (olho → baixar →
substituir → lixeira) e paridade i18n conferidos contra o `main`. **4 achados, todos aprovados pelo
João e corrigidos na mesma sessão:**

- **Q-1 🟡** `canRemove` + `onRemoveDoc` eram par redundante e a asserção `redator!.id!` migrou para
  fora da guarda que a protegia — se `canRemove` virasse permissão, o DELETE de documento sairia com
  `undefined` na URL, falha silenciosa em caminho de peso legal. `canRemove` morreu; `onRemoveDoc` é
  opcional e sua ausência desliga a lixeira (mesmo contrato do `AppFileActions.onRemove`, D3/D4), com
  o id estreitado pelo compilador.
- **Q-2 🟡** `RedatorDocumentSlot` tinha recortado o emaranhado para outro arquivo sem cumprir a D5:
  três `mode === 'x' && (doc ? A : B)` irmãos dentro de um `return`. Agora são guardas sequenciais em
  `SlotBody`, e o bloco "não carregado + upload" — duplicado entre `create` e `edit` — virou
  `EmptySlot`.
- **Q-3 🟢** o `AppFileActions` fixava `aria-label={t('common.delete')}` e apagava o rótulo próprio de
  `operation` (`operation.documents.remove`) — mudança de comportamento fora do declarado no §7 da
  spec, na direção contrária da D10. Prop `removeLabel?` com default `common.delete`.
- **Q-4 🟢** `RedatorCourseSelector` carregava query + derivação (a rule manda ir para hook da
  feature). Extraído `useRedatorCourses`.

Correções em `e5c0f7b`. **Divergência documental (não é achado):** a D2 pedia
`useFilePreview<T extends PreviewableFile>`; o código soltou o constraint para `shared/hooks` não
depender de `shared/ui`, com justificativa no arquivo e sem risco de tipo (quem restringe é o
`AppFilePreviewDialog`). Decisão melhor que a da spec — registrada como **P-25** em `pendencias.md`.

**Gate de fechamento.** Suíte backend 372 passed (1360 assertions) como regressão; `pnpm build` +
`pnpm lint` verdes; `git diff --name-only main...HEAD -- backend/` vazio (D1 preservado); `generated.ts`
sem diff; greps §5.6 sem saída; nenhum órfão; `canRemove` sem resíduo; Pint n/a (zero arquivo de
backend). **Prova visual do João aceita duas vezes** — a segunda porque as correções de Q-1/Q-2
reescreveram o markup do slot (corpo em `SlotBody`/`EmptySlot`, wrapper `div.mt-2`) depois da primeira
aprovação, e sem baseline (D11 não executada) fechar sobre a lembrança da tela anterior seria assinar
o item 0 do gate em falso.

**Decisão que moldou o bloco:** o desenho inicial do review — promover `AppFileList`/`AppDocumentSlot`
a `shared/ui` — foi descartado no brainstorming ao se descobrir que o `D8` da spec de upload
(2026-07-31) já havia avaliado e rejeitado esse mesmo componente, pelo motivo que o contrato
confirmou (~14 props, ~6 só para diferenciar consumidor). O `D8` permanece em vigor; o bloco
compartilha apenas `AppFileActions` + `useFilePreview` e corta o `RedatorDialog` em subcomponentes
locais de `identity`.

Arquivado: `plans/archive/2026-08-02-abstracao-componentes-redator.md` ·
`specs/archive/2026-08-02-abstracao-componentes-redator-design.md` (sem context packet — a fonte foi
o código e o relatório do `/revisar-frontend` da mesma sessão).

**Aberto, registrado, não resolvido:** P-25 (constraint de `useFilePreview`, spec vs. código); a régua
de ~150 linhas do `frontend-fsliced.md` segue não atingida no `RedatorDialog` (189), aceita na spec §8;
o `PersonFields` genérico segue descartado, não reabrir sem motivo novo.

## Penúltimo item fechado — 2026-08-01

`hardening-debitos-integridade` — fatia do item 3 do backlog (Hardening), selecionada explicitamente
pelo João em 2026-08-01 depois de triagem do `backlog.md` §Débitos técnicos e do `pendencias.md`
contra o código real. Spec aprovada (D1–D9) e plano escrito em 8 tasks (7 de conteúdo + gate).
Execução em 2026-08-01 (Tasks 1–8, `subagent-driven-development`, main tree — bloco toca backend,
sem worktree, P-03), com Task 2b fora do plano original (`UpdateRedatorAction` tinha o mesmo bug de
arquivo órfão que a Task 2 fechou, achado no review). Gate provado: suíte 366 passed (1344
assertions, baseline 347/1083), Pint limpo, `generated.ts` sem diff, frontend build+lint verdes,
prova real de duas sessões MySQL confirmando que o lock do Q-5 (D6) serializa de verdade em InnoDB.

**Escopo fechado (6 itens).** Correção e peso legal: (1) arquivo órfão no MinIO em rollback —
`UploadFileAction::execute` gravava no disco antes do insert em `files`; (2) P-24 —
`UserPhotoService::store()` apagava o objeto NOVO se a auditoria lançasse depois do UPDATE já
commitado; (3) Q-5 — `count()`+`delete()` fora de transação em `DeleteClientContactAction` deixava
duas exclusões concorrentes esvaziarem a coleção de contatos. Falha silenciosa: (4)
`ClientContactData.is_primary` com default `false` não-`Optional` rebaixava o principal em silêncio
num PUT parcial; (5) sem check de paridade permissão↔i18n, permissão nova renderizava chave crua no
picker; (6) sem unicidade de `client_addresses.is_primary`, análogo ao gap já fechado nos contatos.

**Review em 2 rodadas (alto risco — `generated.ts` mudou, spec §8 — segunda lente Codex nas duas).**
Rodada 1 (`/revisar-sprint`): 2 achados reais, ambos corrigidos no mesmo dia (commit `ca02c9b`).
**Q-1** — a spec §3 assumia "endereço não tem rota nested hoje" (premissa da decisão de D8 de não
dar `winner` ao `PrimaryAddressService`); falso — `ClientAddressController` (`5bc1d87`, anterior a
este bloco) já expunha `POST /api/clients/{client}/addresses` e `PUT /api/addresses/{address}`
escrevendo direto no Eloquent, ignorando o serviço — dois requests sequenciais deixavam dois
endereços principais, a mesma classe de bug que o bloco existe para fechar. Corrigido com
`CreateClientAddressAction`/`UpdateClientAddressAction` (espelham os de contato) e `winner` novo em
`PrimaryAddressService::ensureSingle()`. **Q-2** — `UploadFileAction::discard()` só capturava
exceção; um `delete()` que devolve `false` sem lançar (mesmo modo silencioso do bug D2, fechado em
`put()`) não gerava warning nenhum; corrigido. Os 6 testes novos foram vistos reprovando contra o
código antigo antes do fix (stash dos 3 arquivos de produção, suíte rodada, 4 testes falharam como
esperado, stash restaurado) — lição 10. Rodada 2 (sobre `ca02c9b`): único achado — `ensureSingle()`
sem `lockForUpdate` no `Client` permite dois principais sob escrita concorrente, em
`PrimaryContactService` **e**, agora simetricamente, em `PrimaryAddressService` — não é regressão
deste commit (mesmo padrão já em produção desde antes do bloco). Registrado como Q-16 em
`backlog.md`, não bloqueou o fechamento (mesma classe de decisão do Q-5: proporcionalidade, ~10
usuários internos).

**Fora do escopo por decisão do João no mesmo dia (execução original):** os débitos de UI (Q-14,
Q-15, CTA duplicado, cor hardcoded nos 6 diálogos), os minors de 5.2a/5.2b e `UserData::fromModel`
chamando `getRoleNames()` duas vezes. Seguem abertas as decisões de Q-6 (idioma canônico das
mensagens), P-20 (`openspout`) e P-21 (`simple-qrcode`).

**Gate de fechamento:** DoD provado contra API real com sessão Sanctum (dois endereços
`is_primary=true` no create deixam só um; POST na rota nested sobre cliente com principal existente
idem — prova ao vivo do fix de Q-1; PUT de contato sem `is_primary` mantém o principal; DELETE do
contato único → `422`). Suíte 372 passed (1360 assertions), Pint limpo, `generated.ts` sem diff,
`pnpm build`+`pnpm lint` verdes. P-24 sai de `pendencias.md`; Q-5 sai de `backlog.md`. Sem context
packet — a fonte é o código, o `backlog.md` e o `pendencias.md`.

Arquivado: `plans/archive/2026-08-01-hardening-debitos-integridade.md` ·
`specs/archive/2026-08-01-hardening-debitos-integridade-design.md`.

**Aberto, registrado, não resolvido:** Q-16 em `backlog.md` (`ensureSingle()` sem lock no `Client`,
`PrimaryContactService`/`PrimaryAddressService`); Q-6, P-20, P-21 em `pendencias.md`/`backlog.md`.

Histórico completo: `docs/superpowers/progress.md`.
