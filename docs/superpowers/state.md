---
schema_version: 1
active_feature: null
active_work_item: bloco-visual-refino-ui
workflow_state: blocked
next_owner: joao
next_action: prove_part2_on_screen
last_completed_work_item: bloco6-frontend-seed
state_basis_commit: a61a950
active_spec: docs/superpowers/specs/2026-07-26-bloco-visual-refino-ui-design.md
active_plan: docs/superpowers/plans/2026-07-26-bloco-visual-refino-ui.md
context_packet: docs/superpowers/context-packets/bloco-visual-refino-ui.md
blocker: >-
  Review da Parte 2 fechado e limpo: os 5 achados aprovados foram aplicados (C1-C5, commits c3f7411
  a 721edf0 na worktree) e reverificados. Falta a unica coisa que agente nao prova: o Joao rodar
  `pnpm dev` e conferir as 5 telas nos dois temas contra os passos "Provar na tela" das Tasks 11-17
  e das C1-C5. Provado isso, mergear `worktree-bloco-visual-p2` e seguir para o planejamento da
  Parte 3. Na merge, resolver `docs/superpowers/state.md` pela versao da main -- a worktree carrega
  um snapshot antigo, sincronizado em e9b5520 so para o executor enxergar o plano.
resume_state: ready_for_planning
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

## Parte 2 executada e pronta para review — 2026-07-26

Tasks 9–17 completas em worktree (`.claude/worktrees/bloco-visual-p2`, branch
`worktree-bloco-visual-p2`), base `0addf47`. Executor dividido conforme o gate: Tasks 9–10 por
`claude` via `subagent-driven-development` (implementador + review de task cada uma, ambas
aprovadas sem achados) — commits `dac46ff` (namespace `module.*`) e `27a2a0b` (`AppCard.tone`
ortogonal, tom `info`).

Tasks 11–17 delegadas ao `codex` via `lotus-execute-block`, commit base `27a2a0b`. Duas iterações:

1. Primeira chamada devolveu `BLOCKED` — o `state.md` da worktree ainda lia `ready_for_execution`
   porque a transição para `executing` tinha sido commitada só na `main`, antes de a worktree
   existir. Corrigido com `git cherry-pick` do commit de transição para o branch da worktree
   (`2bd7641`); não é divergência real, é artefato de branch criado antes do commit da doc.
2. Segunda chamada implementou as 7 tasks (lint+build verdes em cada uma, script de paridade verde,
   greps da Task 17 limpos), mas devolveu `RECOMMENDED_TRANSITION: blocked` porque não conseguiu
   commitar — `.git/worktrees/bloco-visual-p2` ficou somente-leitura dentro do sandbox do Codex.
   Limitação de ambiente, não do plano nem do código.

Diff revisado por mim contra `paths_autorizados` do plano — os 16 arquivos batem exatamente, nada
fora do escopo. Rodei eu mesmo `pnpm lint`, `pnpm build` e o script de paridade dos locales antes
de aceitar (não confiei só no report do Codex), todos verdes. Commitei por task, na ordem do plano:
`6650b15` (Task 11), `3ebb829` (Task 12), `a2dbf59` (Task 13), `e12c3d0` (Task 14), `2ba6699`
(Task 15), `c179dfe` (Task 16), `2509ead` (Task 17).

**Desvio de convenção registrado:** as chaves de locale das Tasks 12/14/15/16
(`operation.table.emptyHint`, `course.emptyHint`, `redator.emptyHint`, `admin.emptyHint`,
`role.emptyHint`/`role.count`) foram commitadas juntas num commit próprio (`d6023c7`), não uma por
task — chegaram do Codex como um único diff não commitado nos 3 JSONs, sem histórico intermediário
para separar por task, e fatiar por hunk manualmente arriscava corromper o JSON. Script de paridade
confirmou `es-pt: []` e `es-en: []` no estado final.

Working tree da worktree limpo em `d6023c7`. Ledger completo em `.superpowers/sdd/progress.md`
dessa worktree.

**Pendência para o João:** prova visual das 5 telas (`/comercial` já provado na Parte 1;
`/operacion`, `/cursos`, `/personas`, `/administracion` desta parte) nos dois temas — sandbox sem
browser/root para Playwright, mesma limitação já registrada na Parte 1. Não é gate deste comando: o
DoD comportamental fica para quando o João rodar `pnpm dev` e conferir contra os passos "Provar na
tela" de cada task do plano.

Branch **não mergeada ainda** — aguarda decisão do João sobre os achados abaixo.

## `/revisar-sprint` — Parte 2, 2026-07-26

Risco **alto** (Tasks 11–17 com `executor: codex`), então além do gabarito rodei revisão
independente do Codex em read-only sobre `0addf47..worktree-bloco-visual-p2`. Achados fundidos;
verifiquei no código cada um que só o Codex viu. Verificações rodadas por mim na worktree, não
aceitas do report: `pnpm lint` limpo, `pnpm build` verde, script de paridade `es-pt: []` /
`es-en: []`.

Órfãos: nenhum (`course.tabCourses` sem consumidor e os slots `AppCardFooter.pagination` /
`ModulePage.tags` reservados são todos declarados no plano). Leis §5: nenhuma violação — zero
import de `primereact` em `features/`, zero import cross-feature, zero cor Tailwind hardcoded nova.

