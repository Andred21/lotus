---
schema_version: 1
active_feature: null
active_work_item: bloco-visual-refino-ui
workflow_state: blocked
next_owner: joao
next_action: resolve_blocker
last_completed_work_item: bloco6-frontend-seed
state_basis_commit: 8dcffa4
active_spec: null
active_plan: null
context_packet: null
blocker: >-
  Falta o João anexar os prints do protótipo. Sem eles o packet não confirma composição do card,
  toolbar dentro do card, densidade/zebra da tabela, paleta do AppTag, empty state, paginação nem
  ONDE A AÇÃO PRIMÁRIA PASSA A FICAR depois de sair do PageHeader — que é o pivô do bloco. O
  protótipo é um Figma Site publicado (piece-desert-35638359.figma.site), não um arquivo figma.com:
  o HTML servido é shell JS (só o título "Protótipo AF") e o MCP do Figma exige fileKey. Notion e
  Drive já foram resolvidos — ver packet v2.
resume_state: context_required
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

## Bloqueio — 2026-07-26

O Codex devolveu o packet com `status: blocked` e `RECOMMENDED_TRANSITION: blocked`. O contrato da
skill foi respeitado (markers, frontmatter, 8 key facts, fontes `unavailable` registradas), então
não houve re-invocação: o veredito é legítimo, não violação. Detalhe do `blocker` no frontmatter.

Três causas distintas. Duas caíram na mesma sessão; uma continua aberta.

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
3. **Figma — ABERTO.** O protótipo é um **Figma Site publicado**
   (`piece-desert-35638359.figma.site`), não um arquivo `figma.com`: o HTML servido é shell JS (só o
   título `Protótipo AF`) e o MCP do Figma exige `fileKey`. Decisão do João: **ele anexa os
   prints**. É o único bloqueador restante.

O packet foi regerado pelo Claude como v2, `status: partial`, em
`docs/superpowers/context-packets/bloco-visual-refino-ui.md`. `context_packet` segue `null` porque a
seção visual está vazia — chegando os prints, o packet fecha e o estado vai a `ready_for_planning`.

Achado extra da auditoria de baseline: **P-11 venceu**. O gatilho era "quando `shared/ui`
padronizar um `ConfirmDialog`"; já padronizou, e 5 componentes consomem. Só `EnrollmentTable.tsx:55`
ficou com `window.confirm`. Cai neste bloco.
