---
schema_version: 1
packet_id: hardening-upload-visualizacao-arquivos
block_id: hardening-upload-visualizacao-arquivos
status: partial
generated_at: 2026-07-31T14:03:36-03:00
base_ref: main
base_commit: 5f8adcba2f7442c556fc18cf8a0775d584bb9442
state_path: docs/superpowers/state.md
state_blob_sha: fa78a9964493edaf932aadcd6465bdc951352e69
progress_path: docs/superpowers/progress.md
progress_blob_sha: bad496e2b421feb96830ec44414807b9b2c2263d
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Hardening · Upload e visualização de arquivos

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** Investigar o erro apresentado como CORS nos uploads, identificar a camada que rejeita o payload, alinhar os limites de frontend, Nginx, PHP e Laravel e criar visualização compartilhada para documentos da tabela polimórfica `files` em orçamentos, cotações, documentos de redator e documentos de turma.

**Non-goals:** Declarar o diagnóstico antes da investigação; alterar o modelo de armazenamento ou autorização; remover ou substituir download, exclusão ou URLs temporárias; avançar o workflow diretamente.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| LOCAL | Git repository | `AGENTS.md`, `CLAUDE.md`, `INSTRUÇÕES-DO-PROJETO.md`, `docs/superpowers/state.md`, `progress.md`, `backlog.md` e precedente `context-packets/bloco-alunos-modulo.md` @ `5f8adcba2f7442c556fc18cf8a0775d584bb9442` | 2026-07-31 | retrieved; working tree clean | Estado, escopo, precedência caller-held e proveniência |
| PRINTS | Caller (sessão do João Victor) | `pressuposto-no-visualization-docs`, `teste-image-document-pressuposto`, `erro-document-pressuposta-ui`, `erro-document-pressuposta-console` | 2026-07-31 | caller-supplied; not retrievable in this runtime | Evidência visual e de console |
| GDRIVE | Google Drive | Folder ID `1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM` — `Viagem Chile/Projetos/Lotus.cl/V2` | 2026-06-16T16:33:47.284Z | searched; named artifacts not found (`results: []`) | Localização canônica dos artefatos |
| FIGMA | Figma | No file/node ID recovered | unknown | unavailable — expected `mcp__codex_apps__figma_search`; tool discovery returned none | Busca alternativa pelos artefatos |
| NOTION | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc`; database ID `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | not exposed | retrieved and queried; no 1:1 task exists | Organização de tasks relacionadas |

## Key facts

1. O bloco cobre diagnóstico dos uploads e visualização compartilhada nos quatro consumidores de `files`, preservando download, exclusão, URLs temporárias e autorização existentes. `[LOCAL]`
2. O console registra verbatim: `Access to XMLHttpRequest at 'http://localhost:8000/api/quotes/1/files' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.` e `Failed to load resource: net::ERR_FAILED`. `[PRINTS]`
3. O endpoint é `POST /api/quotes/{id}/files`. A mensagem cita porta `8000`, enquanto o recurso aparece como `:8080/api/quotes/1/files:1`; nenhum status HTTP numérico está visível. A ausência total do header e `net::ERR_FAILED` são observados como assinatura de resposta não produzida pelo Laravel, com Nginx (`client_max_body_size`) e PHP (`post_max_size`/`upload_max_filesize`) como camadas candidatas, sem diagnóstico fechado. `[PRINTS][LOCAL]`
4. A UI mostra o upload falho como banner vermelho com `Revisa tu conexión e inténtalo de nuevo.`, sem indicar limite de tamanho ou causa real. `[PRINTS]`
5. Na seção `DOCUMENTOS`, o `.docx` possui apenas baixar e excluir; não há ação de visualizar. O nome mostrado é o nome técnico armazenado, `ebdadecc-152f-407d-a8bf-082804d47a55.docx`, e não o nome original. `[PRINTS]`
6. O conjunto de `files` inclui ao menos uma imagem JPG/PNG, que admite preview inline, e `.docx`, que não admite o mesmo tratamento. `[PRINTS]`
7. O blocker registrado em `state.md` exigia os quatro prints; eles foram fornecidos pelo caller conforme o precedente caller-held do projeto, resolvendo os fatos que faltavam. `[PRINTS][LOCAL]`
8. Drive e Figma não forneceram IDs dos artefatos e o Notion não possui task 1:1, mas essas limitações são não bloqueantes porque o conteúdo material foi fornecido pela fonte prioritária. `[PRINTS][GDRIVE][FIGMA][NOTION]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Disponibilidade dos prints | `state.md` registra os quatro como ausentes | Prints agora são caller-held e fornecidos; o blocker factual está resolvido | Instrução atual do João tem prioridade máxima e satisfaz a resolução prevista pelo próprio estado; `[PRINTS][LOCAL]` |
| Portas do upload | Console cita `8000`; linha do recurso cita `8080` | Preservar a divergência como objeto da investigação; não escolher silenciosamente uma origem | Transcrição caller-supplied e Nginx do compose documentado em `8080`; `[PRINTS][LOCAL]` |
| Causa do erro | Navegador rotula como CORS; caller observa assinatura anterior ao Laravel | Nenhuma camada é confirmada; Nginx e PHP permanecem candidatas | A evidência decide apenas que o rótulo do navegador não encerra o diagnóstico; `[PRINTS]` |
| Task no Notion | Nenhuma task reúne upload e visualização nos quatro consumidores | O work item interno permanece válido | Ausência 1:1 é esperada e não bloqueante; `[NOTION][LOCAL]` |

## Constraints

- Não tratar `net::ERR_FAILED` como status HTTP numérico nem assumir `413` sem observação.
- A visualização deve considerar tipos com e sem preview inline.
- Download, exclusão, URLs temporárias e autorização continuam preservados.
- O contrato compartilhado abrange orçamentos, cotações, redatores e turmas.

## External acceptance signals

- O gap observável é a ausência de ação de visualizar ao lado de baixar e excluir. `[PRINTS]`
- Imagens precisam ser distinguíveis de formatos como `.docx`, que exigem comportamento diferente. `[PRINTS]`
- O erro atual aparece ao usuário como falha de rede genérica, apesar de a investigação poder identificar rejeição por limite de payload. `[PRINTS]`

## Open questions

- Qual camada e qual limite produzem a resposta real, e qual status HTTP chega antes de o navegador reduzi-la a `net::ERR_FAILED`?
- O nome original do arquivo deve integrar este bloco ou permanecer como escopo posterior?
- Qual é o comportamento compartilhado para formatos sem preview inline?

Nenhuma dessas perguntas bloqueia o planejamento; elas são decisões ou provas pertencentes ao próprio bloco.

## Deferred

- Criação ou alteração de task no Notion.
- Escritas externas e qualquer implementação.
- Diagnóstico definitivo antes de evidência reproduzível.

## Staleness triggers

- O caller corrigir ou substituir a transcrição dos prints.
- `active_work_item`, spec ou escopo funcional mudar semanticamente.
- Um artefato canônico recuperado por ID contradizer a evidência caller-held.
- O comportamento de upload, armazenamento, autorização ou URLs temporárias mudar no código referenciado.
