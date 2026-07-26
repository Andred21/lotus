---
schema_version: 1
active_feature: null
active_work_item: bloco-visual-refino-ui
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
last_completed_work_item: bloco6-frontend-seed
state_basis_commit: a61a950
active_spec: docs/superpowers/specs/2026-07-26-bloco-visual-refino-ui-design.md
active_plan: docs/superpowers/plans/2026-07-26-bloco-visual-refino-ui.md
context_packet: docs/superpowers/context-packets/bloco-visual-refino-ui.md
blocker: null
resume_state: null
context_packet_status: ready
updated_at: 2026-07-26
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

## Último item fechado — 2026-07-26

`bloco6-frontend-seed` (spec §7). `active_plan` apontou para a seção da spec, não para um arquivo em
`plans/` — decisão do João: task pequena o bastante para o gate inline do `/executar-bloco`.
Execução delegada a subagente na branch `feat/seed-operacional` (`b0b19c0`), mergeada em `8dcffa4`.
DoD ("ver os dados na UI") validado pelo João.

Higiene de fechamento pendente executada em 2026-07-26 (passos 8/9 do `/fechar-sprint`, fora do
comando — o gate exige `ready_for_closure` e o estado já estava `idle`): spec de Operação movida
para `specs/archive/`, referências atualizadas em `progress.md` e `pendencias.md`, item concluído
removido do backlog.

## Item ativo — `bloco-visual-refino-ui`

Promovido por decisão explícita do João em 2026-07-26 (backlog item 1, Notion H.1.3). Um bloco,
review por partes: camada compartilhada em `shared/ui` **+** migração de Comercial, Operación,
Cursos, Pessoas, detalhe de orçamento e detalhe de turma. Escopo dentro do **ADR-16** (wrapper +
`className` na raiz + `pt`); tokens próprios e `unstyled` seguem rejeitados. Shell **fora de
escopo**.

**Pessoas · Alunos ficou FORA deste bloco** (decisão do João, mesma sessão): não existe endpoint de
aluno no backend — `grep student` em `routes/api.php` e `app/Domains/*/routes.php` = vazio; só
existem `Identity/Models/Student.php` e `Identity/Services/StudentResolver.php`. É feature, não
refino. Virou backlog item 2, ordenado depois deste bloco para nascer já no padrão visual novo.

O insumo do bloco (auditoria de 2026-07-24, 4 prints do protótipo, baseline de 2026-07-26) **não
está no repo** — nada em `docs/` referencia 2026-07-24. Por isso o estado entrou em
`context_required` e a geração do Context Packet foi roteada ao Codex.

## Bloqueio de contexto — aberto e resolvido em 2026-07-26

O Codex devolveu o packet com `status: blocked` e `RECOMMENDED_TRANSITION: blocked`. O contrato da
skill foi respeitado (markers, frontmatter, 8 key facts, fontes `unavailable` registradas), então
não houve re-invocação: o veredito era legítimo, não violação.

Três causas distintas, todas resolvidas na mesma sessão.

1. **Notion — resolvido.** O `unavailable` era gap de tooling do runtime do Codex, não ausência de
   fonte. O Claude leu as páginas. **Achado:** as 4 páginas com EAP `H.1.3` estão **em branco**, com
   `Critério de aceite` vazio. O conteúdo real mora em **H.2.1** (`[Template] Refinamento de UI/UX
   por módulo`), e o escopo dele é **responsividade + estados**, não a composição visual que o
   backlog descreve. Decisão do João: **o bloco entrega as duas frentes**.
2. **Drive — gap real, contornado.** A "auditoria de 2026-07-24" e a "baseline refinada de
   2026-07-26" citadas no backlog não existem como arquivo. Buscas independentes do Codex e do
   Claude voltaram vazias — insumo nunca persistido. Decisão do João: **reconstruir do código**. O
   baseline levantado está na seção `Baseline do código` do packet v2, agora versionado em `docs/`
   para não sumir de novo.
3. **Figma — contornado.** O protótipo é um **Figma Site publicado**
   (`piece-desert-35638359.figma.site`), não um arquivo `figma.com`: o HTML servido é shell JS (só o
   título `Protótipo AF`) e o MCP do Figma exige `fileKey`. O João anexou **5 prints** (Comercial,
   Operación, detalhe de orçamento, e as abas Configuración e Alumnos do detalhe de turma), em tema
   claro e escuro. A leitura deles está na seção `Protótipo` do packet.

Packet fechado como **v3, `status: ready`**, em
`docs/superpowers/context-packets/bloco-visual-refino-ui.md`.

**A resposta do pivô:** a ação não tem posição única — ela mora no cabeçalho do container mais
próximo. Em página de módulo desce para a toolbar dentro do card, à direita, na mesma linha da
busca. Em página de detalhe fica no cabeçalho da página, ao lado da tag de estado. Em aba sem busca
vira grupo de botões à esquerda, acima da tabela. O `PageHeader` sobrevive para título, descrição e
tags; o que sai dele é a ação primária de módulo.

