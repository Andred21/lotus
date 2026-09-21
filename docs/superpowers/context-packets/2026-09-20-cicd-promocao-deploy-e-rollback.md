---
schema_version: 1
packet_id: ctx-cicd-promocao-deploy-e-rollback
block_id: cicd-promocao-deploy-e-rollback
status: partial
generated_at: 2026-09-20T21:56:27-03:00
base_ref: cicd/promocao-deploy-e-rollback
base_commit: ba22ddce7d72e4b16ce669f8ee639f7484eff6b1
state_path: docs/superpowers/state.md
state_blob_sha: 4e8bf5997c6c00a2b618aabd87184c0d649b410d
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 96c4c78808c33ac9892189b2441ead0404223972
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Promoção, deploy e rollback por SHA

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** promover manualmente, de forma serial e auditável, o conjunto já aprovado no GHCR para a produção existente, com deploy e rollback reproduzíveis por SHA.

**Non-goals:** provisionar ou redimensionar AWS; alterar DNS/TLS, certificados ou PDFs; consolidar migrations; rotacionar credenciais de provisionamento; rebuildar ou manter working tree na EC2; Kubernetes, ECS/Fargate, ArgoCD ou CodePipeline; automatizar rollback de migration incompatível.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| CURRENT | Instrução atual | `cicd-promocao-deploy-e-rollback`, item 12 | 2026-09-20 | retrieved | escopo, refresh e limites |
| REPO-STATE | Repository | `state.md@4e8bf59`; `progress.md@96c4c78`; `backlog.md`; `origin/main@cff022d4` | HEAD `ba22ddce` | retrieved | estado, DoD e proveniência |
| REPO-CI | Repository | `.github/workflows/ci.yml`; `scripts/espelhar-corporativo.sh`; `scripts/provar-release.sh`; histórico dos itens 11 e 20 | HEAD `ba22ddce` | retrieved | gates, espelho e conjunto GHCR |
| REPO-PROD | Repository | `deploy/aws/`; `deploy/bin/`; `deploy/nginx/`; `docker-compose.prod*.yml`; histórico do item 10 v2 | 2026-09-20 | retrieved | host, runtime, deploy e health |
| REPO-PEND | Repository | `docs/adrs.md`; fichas P-05, P-62 e P-77–P-81 | 2026-09-20 | retrieved | restrições e escopo adiado |
| REPO-OLD | Repository | `docs/superpowers/context-packets/2026-08-26-cicd-promocao-deploy-e-rollback.md` | 2026-08-26 | retrieved | baseline bloqueado e gatilho vencido |
| DRIVE-AWS | Google Drive | file ID `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI` | n/a | unavailable — call failed: `user cancelled MCP tool call` | planejamento AWS canônico |
| DRIVE-ADR | Google Drive | file ID `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` | n/a | unavailable — call failed: `user cancelled MCP tool call` | decisões de stack/deploy |
| DRIVE-SETUP | Google Drive | file ID `1L8vq7Pp1xFBSvzyISg5sw6SVVihzSR5l` | n/a | unavailable — call failed: `user cancelled MCP tool call` | separação local/produção |
| GITHUB-CORP | GitHub | repository ID unavailable after failed call; locator `Gatika-CL/lotus` | n/a | unavailable — call failed: `GitHub API error 404: {"message":"Not Found","documentation_url":"https://docs.github.com/rest/repos/repos#get-a-repository","status":"404"}` | configuração viva de Environment, secrets e proteção |
| NOTION-10.1.7 | Notion | page ID `388bc960-3dfa-812e-a9fe-caf1b0449257`; collection ID `e64b7d57-d000-4433-b652-a410e75193cc` | 2026-08-14T18:41:17.916Z | retrieved | aceite organizacional |

## Key facts

