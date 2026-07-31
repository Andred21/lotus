---
schema_version: 1
active_feature: identidade-visual-e-comercial
active_work_item: foto-avatar-e-contatos-cliente
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
active_spec: docs/superpowers/specs/2026-07-31-foto-avatar-e-contatos-cliente-design.md
active_plan: docs/superpowers/plans/2026-07-31-foto-avatar-e-contatos-cliente.md
context_packet: docs/superpowers/context-packets/foto-avatar-e-contatos-cliente.md
blocker: null
resume_state: null
last_completed_work_item: hardening-upload-visualizacao-arquivos
state_basis_commit: 1544143
updated_at: 2026-07-31T18:40:00-03:00
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

## Estado atual — `executing`

Spec (15 decisões, D1–D15) e plano (12 tasks) aprovados; execução em andamento.

**Parte A (Tasks 1–4, backend + `generated.ts`, executor Codex) — COMPLETA.** Commits `4dfe3a9`
(Task 4), `0c3039a` (Task 1), `c5476dc` (Task 2), `ec9c92a` (Task 3). Revisado por Claude (diff real
contra `paths_autorizados`, suíte rodada de novo — 340 passed, Pint limpo, `route:list --path=photo`
com as 8 rotas, `generated.ts` só com `photo_url` nas 4 interfaces certas). Dois achados reais
resolvidos durante a execução, ambos registrados em `.superpowers/sdd/progress.md`: GD do container
sem suporte a JPEG (fixtures de teste trocados para `.png`, decisão do João — zero impacto em
produção, `UserPhotoService::store()` não decodifica imagem) e `GET /api/students/{id}` devolve
`StudentDetailData`, não `StudentData` (teste corrigido para verificar `photo_url` via `GET
/api/students`, index — é o endpoint que o frontend de fato consome).

**Próxima ação:** Tasks 5–12 (frontend, executor Claude) — `AppAvatar`, `AppPhotoField`,
`useEntityPhoto`, os 4 diálogos, as 4 tabelas e os cards de contato do cliente. Sem test runner no
frontend; a prova é visual e a Task 11 depende das imagens de referência caller-held.

**Review de risco declarado:** a Parte A muda contrato de escrita (`contacts` mínimo 1) e apaga
objeto de storage de forma irreversível. Como no bloco anterior, o fechamento pede segunda lente
independente sobre o intervalo de commits da Parte A.

**Pendência de contexto:** as 4 imagens de referência (`alumnos-exemplo-avatar`,
`client-no-component-photo`, `redator-no-component-photo`, `alumnos-component-wrong-photo`) seguem
caller-held. O João as fornece na execução; elas calibram o visual, não alteram os contratos.



O Context Packet do Codex voltou `status: blocked` por **um fato ausente**, não por fonte ausente:
nenhuma fonte canônica decidia o ciclo de vida do objeto de foto no S3. O João decidiu o ponto (e
mais um) na mesma sessão, o packet foi emendado com a fonte `[J-02]` e passou a `partial`.

**Decisões que desbloquearam o bloco (2026-07-31):**

- Substituir ou remover foto **apaga o objeto anterior no S3 imediatamente** — sem retenção, sem
  órfão desvinculado. Consequência que o plano tem de tratar: delete imediato é irreversível e
  `UploadFileAction::execute` já grava antes de inserir em `files`, com chamadas dentro de
  `DB::transaction`; a ordem precisa de `DB::afterCommit` ou compensação explícita.
- Cliente termina com **no mínimo um contato, validado no backend** — a API deixa de aceitar coleção
  vazia, e o `removeContact` novo não pode zerar a lista.

Única fonte ainda `unavailable`: as 4 imagens de referência, caller-held — não bloqueantes, o João
as fornece durante o planejamento.

Próxima ação: `/planejar-bloco` produz spec (brainstorming) e plano para `foto-avatar-e-contatos-cliente`.

## Escopo do bloco

`active_work_item: foto-avatar-e-contatos-cliente` — bloco único que junta, por decisão explícita
do João em 2026-07-31, os itens 1 e 2 do backlog:

1. **Identidade visual · Foto e avatar das entidades derivadas de User** — expor `photo_url` nos
   contratos de User, Client, Redator e Student; `AppAvatar` na primeira coluna das tabelas;
   componente compartilhado de foto no corpo dos dialogs (visualizar, selecionar, substituir,
   remover); fallback de duas iniciais; remover avatar do header do `StudentDialog`.
