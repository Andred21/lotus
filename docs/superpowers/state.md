---
schema_version: 1
active_feature: identidade-visual-e-comercial
active_work_item: foto-avatar-e-contatos-cliente
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
active_spec: docs/superpowers/specs/2026-07-31-foto-avatar-e-contatos-cliente-design.md
active_plan: docs/superpowers/plans/2026-07-31-foto-avatar-e-contatos-cliente.md
context_packet: docs/superpowers/context-packets/foto-avatar-e-contatos-cliente.md
blocker: null
resume_state: null
last_completed_work_item: hardening-upload-visualizacao-arquivos
state_basis_commit: 73870b0
updated_at: 2026-08-01T00:00:00-03:00
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

## Estado atual — `ready_for_closure`

Spec (15 decisões, D1–D15) e plano (12 tasks) implementados por completo. Review executado (duas
lentes: Claude linha a linha + `mcp__codex__codex` read-only sobre `4dfe3a9..b6dc068`), 7 achados
levantados, decisão do João tomada em 2026-08-01. Segundo review sobre a rodada de correção feito e
seus 4 achados aprovados fechados; **prova visual aceita pelo João em 2026-08-01**. Próxima ação:
`/fechar-sprint`.

### Rodada de correção do review — 2026-08-01

Aprovado pelo João: corrigir Q1–Q6, aceitar Q7 como débito, e fechar o achado aberto da Task 9.

- **Q1 (`useClientForm` espalhava `photo_url` no payload) — FALSO POSITIVO, corrigido no relatório.**
  A segunda lente leu `DataFromArrayResolver` no vendor e concluiu 500 por `CannotSetComputedValue`;
  medido de verdade, o PUT com `photo_url` devolve **200**. O resolver desvia antes do throw quando a
  propriedade é promovida no construtor (`$property->isPromoted` → `continue`), que é o caso de
  `ClientData::$photo_url`. O payload passou a ser montado campo a campo mesmo assim (padrão dos
  outros 3 forms, não depender desse detalhe do pacote), mas **não existia o bug de golden path
  descrito** — nenhum edit de cliente com foto quebrava.
- **Q2 (mínimo de 1 contato não valia na rota nested) — corrigido.** Novo
  `DeleteClientContactAction` (mesma forma de `Create/UpdateClientContactAction`) recusa com `422`
  quando sobraria zero contato; `ClientContactController::destroy` passou a delegar.
- **Q3 (retry sem botão fora do caminho pós-create) — corrigido.** O gate saiu dos 4 diálogos
  (`onRetry={photo.onRetry}`) e desceu para `useEntityPhoto`, que devolve `onRetry: undefined`
  quando não há o que reenviar — assim o botão também não aparece no erro de TAMANHO, onde clicar
  não faria nada (efeito colateral que a correção ingênua nos chamadores teria criado).
- **Q4 (rota de foto do staff aceitava qualquer User) — corrigido.**
  `abort_unless($user->type === 'admin', 404)` no `UserPhotoController`, mesma guarda de
  `UserController::show/update/destroy`.
- **Q5 (`photo_path` fora de `$auditInclude`) — corrigido.** Sem ele o audit existia com
  `new_values` vazio: registrava que algo mudou, nunca qual objeto foi desvinculado.
- **Q6 (asserções inalcançáveis no teste de regressão crítico) — corrigido.** `expectException`
  trocado por `try/fail/catch`, e a asserção que agora roda revelou um segundo defeito no mesmo
  teste: `assertExists($old, 'mensagem')` — o 2º argumento é o CONTEÚDO esperado do arquivo, não uma
  descrição, então comparava o texto com os bytes do PNG.
- **Q7 (compensação pode apagar objeto já referenciado) — aceito como débito**, registrado em
  `docs/pendencias.md` como **P-24** com gatilho de expiração.
- **Task 9 (Cancelar/X durante o flush pós-create) — fechado.** `CrudDialog` ganhou `closeBlocked`,
  que bloqueia as três saídas (botão, X do header, ESC); os 4 diálogos passam
  `pending || photo.pending`.

Verificação da rodada: suíte **346 passed** (1076 assertions — 3 casos novos, todos vistos
reprovando contra o código antigo antes do fix), `pnpm build` + `pnpm lint` verdes, Pint limpo nos
6 arquivos backend tocados.

