---
schema_version: 1
active_feature: identity
active_work_item: abstracao-componentes-redator
workflow_state: planning
next_owner: claude
next_action: continue_active_planning
active_spec: docs/superpowers/specs/2026-08-02-abstracao-componentes-redator-design.md
active_plan: null
context_packet: null
blocker: null
resume_state: null
last_completed_work_item: hardening-debitos-integridade
state_basis_commit: b4faf40
updated_at: 2026-08-02T00:00:00-03:00
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

## Estado atual — `planning`

`abstracao-componentes-redator` — item 4 do `backlog.md`, selecionado explicitamente pelo João em
2026-08-02 depois do `/revisar-frontend` de `features/identity`. Spec aprovada e escrita em
`specs/2026-08-02-abstracao-componentes-redator-design.md` (D1–D12). Sem context packet: a fonte é o
código e o relatório do review da mesma sessão.

Próxima ação: escrever o plano de implementação (`writing-plans`). Nada de código até o plano existir
e o estado ir para `ready_for_execution`.

**Decisão que moldou o bloco:** o desenho inicial do review — promover `AppFileList`/`AppDocumentSlot`
a `shared/ui` — foi descartado no brainstorming ao se descobrir que o `D8` da spec de upload
(2026-07-31) já havia avaliado e rejeitado esse mesmo componente, pelo motivo que o contrato
confirmou (~14 props, ~6 só para diferenciar consumidor). O `D8` permanece em vigor; o bloco
compartilha apenas `AppFileActions` + `useFilePreview` e corta o `RedatorDialog` em subcomponentes
locais de `identity`.

## Último item fechado — 2026-08-01

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

## Penúltimo item fechado — 2026-08-01

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

Histórico completo: `docs/superpowers/progress.md`.