2. **Comercial · Refinamento dos contatos do cliente** — `ContactFields` em cards responsivos com
   labels explícitas, indicação de contato principal e exclusão; `removeContact` no hook,
   preservando a semântica replace-total do backend e os erros nested.

Próxima ação: o Codex gera o Context Packet (`lotus-context-packet`, sandbox read-only). As imagens
de referência (`alumnos-exemplo-avatar`, `client-no-component-photo`, `redator-no-component-photo`,
`alumnos-component-wrong-photo`) são **caller-held** — estão na máquina do João, não no Drive,
Notion ou GitHub; devem ser registradas como fonte `unavailable` no packet e serão fornecidas por
ele durante o planejamento. Packet `partial` por esse motivo não bloqueia.

## Último item fechado — 2026-07-31

`hardening-upload-visualizacao-arquivos` — 11 tasks, execução em 2 partes: Tasks 1–4
(infra+backend) pelo Codex, Tasks 5–10 (frontend) por Claude, ambas com
`subagent-driven-development`. Commits `dfadb0c`..`f271c12` (execução), `faf7c78` (fix de review),
`8a592f1` (transição pós-review).

**Entrega:** o erro reportado como CORS era `client_max_body_size` de 1 MB (default do nginx)
cortando o upload antes do Laravel — as 4 camadas (nginx/PHP/Laravel/frontend) discordavam de
teto. Nginx e PHP sobem para 12 MB de transporte (folga de multipart, D2); o `max:10240` (10 MB)
dos 5 controllers, já existente, passa a ser sempre quem rejeita, com envelope RFC 7807 e header
CORS. `TurmaDocumentData` e `RedatorDocumentData` sobem ao núcleo comum de `FileData` (`mime`,
`size`/`created_at`, `download_url`) — a turma ganhou download, que não tinha. `shared/ui` ganha
`AppFileRow` + `AppFilePreviewDialog` (imagem/PDF inline, fallback explícito nos demais tipos —
D9), adotados pelos 4 consumidores; `AppFileUpload` barra arquivo acima do teto antes da
requisição (D4). Um achado de review virou decisão do João: a Task 9 só colara um botão de
preview em vez de adotar `AppFileRow` — corrigido por completo (`474f97d`).

**Review de alto risco** (Codex tocou infra+backend na Parte A): segunda lente via
`mcp__codex__codex` (read-only) sobre `dfadb0c..f271c12` encontrou 1 achado real —
`UploadSizeLimitTest` só cobria cotação e orçamento, sem regressão do teto de 10 MB em redator,
turma e import de matrícula (D11). João aprovou a correção; fix em `faf7c78` (3 casos novos,
suíte 321 passed).

**DoD provado contra API real, sessão Sanctum autenticada:** 5 MB → `201`; 11 MB →
`422 application/problem+json` com `detail: "El campo file no debe ser mayor que 10240
kilobytes."` (nunca `413` opaco, header CORS presente); `GET /api/turmas/1/documents` expõe
`mime`+`download_url`; `GET /api/redatores/1` expõe `mime`+`size`+`created_at` nos documentos.
Suíte 321 passed, `pnpm build`+`pnpm lint` verdes, Pint limpo. Prova visual do João (preview de
imagem, preview de PDF, fallback `.docx`, upload de 3 MB) aprovada nos 4 consumidores
(orçamento, cotação, turma, redator).

Arquivado: `plans/archive/2026-07-31-hardening-upload-visualizacao-arquivos.md` ·
`specs/archive/2026-07-31-hardening-upload-visualizacao-arquivos-design.md` ·
`context-packets/hardening-upload-visualizacao-arquivos.md` (`partial`, não bloqueante — as 4
imagens de referência eram caller-held, o João as forneceu na sessão de planejamento).
Histórico completo: `docs/superpowers/progress.md`.

**Gatilhos abertos que este bloco não resolveu** (fora de escopo por decisão da spec, sem
alteração silenciosa): autorização/RBAC dos endpoints de arquivo; política de retenção documental
(P-02); débito do arquivo órfão no MinIO em rollback de transação (pré-existente, backlog);
código próprio de turma (P-13); URL pré-assinada/ADR-11 (nenhuma mudança de modelo).