### Segundo review — sobre a própria rodada de correção (`34ab3c2`), 2026-08-01

Duas lentes de novo (Claude + `mcp__codex__codex` read-only sobre `34ab3c2`). Sem órfãos e **sem
achado 🔴** — os fixes aprovados se sustentam. 6 achados; o João aprovou Q-1 a Q-4 (commits
`35c6a35` e o do Q-4), e Q-5/Q-6 ficam registrados sem ação.

- **Q-1 — Salvar era a QUARTA saída do diálogo.** `closeBlocked` fechava Cancelar/X/ESC, mas o
  `onSubmit` segue fechando o diálogo no `onSuccess`: salvar em edit durante o upload levava à mesma
  perda silenciosa pela outra porta. Os 4 diálogos passaram a gatear `disabled` por `photo.pending`,
  e a prop `closeBlocked` documenta que as duas andam juntas.
- **Q-2 — retry ressurgindo no erro de TAMANHO.** `useEntityPhoto` devolve `onRetry: undefined`
  enquanto houver `sizeError`: o erro exibido passa a ser o de tamanho, mas `buffered`/`retryId`
  ainda guardavam a tentativa anterior, então o botão reenviaria um arquivo que não é o escolhido.
- **Q-3 — o teste do Q5 provava menos do que o Q5 pedia.** Novo caso cobre o rastro do objeto
  DESVINCULADO (`old_values` na substituição e na remoção). **Durante a própria prova, o teste novo
  passou VAZIO**: sem `photo_path` no diff da auditoria, todos os valores viram `null` e
  `null === null` aprova tudo — foi preciso `assertNotNull` nos caminhos para que os 2 testes de
  auditoria fossem vistos reprovando. Lição 10 reaparecendo dentro do fix da própria lição 10.
- **Q-4 — a trava dura criada pelo gate.** A instância axios não tinha `timeout`, então uma
  requisição pendurada nunca resolvia e o `closeBlocked` prendia o usuário até recarregar a aba.
  `timeout: 120_000` (generoso de propósito: o teto de upload é 10 MB e o timeout do axios conta a
  requisição inteira, não a inatividade). O erro cai no ramo "sem resposta" do interceptor, vira
  `ProblemDetails` traduzido, e o gate abre sozinho.
- **Q-5 (🟢, sem ação) — check-then-act sem lock** no `DeleteClientContactAction`: `count()` +
  `delete()` sem transação. Desproporcional à concorrência real (~10 usuários internos).
- **Q-6 (🟢, sem ação) — mensagem do 422 em PT** num endpoint de cliente chileno. Inconsistência
  **pré-existente** do repo (Commercial em PT, Operation em ES), não introduzida aqui.

Divergência declarada entre as lentes: o Codex classificou Q-5 e Q-6 no mesmo nível dos demais;
Claude desceu ambos para 🟢 por proporcionalidade, e o João manteve.

Verificação da segunda rodada: suíte **347 passed** (1083 assertions), `pnpm build` + `pnpm lint`
verdes, Pint limpo.

**Parte A (Tasks 1–4, backend + `generated.ts`, executor Codex) — COMPLETA.** Commits `4dfe3a9`
(Task 4), `0c3039a` (Task 1), `c5476dc` (Task 2), `ec9c92a` (Task 3). Revisado por Claude (diff real
contra `paths_autorizados`, suíte rodada de novo — 340 passed, Pint limpo, `route:list --path=photo`
com as 8 rotas, `generated.ts` só com `photo_url` nas 4 interfaces certas). Dois achados reais
resolvidos durante a execução: GD do container sem suporte a JPEG (fixtures de teste trocados para
`.png`, decisão do João — zero impacto em produção) e `GET /api/students/{id}` devolve
`StudentDetailData`, não `StudentData` (teste corrigido para verificar `photo_url` via `GET
/api/students`, index — é o endpoint que o frontend de fato consome).