1. A lane está limpa em `context_required`, com spec, plano e packet nulos; branch e HEAD conferem com o estado comprometido. `[REPO-STATE]`
2. O bloqueio anterior expirou: existe produção em `sa-east-1`, EC2 `t4g.small`, EIP `18.230.53.197`, runtime em `/opt/lotus` e `/up` 200 provado pelo item 10 v2. `[REPO-PROD]` `[REPO-OLD]`
3. O release não é mais o par antigo: é o trio corporativo `lotus-app`, `lotus-web` e `lotus-clamav`, todos multi-arch e sob o mesmo SHA sintético de `Gatika-CL/main`; `Source-Commit` preserva a origem pessoal. `[REPO-CI]`
4. O job `image` só publica após backend, frontend, types-drift, audit-prod, audit-dev e procedência; tags completas de SHA não são deliberadamente reescritas. `[REPO-CI]`
5. `deploy.sh <sha>` já valida os três manifestos, faz `pull → migrate → up`, exige nginx healthy e `/up` 200, compara imagens puxadas e executadas e só então grava `CURRENT_SHA`; não faz build nem `git pull`. `[REPO-PROD]`
6. O mecanismo ausente é a promoção remota governada e o rollback auditável: hoje só há `CURRENT_SHA`, sem registro atômico do anterior nem workflow manual de deploy. `[REPO-CI]` `[REPO-PROD]`
7. A configuração viva do GitHub corporativo continua ilegível pelo conector. Environment, secrets e protection não podem ser declarados existentes; isso é parcial, não bloqueante, porque o repositório define aprovação manual, serialização e os contratos do host e do artefato. `[GITHUB-CORP]` `[REPO-STATE]` `[REPO-PEND]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Destino | O packet antigo bloqueava por ausência de host. `[REPO-OLD]` | Produção existe e foi provada; o bloqueio está resolvido. | Item 10 v2 posterior e artefatos atuais. `[REPO-PROD]` |
| Release | O packet antigo tratava app+web como par. `[REPO-OLD]` | Release é o trio app+web+clamav no mesmo SHA corporativo. | Workflow, Compose e deploy atuais. `[REPO-CI]` `[REPO-PROD]` |
| Mecanismo | Notion ainda pede `git pull → build → migrate → restart` e marca a task `A fazer`. `[NOTION-10.1.7]` | Promover imagens já testadas, sem build ou working tree no host. | Instrução atual posterior e implementação entregue pelos itens 11, 20 e 10. `[CURRENT]` `[REPO-CI]` `[REPO-PROD]` |
| Aprovação | A configuração viva do GitHub não pôde ser lida. `[GITHUB-CORP]` | Aprovação manual e `concurrency=1` são requisitos; nenhum gate protegido será alegado sem readback. | Backlog atual e limitação P-62. `[REPO-STATE]` `[REPO-PEND]` |

## Constraints

- Aceitar somente SHA corporativo completo cujo job `image` terminou verde e cujos três manifestos existem.
- Um deploy por vez, sem cancelar execução em andamento; secrets ficam fora do repositório.
- A promoção deve invocar o caminho versionado do host, sem duplicar sua sequência no workflow.
- Migration ocorre antes do health; rollback de aplicação só para SHA declarado compatível com o schema presente.
- Não usar a access key de provisionamento da P-81 como credencial de deploy.
- P-77 não bloqueia: o deploy funciona pelo EIP; DNS/TLS continuam fora. P-05, P-78, P-79 e P-80 não ampliam este bloco.

## External acceptance signals

- Despacho manual identifica um SHA completo aprovado, executa uma vez e não recompila no host.
- Sucesso exige `/up` 200, trio executado igual ao trio puxado e registro do SHA somente após todos os gates.
- Rollback seleciona o SHA anterior compatível, repete a mesma prova e deixa corrente/anterior auditáveis.
- Falha antes do health não pode registrar a promoção como concluída.

## Open questions

- Qual formato e operação atômica registrarão SHA corrente, anterior e histórico?
- Qual evidência objetiva declarará dois SHAs compatíveis com o schema para autorizar rollback?
- Quais Environment, secrets, atores autorizados e host key existem hoje no GitHub corporativo? O planejamento deve incluir readback sem presumir proteção.

## Deferred

- Rollback de migration incompatível e consolidação da P-05.
- DNS/TLS da P-77 e separação estrutural da URL do QR da P-79.
- Resize/teto de custo da P-80, rotação da P-81 e paginação da P-78.
- Branch protection/GitHub Team da P-62 e plataformas de orquestração gerenciada.

## Staleness triggers

- Escopo ou DoD do item 12 mudar semanticamente.
- Contrato do trio GHCR, espelho, `deploy.sh`, Compose, health ou registro de SHA mudar.
- Identidade, acesso ou layout operacional do host de produção mudar.
- GitHub corporativo tornar-se legível e contradizer a aprovação, serialização ou disponibilidade aqui registradas.
- Uma decisão de P-05, P-62, P-77, P-80 ou P-81 alterar materialmente as restrições deste bloco.
- Spec ou plano posterior reabrir as decisões reconciliadas sobre identidade do release ou ausência de build no host.