5 achados aguardando decisão (detalhe em `blocker`):

- **Q-2 🔴 P** — `RolesTable.tsx:27` não faz opt-out do `paginator` default do `AppDataTable`
  (`alwaysShowPaginator: true` no PrimeReact), então paginador de página única renderiza acima do
  `AppCardFooter`: a double-band que D6 elimina. As outras 6 tabelas fazem `paginator={rows.length > 10}`.
  A decisão #2 do gate assumiu que o paginador "nem apareceria" com ≤10 linhas — premissa errada.
- **Q-3 🟡 P** — `emptyMessage={loading ? undefined : empty}` (7 ocorrências, herdado da correção da
  Parte 1) não suprime o corpo vazio: o PrimeReact cai em `localeOption('emptyMessage')` e o locale
  ativo é `en` (`primeLocale.ts` só faz `addLocale`, nunca `locale('es')`). Rende `No available
  options` sob o overlay de loading em todas as tabelas.
- **Q-4 🟡 P** — ação primária sem check de permissão em `CatalogPage:18`, `PeoplePage:20`,
  `CommercialPage:28/35`, enquanto `AdministracionPage:29` gateia com `canManage`. Role customizada
  só-leitura vê o botão e leva 403 no submit.
- **Q-5 🟢 P** — `TurmasTable.tsx:46-56`: com só o filtro de estado ativo, a descrição e o CTA ainda
  falam de busca, embora o `onClick` limpe busca **e** estado.
- **Q-6 🟡 M** — scaffolding de tabela duplicado em 6 componentes; a Parte 1 já registrou com 2
  cópias. Padrão reincidente (2 sprints) → propor `useTableFilter` em `shared/` **e** uma linha em
  `.claude/rules/frontend-fsliced.md` fixando o contrato de tabela-em-card.

Descartado por ruído: `first` não reajustado quando um refetch encolhe a lista abaixo da página
atual (achado do Codex) — real, mas exige volume que nenhuma tela tem hoje.

**João aprovou os 5 achados em 2026-07-26 e delegou a aplicação ao Codex.** Viraram as Tasks C1 a
C5 na seção `# Parte 2 — Correções de review` do `active_plan`, com `## Handoff de execução`
próprio (`executor: codex`, base `d6023c7`). Ordem obrigatória C1→C5: C1 tira o ternário de
`emptyMessage` das 7 tabelas e C5 reescreve as mesmas tabelas em cima do resultado.

Desvio consciente do gate da Parte 2, que mandava contrato compartilhado para o `claude`: C1
(`AppDataTable`) e C5 (`useTableFilter` + rule) tocam `shared/`, e mesmo assim vão para o Codex por
decisão do João. Risco contido escrevendo o código de `shared/` literalmente no plano — o Codex
aplica sem latitude de design — e conferindo o diff antes de commitar.

O Codex **não commita** (na Parte 2 o `.git/worktrees/bloco-visual-p2` ficou somente-leitura no
sandbox dele). Claude confere o diff contra `paths_autorizados`, roda lint/build/paridade por conta
própria e commita task a task, como na Parte 2.

## Correções de review aplicadas — Parte 2, 2026-07-26

João aprovou os 5 achados e delegou a aplicação ao Codex. Tasks C1 a C5 escritas no `active_plan`
com o código de `shared/` literal, para o Codex aplicar sem latitude de design. O Codex executou as
5 na worktree e **não commitou**, como instruído — a limitação de sandbox da Parte 2 deixou de ser
um `blocked` porque o handoff já previa que quem commita é o Claude.

Conferi o diff eu mesmo antes de commitar: 17 arquivos, todos dentro dos `paths_autorizados`, nada
fora. Rodei `pnpm lint`, `pnpm build`, o script de paridade (`es-pt: []` / `es-en: []`) e os 4
greps de prova das tasks — todos verdes por execução minha, não pelo report.

Commits, um por task: `c3f7411` (C1), `8bf28b9` (C2), `4dcf0ff` (C3), `91ed065` (C4), `721edf0`
(C5). Working tree limpo em `721edf0`.

**Lacuna do plano fechada na hora:** a Task C4 só nomeava `TurmasTable`, mas `BudgetsTable` tem o
mesmo filtro de estado e o mesmo defeito de copy. Erro meu ao listar as ocorrências do Q-5, não do
executor — corrigido junto no commit da C5.

**Desvio de convenção registrado:** os commits não isolam perfeitamente uma task cada. A C1 mudou o
wrapper **e** a linha `emptyMessage` das 7 tabelas; a C5 reescreveu 6 dessas tabelas por inteiro.
Separar os dois toques no mesmo arquivo exigiria fatiar hunk a hunk sem ganho de auditoria. O que
ficou: C1 leva só o wrapper, C2 leva a `RolesTable` (com o toque de C1 nela), C5 leva as outras 6
(com os toques de C1 e C4 nelas). Cada commit intermediário compila — o ternário antigo do chamador
é inofensivo depois de C1.

Q-6 virou regra, não só refactor: o bullet "Tabela em card = `useTableFilter` + `AppCard{Toolbar,
Footer}`" entrou em `.claude/rules/frontend-fsliced.md`, com os dois defeitos que a duplicação
rendeu escritos como motivo.