**Parte B (Tasks 5–12, frontend, executor Claude, `subagent-driven-development`) — COMPLETA.**
Commits `59c3794`..`d816980` (implementação) + `25cdbad`/`71d5f6d` (fixes de review). `AppAvatar`
com fallback duplo (D7), `AppPhotoField` + `useEntityPhoto` (buffer no create D10, flush nunca lança
D11, retry uniforme em qualquer modo após fix), avatar nas 4 tabelas, `AppPhotoField` nos 4 diálogos
(padrão único, `StudentDialog` sem avatar no header — D15), contatos do cliente em cards com
`removeContact` e mínimo de 1 preservado na UI (D12–D14). Todas as 8 tasks com review Approved
(2 exigiram fix antes de aprovar: Task 5 — `onImageError` sobrescrevível pelo caller; Task 7 —
`onRetry` não funcionava fora do caminho estreito pós-create).

**DoD (Task 12) provado contra API real, sessão Sanctum autenticada** (suíte 340 passed, Pint
limpo, `pnpm build`+`pnpm lint` verdes): upload/substituição/remoção de foto em `students` e
`clients` (logo), delete imediato do objeto anterior confirmado direto no storage (D4/J-02),
arquivo de 6.4MB rejeitado com `422`/RFC 7807 (nunca `413`), `PUT /api/clients/1` com
`contacts: []` rejeitado com `422` sem apagar os contatos existentes. Detalhe completo em
`.superpowers/sdd/progress.md`.

**2 achados críticos pós-DoD, durante a prova visual do João (commits `9197d08`, `b6dc068`):**

1. `UserPhotoService::store()` não checava falha de `UploadedFile::store()` (devolve `false`, não
   lança). Sem a checagem, `false` virava `photo_path='0'` no banco e o objeto anterior — que ainda
   funcionava — era apagado, achando que o update tinha dado certo. 2 clientes reais no banco de dev
   ficaram com `photo_path='0'`, limpos. Fix: aborta com `RuntimeException` antes de update/delete.
   Regressão provada via `chmod` real (não mock), vista reprovando contra o código antigo.
2. Causa da falha real: `AWS_ENDPOINT` precisa ser `http://minio:9000` (rede Docker) pra escrita
   funcionar do container, mas a URL pré-assinada resultante embute esse host — inalcançável pelo
   navegador. Não existe valor único que sirva pros dois lados (confirmado: trocar só o hostname na
   URL já assinada quebra a assinatura, `403 SignatureDoesNotMatch`). Fix (autorizado pelo João,
   toca arquivo fora do escopo original do bloco): `UploadFileAction::publicDiskFor()` assina leitura
   contra um disco `{disco}_public` separado (endpoint alcançável pelo navegador via novo
   `AWS_ENDPOINT_PUBLIC`), nunca usado pra escrever — mesmo choke point que documentos de
   redator/turma/orçamento já usavam, então também corrigiu a exibição deles (sem regressão: `GET
   /api/redatores/1` provado com `download_url` funcionando pós-fix). Sem a env var (prod), cai no
   mesmo disco de sempre — zero mudança fora do dev com MinIO. Suíte pós-fixes: 343 passed.

**Pendências que só o João resolve, antes do fechamento:**
- Prova visual do bloco (as 4 tabelas, os 4 diálogos, fallback de imagem indisponível, foto do
  create pós-save, cards de contato) nos dois temas, 1400px e 768px — agora incluindo o que a
  rodada de correção mudou: exclusão do último contato recusada, botão "Reintentar" numa falha de
  upload em edit, e Cancelar/X bloqueados enquanto a foto do create sobe.
- As 4 imagens de referência caller-held (`alumnos-exemplo-avatar`, `client-no-component-photo`,
  `redator-no-component-photo`, `alumnos-component-wrong-photo`) seguem não fornecidas nesta sessão.

**Review de risco declarado:** a Parte A muda contrato de escrita (`contacts` mínimo 1) e apaga
objeto de storage de forma irreversível; os 2 achados pós-DoD tocam a mesma classe de risco
(escrita de storage) mais um domínio compartilhado (`App\Shared\Files`, usado por 4+ domínios). A
segunda lente independente do fechamento cobre `4dfe3a9..b6dc068` inteiro, não só a Parte A
original.

> Histórico das decisões que desbloquearam o bloco durante o planejamento (2026-07-31, packet
> `blocked`→`partial` via `[J-02]`) está preservado em `.superpowers/sdd/progress.md` e no packet
> arquivado; superado pela execução completa acima.

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
