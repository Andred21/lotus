---
schema_version: 1
active_feature: hardening
active_work_item: hardening-debitos-integridade
workflow_state: ready_for_planning
next_owner: claude
next_action: run_planejar_bloco
active_spec: null
active_plan: null
context_packet: null
blocker: null
resume_state: null
last_completed_work_item: cards-relacao-curso-redator
state_basis_commit: 1c80f69
updated_at: 2026-08-01T16:10:00-03:00
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

## Estado atual — `ready_for_planning`

`hardening-debitos-integridade` — fatia do item 3 do backlog (Hardening), selecionada explicitamente
pelo João em 2026-08-01 depois de triagem do `backlog.md` §Débitos técnicos e do `pendencias.md`
contra o código real. Próxima ação: `/planejar-bloco`.

**Escopo fechado (6 itens).** Correção e peso legal:

1. Arquivo órfão no MinIO em rollback — `UploadFileAction::execute` grava no disco antes do insert em
   `files`; `StoreRedatorDocumentAction:24` e `CreateRedatorAction:30` envolvem em `DB::transaction`.
   Rollback deixa binário sem linha, logo sem auditoria e sem rastro.
2. P-24 — `UserPhotoService::store()` apaga o objeto NOVO se a auditoria lançar depois do UPDATE já
   commitado.
3. Q-5 — `DeleteClientContactAction.php:22`: `count()` + `delete()` fora de transação; duas exclusões
   concorrentes esvaziam a coleção.

Falha silenciosa:

4. `ClientContactData.is_primary` com default `false` não-`Optional` — `PUT /api/contacts/{id}` sem o
   campo rebaixa o principal em silêncio.
5. Check de paridade permissão↔i18n — sem ele, permissão nova renderiza chave crua no picker.
6. Unicidade de `client_addresses.is_primary` — toca schema, exige `der-fisico.md`.

**Fora do escopo por decisão do João no mesmo dia:** os débitos de UI (Q-14, Q-15, CTA duplicado,
cor hardcoded nos 6 diálogos), os minors de 5.2a/5.2b e `UserData::fromModel` chamando
`getRoleNames()` duas vezes. Também ficam abertas, sem resolver agora, as decisões de Q-6 (idioma
canônico das mensagens), P-20 (`openspout`) e P-21 (`simple-qrcode`).

Sem context packet: o bloco não depende de Drive, Notion ou Figma — a fonte é o código, o
`backlog.md` e o `pendencias.md`.

## Último item fechado — 2026-08-01

`cards-relacao-curso-redator` — bloco 100% frontend, zero arquivo de `backend/` tocado (D1).
Executado em worktree (`using-git-worktrees` + `subagent-driven-development`), 10 tasks de conteúdo
+ Task 11 (gate). Commits `00381cb`..`8e200b3`.

**Entrega:** substitui as duas representações textuais mais pobres das telas — checkbox+nome em
`RedatorDialog`, `<div>{r.name}</div>` em `CourseDialog` — por `AppSelectableCard` (novo primitivo
em `shared/ui`) com conteúdo de feature: `RedatorCard` (avatar, RUT, tag de idoneidade) em
`catalog`, `CourseCard` (carga horária contratada, contagem de módulos) em `identity`.
`redatorStatus.ts` sobe de `features/identity/lib` para `shared/lib` (D2) — só assim `catalog`
consegue pintar a idoneidade sem importar `identity` (lei §5.6). Botão-olho do `CourseDialog` não
abre `RedatorDialog` direto (importaria outra feature); navega para `/personas?redator=<id>` e
`PeoplePage` resolve o deep link com `openViewById` novo em `useCrudPage`, lendo o parâmetro pelo
padrão "adjust state during render" da casa (nunca `useEffect` com `setState`) — primeiro caso
concreto do FUT-2 registrado no backlog. Ordem dos cursos no `edit` do redator congela na abertura
(`useEnabledFirstCourses`, D9): reordenar a cada toggle faria o card clicado saltar sob o ponteiro.
Falha de GET nas duas seções deixa de se disfarçar de lista vazia (D11) — antes, `?? []` fazia um
403 por falta de `identity.user.view` virar "sem redatores habilitados" num curso que tem três;
agora distingue loading/erro-com-Reintentar/vazio de verdade.

**Achado operacional durante a execução:** o Step 1 da Task 2 tinha um `cd /home/jvbat/projetos/lotus`
absoluto herdado do plano (escrito antes do worktree existir) — o implementador seguiu literalmente
e comitou `redatorStatus` no `main` em vez do worktree. Corrigido por decisão do João: cherry-pick
do commit para o branch do worktree + `git reset --hard` do `main` de volta ao commit do plano
(árvore do main estava limpa, nada perdido). Dispatches seguintes reescreveram os caminhos para o
worktree.

**Review (baixo risco — sem migration/RBAC novo/`generated.ts`, só Claude, sem segunda lente do
Codex):** zero achado sobrevivente. Órfãos: nenhum. i18n paritário nas 3 locales. Greps da lei §5.6
(import cruzado `catalog`↔`identity`, `primereact` direto em feature) sem saída.

