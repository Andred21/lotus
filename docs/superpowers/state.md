---
schema_version: 1
active_feature: identidade-visual-e-comercial
active_work_item: foto-avatar-e-contatos-cliente
workflow_state: blocked
next_owner: joao
next_action: decide_photo_object_lifecycle
active_spec: null
active_plan: null
context_packet: null
blocker: "Ciclo de vida do objeto de foto no S3 ao substituir ou remover: apagar imediatamente, reter por prazo definido para auditoria, ou apenas desvincular de users.photo_path? Nenhuma fonte canônica decide (Drive exige conformidade LGPD/legislação chilena em termos gerais, sem regra de retenção da foto). Dado pessoal com exigência legal — não se supõe."
resume_state: context_required
last_completed_work_item: hardening-upload-visualizacao-arquivos
state_basis_commit: 1544143
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

## Estado atual — `blocked`

O Context Packet foi gerado pelo Codex (read-only) e devolveu `status: blocked` /
`RECOMMENDED_TRANSITION: blocked`, com **um** fato faltando — não uma fonte faltando. O packet está
salvo como evidência em `docs/superpowers/context-packets/foto-avatar-e-contatos-cliente.md`, mas
`context_packet` permanece `null` porque um packet `blocked` nunca autoriza planejamento.

**Blocker:** ao substituir ou remover a foto de uma pessoa, o objeto anterior no S3 deve ser
apagado imediatamente, retido por prazo definido para auditoria, ou apenas desvinculado de
`users.photo_path`? O Drive (`requisitos-negocio.md`, `entidade-usuario.md`) exige conformidade
LGPD/legislação chilena e validação de upload em termos gerais, mas não decide retenção da foto.
É dado pessoal com exigência legal, e interage com **P-02** (política de retenção documental nunca
decidida) e com o débito conhecido do arquivo órfão no MinIO em rollback de transação.

Próxima ação: decisão explícita do João. Com ela registrada, o packet é atualizado (rodada nova do
Codex ou emenda na tabela de divergências) e o estado volta a `resume_state: context_required` para
seguir a `ready_for_planning`.

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
