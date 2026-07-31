---
schema_version: 1
active_feature: hardening
active_work_item: hardening-upload-visualizacao-arquivos
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
blocker: null
resume_state: null
last_completed_work_item: hardening-doc-sync-sprint4
state_basis_commit: faf7c78
active_spec: docs/superpowers/specs/2026-07-31-hardening-upload-visualizacao-arquivos-design.md
active_plan: docs/superpowers/plans/2026-07-31-hardening-upload-visualizacao-arquivos.md
context_packet: docs/superpowers/context-packets/hardening-upload-visualizacao-arquivos.md
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

`workflow_state: ready_for_review` — as 11 tasks do plano executadas e provadas em 2026-07-31. Packet
`status: partial` em `context-packets/hardening-upload-visualizacao-arquivos.md` (não bloqueante,
§ acima).

**Execução:** Parte A (Tasks 1-4, infra+backend) delegada ao Codex via `lotus-execute-block` com
`subagent-driven-development`, commits `dfadb0c`..`940e793` (Task 3 revisada e commitada por Claude
após o Codex reter por disciplina de escopo — manifest do typescript-transformer). Parte B (Tasks
5-10, frontend) executada por Claude com `subagent-driven-development`, um implementador+revisor por
task, commits `a78bb0c`..`f271c12`. Um achado de review virou decisão do João via `AskUserQuestion`:
Task 9 (documento do redator) só colara um botão de preview em vez de adotar `AppFileRow` na linha,
divergindo de D8 e das Tasks 7/8 já mergeadas — João pediu a correção completa (fix `474f97d`,
re-review Approved). Um achado simples (Task 10, `sizeError` não resetava no fechamento do diálogo de
importação) foi corrigido direto, sem escalar (fix `f271c12`).

**DoD (Task 11) provado automaticamente:** suíte 318 passed; `pnpm build`+`pnpm lint` verdes; 11 MB
autenticado → `401`/`419` antes do rebuild vs. **nunca `413`** depois (nginx/PHP alinhados a 12 MB,
D2); 5 MB autenticado → `201` real (`POST /api/quotes/1/files`); 11 MB autenticado → `422
application/problem+json` com `detail: "El campo file no debe ser mayor que 10240 kilobytes."` (não
o 422 genérico, não 413 opaco); `GET /api/turmas/1/documents` expõe `mime`+`download_url`; `GET
/api/redatores/1` expõe `mime`+`size`+`created_at` nos documentos — os dois contra API real, sessão
Sanctum autenticada. **Pendente:** prova visual do João (preview de imagem/PDF, fallback `.docx`,
upload de 3 MB nos 4 consumidores) — sem browser tool nesta sessão, mesmo padrão de todos os blocos
anteriores deste projeto (ver `bloco-alunos-modulo`, Execuções 1-3 acima). Não bloqueia a transição
para `ready_for_review`; bloqueia o fechamento (`/fechar-sprint`) até o João confirmar.

**Review (`/revisar-sprint`), alto risco por `executor: codex` na Parte A:** Codex (read-only,
`mcp__codex__codex`) revisou o intervalo `dfadb0c..f271c12` contra spec/plano/leis §5 e devolveu 2
achados; Claude reverificou DoD de forma independente (suíte 318→321 passed, PHP `12M|12M` no
container, 11 MB → `401` nunca `413`, 13 MB → `413` mantido, `pnpm build`+`pnpm lint` verdes,
`generated.ts` só com os campos do DTO). Achado 1 do Codex (teste não reprova contra código antigo)
não foi aceito — é guarda intencional documentada na Task 4 do plano, e a prova real do bug
(413→401) é o curl manual, reconfirmado. Achado 2 (Q-1, real): `UploadSizeLimitTest.php` só cobria
cotação e orçamento; redator, turma e o import de matrícula (D11) ficavam sem regressão do teto de
10 MB. João aprovou a correção; fix em `faf7c78` (3 casos novos, suíte 321 passed, Pint limpo).
Revisão fechada sem achado pendente — bloco em `ready_for_closure`, `/fechar-sprint` ainda depende
da prova visual do João acima.

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
