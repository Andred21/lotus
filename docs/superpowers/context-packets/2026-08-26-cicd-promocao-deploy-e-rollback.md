---
schema_version: 1
packet_id: ctx-cicd-promocao-deploy-e-rollback
block_id: cicd-promocao-deploy-e-rollback
status: blocked
generated_at: 2026-08-26T17:25:48-03:00
base_ref: cicd/promocao-deploy-e-rollback
base_commit: 655b9796537fa87d4011a5983605635f7d0e5ec1
state_path: docs/superpowers/state.md
state_blob_sha: 7a373e3744c552ee2ac76062aa081655ef67afc6
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 1365f40d28f04c3108c28cf7cf456d64e7db72a5
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Promoção, deploy e rollback por SHA

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** substituir build na VM por promoção manual, serial e auditável do par já testado no GHCR, com deploy e rollback identificados por SHA.
**Non-goals:** provisionar AWS; decidir DNS/TLS/HA; rebuildar na EC2; Kubernetes, ECS/Fargate, ArgoCD ou CodePipeline; automatizar rollback após migration incompatível.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| CURRENT | Instrução atual | `cicd-promocao-deploy-e-rollback`, item 12 | 2026-08-26 | retrieved | escopo, DoD e perguntas obrigatórias |
| REPO-STATE | Repository | `state.md@7a373e3`; `progress.md@1365f40`; `backlog.md`; ADR-13/14; P-62 | HEAD `655b9796` | retrieved | estado, fila, arquitetura e plano GitHub |
| REPO-PRED | Repository | specs/plans/packets arquivados dos itens 10–11; `.github/workflows/ci.yml`; `scripts/espelhar-corporativo.sh`; `docker-compose.prod.yml`; `backend/.env.production.example` | HEAD `655b9796` | retrieved | contrato do artefato/runtime e limitações herdadas |
| DRIVE-AWS | Google Drive | ID `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI` — `arquitetura-aws-lotus.md` | 2026-06-22T20:17:27Z | retrieved | alvo AWS, sizing, região, DNS/SES e custo |
| DRIVE-ADR | Google Drive | ID `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` — `decisao-stack.md` | 2026-07-31T16:15:51.504Z | retrieved | ADR-13/14 e deploy |
| DRIVE-SETUP | Google Drive | ID `1L8vq7Pp1xFBSvzyISg5sw6SVVihzSR5l` — `SETUP_AMBIENTE_LOTUS.md` | 2026-06-24T15:37:08Z | retrieved | distinguir ambiente local de produção |
| GITHUB-CORP | GitHub | repository ID unavailable after failed call; locator `Gatika-CL/lotus`, ref `cicd/promocao-deploy-e-rollback` | n/a | unavailable — call failed: `GitHub API error 404: {"message":"Not Found","documentation_url":"https://docs.github.com/rest/repos/repos#get-a-repository","status":"404"}` | validar ref, Environment e destino de deploy |
| NOTION-10.1.7 | Notion | page ID `388bc960-3dfa-812e-a9fe-caf1b0449257`; collection ID `e64b7d57-d000-4433-b652-a410e75193cc` | snapshot 2026-08-14T18:41:17.916Z | retrieved | task 10.1.7 e aceite organizacional |

## Key facts

