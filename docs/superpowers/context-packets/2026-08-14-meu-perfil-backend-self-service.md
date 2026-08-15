---
schema_version: 1
packet_id: meu-perfil-backend-self-service-2026-08-14
block_id: meu-perfil-backend-self-service
status: ready
generated_at: 2026-08-14T18:48:32-03:00
base_ref: feat/meu-perfil-backend-self-service
base_commit: 8964777024e84c43f35c0afa2f5e18430fdd7245
state_path: docs/superpowers/state.md
state_blob_sha: 7af48af249fec7dbb74177836d4f50c7401f2ef1
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: a494bf838e6fb1815a6c750d981578b467f13e1f
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

> **Nota do revisor (Claude, 2026-08-14, na validação):** uma única emenda ao texto devolvido pelo
> Codex — o terceiro bullet de `## Constraints` afirmava as 15 linhas do dashboard em
> `DomainDependencyTest.php` **sem chave de fonte**, e o contrato da skill exige que todo fato
> externo cite uma. A chave `[DASH]` foi acrescentada; o fato em si foi **remedido e confere**
> (`git diff --numstat main...HEAD` na árvore do dashboard devolve `15 0`). O resto é verbatim.
>
> **O que foi remedido pelo revisor, não aceito de chegada:** `base_commit`, `state_blob_sha` e
> `progress_blob_sha` (os três batem); o HEAD do dashboard (`4b3d6e3f7c49…`, árvore limpa — o Codex
> corrigiu a instrução, que trazia `8c53f60` com WIP, porque a branch avançou entre as duas
> medições); `+146` em `generated.ts` e `+15` na allowlist; a existência de `UserPhotoService` e
> `StoreRedatorDocumentAction`; o docblock de `RedatorDocumentData.php:12-13` que sustenta a linha
> "Validade documental" da tabela de divergências; o Drive por file ID, com a §5 dizendo
> **verbatim** que a regra de validade/idoneidade fica no backend; e a EAP 8.5.1 no Notion, com
> `Camada: Backend` e ancorada na collection **canônica** `e64b7d57-…`, não na obsoleta
> `6adbc960-…` que produziu as 12 falsas divergências de 2026-07-30.

# Context Packet — Meu Perfil · backend self-service

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** entregar no domínio Identity o contrato e as operações backend de Meu Perfil para Admin e Redator: leitura própria, atualização self-owned de nome/telefone/foto, alteração da própria senha, documentos profissionais self-owned do Redator, resumo profissional compacto e testes. `[GD-PROFILE][NT-EAP]`

**Non-goals:** página/hook/UI review do bloco frontend; administração de terceiros; alteração de e-mail, RUT, role, permissões, `type` ou `is_active`; recuperação pública de senha, 2FA ou gestão de sessões; CRUD de habilitação; histórico, filtros, rankings ou séries do Dashboard; novos campos pessoais, novo domínio `Profile` ou schema sem requisito novo. `[JOAO][GD-PROFILE]`

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| JOAO | João Victor | instrução atual para `meu-perfil-backend-self-service` | 2026-08-14 | authoritative | Fronteira do bloco, campos proibidos, paralelismo e operação read-only |
| GD-PROFILE | Google Drive | file `1lI3IEOx9_2H093TvhkfO16_hhO9LxFvI` — `meu-perfil-escopo-funcional.md`; localizado pela pasta Planejamento `1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3` | 2026-08-14T18:37:45.283Z | retrieved by ID | Escopo canônico, segurança, arquitetura, não objetivos e DoD |
| NT-DB | Notion | collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | não exposto pelo conector | retrieved by ID | Base canônica e schema das tasks |
| NT-EAP | Notion | 8.5.1 `3b1bc960-3dfa-8148-b646-d019ff354623`; 8.5.2 `3b1bc960-3dfa-8196-8ff1-f2802994cc13`; 8.5.3 `3b1bc960-3dfa-8181-a39d-f34752c1b98f`; 8.5.4 `3b1bc960-3dfa-8181-a71b-f96b85fbc709`; 8.5.5 `3b1bc960-3dfa-81e6-914f-ed4f228b1632`; 8.5.6 `3bcbc960-3dfa-8137-a7f3-df9ab8df33e5`; 8.5.7 `3bcbc960-3dfa-8123-bb33-f91532f6b38b`; 8.5.8 `3bcbc960-3dfa-81c7-9018-d783e2fe73c7`; 8.5.9 `3bcbc960-3dfa-8195-8397-d1581ce0d854` | não exposto; `createdTime` 2026-08-03/2026-08-14 | retrieved through canonical collection ID | Sequência, dependências e critérios EAP 8.5.1–8.5.9 |
| LOCAL | Git/repositório | `8964777024e84c43f35c0afa2f5e18430fdd7245`; backlog, ADRs, DER, rules e superfície Identity/Operation | 2026-08-14T18:41:35-03:00 | retrieved; tree clean | Contratos, schema, rotas, serviços e guardrails atuais |
| DASH | Git/worktree | `/home/jvbat/projetos/lotus`, `feat/dashboard-backend-agregacoes@4b3d6e3f7c4950f02aadd64f2f143b6c556ef43c` | 2026-08-14T18:46:42-03:00 | retrieved; tree clean | Estado paralelo e sobreposição medida |