Achado extra da auditoria de baseline: **P-11 venceu**. O gatilho era "quando `shared/ui`
padronizar um `ConfirmDialog`"; já padronizou, e 5 componentes consomem. Só `EnrollmentTable.tsx:55`
ficou com `window.confirm`. Cai neste bloco.

## Parte 1 executada e pronta para review — 2026-07-26

8 tasks do plano (`docs/superpowers/plans/2026-07-26-bloco-visual-refino-ui.md`, Parte 1) executadas
via `subagent-driven-development` em worktree (`.claude/worktrees/bloco-visual-p1`, branch
`worktree-bloco-visual-p1`), cada uma com implementador + review de task. Camada `shared/ui`
(`AppCard`, `AppEmptyState`, `AppTag` tom `accent`, `AppDataTable` com densidade/hover/merge
profundo, `ModulePage`/`PageHeader` com `tags`) construída e Comercial migrado — ternário do header
removido (D3).

Review final da branch (modelo mais capaz): "Ready to merge? With fixes" — 5 achados Important
(rowHover nunca ligado, reset de página ausente ao filtrar, empty state falso durante loading,
padding do `AppTabView` quebrando composição edge-to-edge do `AppCard`, contraste no tema escuro),
0 Critical, 9 Minor. Todos os 5 Important corrigidos em `a61a950` e re-revisados sem regressão.

DoD provado na tela real pelo João (não por agente — sandbox sem browser/root para instalar libs de
Playwright; `chromium-cli` ausente). Detalhe do bloqueio e do contorno (CORS/Sanctum liberados
temporariamente para o dev server da worktree, revertidos após o teste) em
`.superpowers/sdd/progress.md` da worktree.

**Pendências deixadas para depois, por decisão do João:**
- Achado de plano (não implementação): "footer sem paginador" só vale para dados de seed;
  Comercial em produção com >10 clientes vai mostrar paginador do PrimeReact + `AppCardFooter`
  empilhados — o double-band que D6 quer evitar. Unificação via `paginatorTemplate` segue adiada
  para a Parte 2 (spec já previa isso).
- 9 achados Minor do review final (duplicação de scaffolding entre `ClientsTable`/`BudgetsTable`,
  `AppDialog` com o mesmo merge raso que `AppDataTable` tinha, `clientName()` sem memo, etc.) —
  listados no ledger da worktree, não bloqueiam merge.

## `/revisar-sprint` — Parte 1, 2026-07-26

Risco: baixo (frontend visual, nenhuma lei §5 tocada, `executor: claude`). Órfãos: nenhum.
`pnpm lint` e `pnpm build` verdes no intervalo `68f5e8d^..bad3066`. 1 achado novo (Q-1, CTA
duplicado em `ClientsTable`/`BudgetsTable` no empty state real — não testado pelo DoD porque o
seeder nunca zera a tabela). João decidiu adiar — foi para os débitos técnicos do backlog. Achados
Minor já listados acima seguem adiados, não reabertos.

**Parte 1 encerrada, bloco segue aberto.** `bloco-visual-refino-ui` é "um bloco, review por
partes" (§64 acima) — só fecha quando a Parte 4 provar DoD. Decisão do João em 2026-07-26: planejar
e executar as Partes 2–4 em sequência antes de fechar o item, em vez de fechar por partes.

## Parte 2 planejada — 2026-07-26

Tasks 9 a 17 escritas no mesmo `active_plan`
(`docs/superpowers/plans/2026-07-26-bloco-visual-refino-ui.md`, seção `# Parte 2`). Três decisões do
João no gate, registradas na seção `## Decisões tomadas no gate desta parte` do plano:

1. **`tone` do `AppCard` vira ortogonal a `variant` e ganha `info`**, para o card de alerta de
   Operación. Rejeitadas: `variant="alert"` com azul fixo e resolver a cor dentro da feature.
2. **Paginador unificado (D6) adiado para a Parte 3.** Nenhuma tabela da Parte 2 passa de 10 linhas
   com o seeder (4 turmas, 3 cursos, 7 redatores), então não haveria prova end-to-end. O caso real é
   a aba Alumnos, onde duas turmas têm 12 e 15 matrículas. Escopo e DoD já anexados à Parte 3.
3. **Executor dividido:** Tasks 9–10 (`claude`, tocam contrato compartilhado — i18n das 5 telas e o
   `AppCard` que as Partes 3–4 consomem); Tasks 11–17 (`codex`, replicação mecânica com paths
   fechados). `paths_autorizados` reescritos e `shared/ui/AppCard/**` explicitamente fora.

Correção de premissa apurada ao planejar: **`PageHeader` não tem consumidor fora do `ModulePage`** —
`BudgetDetailPage` e `TurmaDetailPage` montam o próprio cabeçalho. A Task 17 pode remover `actions`
sem esperar a Parte 3, ao contrário do que a Parte 1 supunha.