1. A lane está em `context_required`, com spec/plano/packet nulos; branch e HEAD conferem, a árvore está limpa. `[REPO-STATE]`
2. O release promovível é o par `ghcr.io/gatika-cl/lotus-app:<sha>` + `lotus-web:<sha>`, sem `latest`; no corporativo, `<sha>` é o commit sintético de `Gatika-CL/main`, enquanto `Source-Commit` preserva o SHA da origem. `[REPO-PRED]`
3. A ref corporativa pedida não está nas refs remotas locais; `upstream/main@3d158773` é apenas snapshot local, e a leitura viva do repositório privado falhou com 404. Configuração atual de Environment, secrets e branches não foi comprovada. `[REPO-PRED]` `[GITHUB-CORP]`
4. Não há destino de deploy estabelecido por evidência: o item 10 de provisionamento segue na fila, os documentos descrevem futuro/sugestões, o Notion está `A fazer`, e não há IaC, host/IP, usuário SSH ou bootstrap de `/opt/lotus` no ref. Logo `SSH EC2 → pull → migrate → up` não pode ser provado hoje. `[REPO-STATE]` `[DRIVE-AWS]` `[DRIVE-SETUP]` `[NOTION-10.1.7]`
5. As quatro decisões continuam abertas: região, tamanho final da EC2, controle de DNS/SES mais canal de alerta, e teto de custo; busca canônica encontrou somente o documento AWS ainda marcado `[A CONFIRMAR]`. `[REPO-STATE]` `[DRIVE-AWS]`
6. O alvo arquitetural, quando existir, é uma EC2 única com Compose; RDS é externo, os segredos vivem fora da imagem, o runtime lê `/opt/lotus/.env`, e `/up` atravessa Nginx→FPM. DNS não integra o deploy normal e TLS pertence ao provisionamento. `[CURRENT]` `[DRIVE-ADR]` `[REPO-PRED]`
7. `Gatika-CL` está no plano Free privado: branch protection ficou COMPENSATED, e required reviewers de Environment não podem ser usados como gate. O substrato disponível é Actions/GHCR; aprovação deve ser o despacho manual explícito do workflow, com secrets de repositório e `concurrency` serial, sem alegar gate protegido. `[CURRENT]` `[REPO-PRED]`
8. Drive só diz que migrations rodam da EC2 contra RDS; Notion pede deploy reproduzível em um comando. Nenhuma fonte externa acrescenta regra de compatibilidade/rollback. O contrato vigente limita rollback ao par de SHA anterior compatível; migration incompatível exige estratégia separada. `[CURRENT]` `[DRIVE-AWS]` `[NOTION-10.1.7]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Deploy | Drive/Notion prescrevem `git pull → build → migrate → restart`. `[DRIVE-ADR]` `[NOTION-10.1.7]` | Promover o par GHCR já testado, sem rebuild. | Instrução atual posterior + artefato entregue no item 11. `[CURRENT]` `[REPO-PRED]` |
| Identidade | Fontes antigas falam em uma “imagem”. | Release é o par no mesmo SHA corporativo; `Source-Commit` é rastreio, não tag de deploy. | Consumidor vigente e CI do item 11. `[REPO-PRED]` |
| Aprovação | Backlog pede Environment + aprovação; Free privado não oferece required-reviewer gate. | Usar disparo manual como ato de aprovação, `concurrency=1` e secrets de repositório; não prometer Environment protegido. | Limitação medida em P-62 + instrução atual. `[CURRENT]` `[REPO-PRED]` |
| Destino | Drive desenha EC2 futura; repo exige EC2 real. | **Unresolved/blocking:** não há identidade nem acesso de host comprovados. | Nenhuma das cinco fontes externas fornece o recurso real. |

## Constraints

- Só SHA cujo job `image` terminou verde e publicou os dois manifestos pode ser selecionado.
- Um deploy por vez; não cancelar execução em andamento.
- Ordem: `compose pull` do par → migration única → `up` → `/up`; sem build ou `git pull` na VM.
- Persistir em produção o SHA corporativo efetivo e manter o anterior; não registrar apenas o SHA-fonte.
- Rollback automático para em incompatibilidade de schema; DNS/TLS/HA ficam fora.

## External acceptance signals

- Release manual seleciona SHA completo existente, chega uma vez ao host, termina com `/up` 200 e o registro de produção coincide com o par em execução. `[CURRENT]`
- Rollback seleciona SHA anterior declarado compatível, repuxa o par, sobe, passa `/up` e atualiza o registro. `[CURRENT]`
- Nenhuma etapa recompila na EC2; falha antes do health não é registrada como sucesso. `[CURRENT]`

## Open questions

- **Blocking:** qual é o alvo real — conta/região, instance ID/host, usuário/host key SSH, diretório, Docker/Compose e credencial read-only do GHCR?
- **Blocking upstream:** quando e onde serão decididos região, EC2, DNS/SES/alerta e teto de custo, e quando o item 10 provisionará o host?
- Para o planejamento após desbloqueio: qual evidência declara dois SHAs schema-compatíveis, e qual formato/local atômico registra SHA atual/anterior?
- Confirmar que o despacho manual por ator autorizado satisfaz “approval production” enquanto o plano permanecer Free.

## Deferred

- Estratégia de rollback para migration incompatível.
- AWS/RDS/S3/SES, DNS, TLS, CloudWatch e o conflito RNF-DIS-02 × ADR-14.
- GitHub Team e gates protegidos; Kubernetes/ECS/ArgoCD/CodePipeline.

## Staleness triggers

- Um alvo AWS real ser provisionado ou sua identidade/acesso mudar.
- João fechar qualquer das quatro decisões AWS ou o contrato de aprovação/migration.
- O plano GitHub/configuração do repositório privado tornar-se legível ou mudar.
- O contrato do par GHCR, do espelho, do Compose, do health ou do registro de SHA mudar.