## Key facts

1. Meu Perfil permanece em `App\Domains\Identity`, com contrato `#[TypeScript]` próprio; não criar `Domains/Profile` nem transformar o `SessionUserData` atual, com 9 campos, no payload pesado da página. `[GD-PROFILE][NT-EAP][LOCAL]`
2. A mutation pessoal usa whitelist explícita para `name`, `phone` e foto e opera sempre sobre o usuário autenticado. Payload forjado com e-mail, RUT, RBAC, `type`, `is_active` ou qualquer atributo administrativo deve falhar deterministicamente no backend. `[JOAO][GD-PROFILE][NT-EAP]`
3. A própria senha muda em endpoint/action separados, exigindo senha atual, nova senha e confirmação; não altera terceiros, não transporta outros campos e não expõe senha/hash em resposta ou auditoria. `[GD-PROFILE][NT-EAP]`
4. O Redator gerencia somente seus documentos CV, REUF, título e pós-graduação, usando URLs temporárias e a infraestrutura existente, sem receber `identity.user.update`; tentativa sobre outro Redator deve falhar. `[GD-PROFILE][NT-EAP]`
5. O resumo do Redator contém somente cursos habilitados, atividade atual/próxima e pendências prioritárias. Regras e classificações devem ter fonte comum com o Dashboard, sem listas completas, filtros, séries, N+1 ou cálculo de domínio no React. `[JOAO][GD-PROFILE][NT-EAP]`
6. O schema atual já contém `users` com os campos pessoais/credencial, extensão `redatores`, documentos polimórficos, habilitações e designações; as fontes não justificam migration nem novo campo para este bloco. `[GD-PROFILE][LOCAL]`
7. O bloco backend corresponde às EAP 8.5.1, 8.5.2, 8.5.3, 8.5.6, 8.5.7 e 8.5.8; hook, página e UI review das EAP 8.5.4, 8.5.5 e 8.5.9 ficam no bloco frontend posterior. `[NT-EAP]`
8. O aceite backend exige testes de Admin/Redator, ownership, campos forjados, senha, foto, documentos, vazio e ausência de N+1, além da regeneração oficial dos tipos TypeScript. `[GD-PROFILE][NT-EAP]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Rotas administrativas existentes | Foto/documentos atuais usam IDs de terceiros e `identity.user.update`. `[LOCAL]` | Reutilizar serviços/actions/storage, mas criar superfície self-owned separada; não abrir a permissão administrativa ao Redator. Paths exatos ficam para a spec. | Ownership explícito e separação administrativa são requisitos coincidentes do Drive e das EAP 8.5.2/8.5.6. `[GD-PROFILE][NT-EAP]` |
| Validade documental | `RedatorDocumentData` afirma que vigente/por vencer/vencido é derivado no frontend. `[LOCAL]` | O contrato de Meu Perfil deve fornecer classificação semântica calculada pelo backend; não perpetuar o cálculo no React. | Drive canônico posterior atribui validade/idoneidade ao backend, apoiado pela EAP 8.5.3/8.5.6. `[GD-PROFILE][NT-EAP]` |
| Estado do dashboard paralelo | A instrução registrava `8c53f60` com WIP não commitado. `[JOAO]` | Snapshot usado: `4b3d6e3f7c4950f02aadd64f2f143b6c556ef43c`, árvore limpa; `generated.ts` e `DomainDependencyTest.php` já estão commitados. | A instrução exige re-medição; Git foi consultado às 2026-08-14T18:48:32-03:00. `[DASH]` |

## Constraints

- Sanctum permanece cookie/CSRF; somente `admin` e `redator` autenticam; erros pertencem ao handler RFC 7807. `[LOCAL]`
- `generated.ts` nunca é editado à mão. O dashboard já soma 146 linhas nele versus `main`; este bloco também o regenerará, portanto a integração exige regeneração final contra o backend combinado. `[DASH][GD-PROFILE]`
- O dashboard já soma 15 linhas em `DomainDependencyTest.php`. Qualquer aresta de Identity para Catalog/Operation deve refletir apenas imports reais; não acoplar Identity a uma API instável do domínio Dashboard nem duplicar suas regras. `[DASH]`
- Planejar sobre os mecanismos existentes de `UserPhotoService`, `StoreRedatorDocumentAction`, morph map, auditoria e relações de Redator; schema novo exige nova evidência e consulta a `docs/adrs.md`/`docs/der-fisico.md`.
- A árvore deste bloco e a árvore paralela estavam limpas na medição; nenhuma alteração foi realizada.

## External acceptance signals

- Contrato próprio gera TS sem ampliar `SessionUserData`; Admin não recebe a carga específica de Redator. `[GD-PROFILE][NT-EAP]`
- Campos proibidos e ownership são provados por requests adversariais, não por campos escondidos na UI. `[GD-PROFILE][NT-EAP]`
- Senha atual incorreta falha; sucesso usa hashing do framework e não vaza segredo. `[NT-EAP]`
- Documento de outro Redator falha; download é temporário; validade/idoneidade vem pronta do backend. `[GD-PROFILE][NT-EAP]`
- Resumo é compacto, self-scoped e sem N+1; Dashboard conserva a profundidade operacional. `[GD-PROFILE][NT-EAP]`

## Open questions

- None blocking.
- Fechar paths HTTP e a forma exata do contrato sem conflitar com `/api/me`.
- Definir vocabulário/limiar de "vence em breve", janela de próximas turmas e prioridade das pendências.
- Definir o seam estável compartilhado com o Dashboard paralelo sem criar dependência circular.
- Decidir remoção self-service por tipo documental e efeito sobre idoneidade.
- Definir atualização da sessão/shell após nome/foto e política de sessão após troca de senha.

## Deferred

- EAP 8.5.4, 8.5.5 e 8.5.9 e todo o bloco `meu-perfil-frontend`.
- Rate limit da troca de senha com a task 9.1.1 antes de produção; recuperação pública, 2FA e sessões/dispositivos.
- Listas, filtros, agenda completa, histórico e séries do Dashboard.

## Staleness triggers

- `active_work_item`, `active_spec` ou `active_plan` mudar semanticamente o escopo.
- O Drive `1lI3IEOx9_2H093TvhkfO16_hhO9LxFvI` ou qualquer página EAP 8.5.1–8.5.9 alterar escopo, aceite ou ownership.
- O dashboard paralelo integrar ou mudar semanticamente os contratos/regras compartilháveis, `generated.ts` ou a allowlist antes de o plano fixar a base.
- Código relevante mudar campos de `User`, documentos/foto, regras de validade, relações de Redator ou contratos de autenticação.
- Uma decisão da tabela de divergências ser reaberta.
