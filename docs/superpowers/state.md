---
schema_version: 1
active_feature: hardening
active_work_item: hardening-upload-visualizacao-arquivos
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
last_completed_work_item: hardening-doc-sync-sprint4
state_basis_commit: e4204a8
active_spec: docs/superpowers/specs/2026-07-31-hardening-upload-visualizacao-arquivos-design.md
active_plan: docs/superpowers/plans/2026-07-31-hardening-upload-visualizacao-arquivos.md
context_packet: docs/superpowers/context-packets/hardening-upload-visualizacao-arquivos.md
blocker: null
resume_state: null
context_packet_status: partial
updated_at: 2026-07-31
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


## Item ativo — desde 2026-07-31

`hardening-upload-visualizacao-arquivos` — item 1 dos "Próximos blocos" do `backlog.md`, promovido
por seleção explícita do João em 2026-07-31 (`/planejar-bloco "Hardening · Upload e visualização de
arquivos"`).

Escopo declarado no backlog: investigar o erro apresentado como CORS nos uploads, identificar a
camada que rejeita o payload e alinhar os limites de frontend, Nginx, PHP e Laravel; criar
visualização compartilhada para documentos da tabela polimórfica `files`, aplicada a orçamentos,
cotações, documentos de redator e documentos de turma, preservando download, exclusão, URLs
temporárias e autorização existentes.

`workflow_state: ready_for_planning`, com packet `status: partial` em
`context-packets/hardening-upload-visualizacao-arquivos.md`.

O bloco passou por `blocked` (commit `5f8adcb`) e saiu no mesmo dia. A primeira rodada do Codex com
`lotus-context-packet` (thread `019fb918-a4aa-7493-b751-f8f02c781879`) devolveu
`RECOMMENDED_TRANSITION: blocked` porque nenhuma das 4 imagens de referência foi recuperada — Drive
respondeu `results: []`, Notion não tem task 1:1 e o namespace de busca do Figma não existe no
runtime do Codex. O caller confirmou de forma independente (busca por título e varredura de
`mimeType contains 'image/'` desde 2026-06-01 no Drive).

Não era falha de recuperação: pelo precedente de `context-packets/bloco-alunos-modulo.md` (linha 53,
fonte `PROTO`), imagem de referência neste projeto é **caller-held**. O João forneceu os 4 prints na
sessão em 2026-07-31 e a segunda rodada do Codex, na mesma thread, fechou o packet como `partial`.
`FIGMA` segue `unavailable` e `GDRIVE` segue sem os artefatos — ambos não bloqueantes, porque a
fonte de prioridade máxima (instrução direta do João) supriu os fatos.

## Último item fechado — 2026-07-30

`hardening-doc-sync-sprint4` — 14 tasks, `executor: claude`, bloco de documentação e proveniência
(nenhum arquivo de `backend/` ou `frontend/` tocado no intervalo inteiro). Histórico em
`progress.md`; decisões em `specs/archive/2026-07-30-hardening-doc-sync-sprint4-design.md` (D1–D12),
passo a passo em `plans/archive/2026-07-30-hardening-doc-sync-sprint4.md`, packet em
`context-packets/hardening-doc-sync-sprint4.md` (`ready`), relatório durável em
`audits/2026-07-30-doc-sync-sprint4.md` (13 seções).

Provas do gate: os 2 writes de Notion reconfirmados por `notion-fetch` na base canônica
`collection://e64b7d57-d000-4433-b652-a410e75193cc` — critério de aceite de H.1.3.1 preenchido e a
própria task movida para `Concluída` (Q-4); 4 patches de Drive entregues, aplicação manual pendente
do João (P-01/P-14/P-17); re-auditoria de fechamento com as 12 divergências de fato corrigidas e
confirmação inline (tabelas do `Schema::create` vs. `der-fisico.md`, 34 wrappers / 4 `forwardRef`,
19 ADRs, tabela de comandos vs. `.claude/`, nenhum gatilho vencido).

O que o fechamento moveu, além do arquivamento:

- **P-06 fecha** — `der-fisico.md` descreve o schema real de `turmas`/`turma_redator`/`enrollments`.
- **P-17 a P-23 nascem** — patches de Drive pendentes, mislabel no Notion, `openspout` e
  `simple-qrcode` sem ADR, **P-22** (H.1.3.1 duplicada dentro da base Notion canônica) e **P-23**
  (formato do `progress.md`).
- **Q-2 da revisão virou regra:** "fonte externa se referencia por ID, nunca por nome de exibição",
  em `AGENTS.md` §3, na SKILL do packet e em `.claude/skills/auditar-docs`.
- **P-11 sai** da tabela "Encerradas" — cumpriu a sprint de rastro.

**Lição que este bloco deixa, e que o próximo DoD de auditoria precisa respeitar:** a 4ª rodada do
`auditor-docs` devolveu zero achados e a rodada do gate, horas depois, devolveu 14 — todas reais.
"Re-auditoria limpa" é evidência sobre uma execução do subagente, não propriedade dos docs. DoD de
auditoria se ancora em checagens verificáveis por comando, ou assume explicitamente que auditoria
por agente é amostragem.

**Gatilhos abertos que este bloco não resolveu** (em `docs/pendencias.md`, sem alteração silenciosa):
**P-04** — guardrails das leis §5 (Pest Arch tests + `eslint-boundaries`) seguem sem existir; o
gatilho vago virou data fixa, **2026-08-15**, e o item está em "Débitos técnicos" do backlog.