**Gate de fechamento:** `git diff --name-only main...HEAD -- backend/` vazio (D1 preservado);
suíte backend 347 passed (1083 assertions) como regressão; `pnpm build` + `pnpm lint` verdes.
Prova visual do João aceita nos 6 critérios comportamentais do DoD (spec §7), dois temas, 1400px e
768px.

Arquivado: `plans/archive/2026-08-01-cards-relacao-curso-redator.md` ·
`specs/archive/2026-08-01-cards-relacao-curso-redator-design.md` (sem context packet — o João deu
as 3 imagens de referência direto na sessão de planejamento).

**Aberto, registrado, não resolvido:** o acoplamento RBAC entre `catalog` e `identity` (D11 só
removeu a mentira da UI, não fechou o acoplamento — mesma classe do item "Alunos · o dropdown de
empresa depende de uma permissão de outro módulo" no `backlog.md`); FUT-2 no caso geral (D8 resolve
só o caso concreto do botão-olho).

## Penúltimo item fechado — 2026-08-01

`foto-avatar-e-contatos-cliente` — bloco único juntando os itens 1 e 2 do backlog por decisão do
João. Spec de 15 decisões (D1–D15), plano de 12 tasks; Parte A (backend, Tasks 1–4) pelo Codex,
Parte B (frontend, Tasks 5–12) por Claude com `subagent-driven-development`. Commits `4dfe3a9`..
`73870b0`.

**Entrega:** `photo_url` (`#[Computed]`) nos 4 contratos (User/Client/Redator/Student);
`UserPhotoService` guarda a foto em `users.photo_path`, FORA de `files` — foto não é documento, não
vence, não habilita turma, não entra em certificado (D3). 8 rotas nested, uma por módulo dono, para
não recriar acoplamento RBAC cross-módulo (D1). `AppAvatar` com fallback duplo (D7: a URL
pré-assinada expira, e círculo vazio parece defeito, não "sem foto"), `AppPhotoField` +
`useEntityPhoto` (buffer no create D10, `flush` nunca lança D11), avatar nas 4 tabelas, contatos do
cliente em cards com exclusão e mínimo de 1 (D12–D14).

**Dois achados críticos apareceram só na prova visual do João, depois do DoD:**
`UploadedFile::store()` devolve `false` sem lançar — `photo_path` virava `'0'` e o objeto anterior,
que ainda funcionava, era apagado (`9197d08`; 2 clientes reais de dev ficaram assim). E não existe
valor único de `AWS_ENDPOINT` que sirva para escrita e leitura: resolvido assinando a leitura contra
um disco `{disco}_public` separado (`b6dc068`), no mesmo choke point que os documentos de
redator/turma/orçamento já usavam.

**Dois reviews, de duas lentes cada** (Claude + `mcp__codex__codex` read-only). O primeiro sobre
`4dfe3a9..b6dc068`: 7 achados, dos quais **Q1 era falso positivo** — medido, o resolver do spatie
desvia do `CannotSetComputedValue` quando a propriedade é promovida no construtor. Reais: o mínimo
de 1 contato escapava pela rota nested `DELETE /api/contacts/{id}`, e a rota de foto do staff
aceitava `User` de qualquer tipo, driblando a permissão do módulo dono. O segundo, sobre a própria
rodada de correção (`34ab3c2`): 4 achados aprovados — o gate de fechamento não cobria o botão
**Salvar** (quarta saída do diálogo), o retry ressurgia no erro de TAMANHO reenviando o arquivo
errado, o teste do Q5 provava menos do que o Q5 pedia, e o `closeBlocked` sem `timeout` no axios
virava trava dura.

**Lição 10 reapareceu dentro do fix da própria lição 10:** o teste novo de auditoria passou VAZIO na
primeira prova — sem `photo_path` no diff, todos os valores viram `null`, e `null === null` aprova
tudo. Só com `assertNotNull` nos caminhos ele foi visto reprovando.

**Gate de fechamento:** DoD e correções provados contra API real com sessão Sanctum (contato único →
`422` sem apagar; `DELETE` com 3 contatos → `204`; `/api/users/{userDeCliente}/photo` → `404` sem
tocar a foto; `POST /api/clients/1/photo` → `204` e a URL pré-assinada devolvendo `200 image/png`;
`contacts: []` → `422` com os contatos intactos). Suíte 347 passed (1083 assertions), `pnpm build` +
`pnpm lint` verdes, Pint limpo nos 19 arquivos PHP do bloco, `generated.ts` regenerado sem diff.
Prova visual do João aceita.

Arquivado: `plans/archive/2026-07-31-foto-avatar-e-contatos-cliente.md` ·
`specs/archive/2026-07-31-foto-avatar-e-contatos-cliente-design.md` ·
`context-packets/foto-avatar-e-contatos-cliente.md` (`partial` — as 4 imagens de referência eram
caller-held e **nunca foram fornecidas**; o bloco entregou sem elas).

**Aberto, registrado, não resolvido:** P-24 em `docs/pendencias.md` (a compensação do
`UserPhotoService::store()` pode apagar o objeto novo se a auditoria lançar depois do UPDATE já ter
commitado) e, no `backlog.md`, Q-5 (check-then-act sem lock no mínimo de contatos — divergência de
severidade declarada com a segunda lente) e Q-6 (idioma das mensagens de `ValidationException`
inconsistente no repo, pré-existente).

Histórico completo: `docs/superpowers/progress.md`.
