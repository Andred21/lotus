---
schema_version: 1
packet_id: 2026-08-24-cicd-ci-governanca-e-artefato
block_id: cicd-ci-governanca-e-artefato
status: partial
generated_at: 2026-08-24T21:13:06-03:00
base_ref: cicd/ci-governanca-e-artefato
base_commit: 91e7f47133df556f0ac4c29e2577427b031d20b9
state_path: docs/superpowers/state.md
state_blob_sha: bfa6b8baf13e9686390333d0ac235b1886c8360f
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 9b2a4c7c29e6b07fa386e51c9250138adcaea2b0
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — CI de governança + artefato imutável

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** estabelecer CI pessoal rápida e CI corporativa obrigatória; executar testes backend, instalação frontend congelada, lint/test/build, auditorias de dependências e a catraca D-08; publicar os artefatos de produção imutáveis identificados pelo commit SHA.

**Non-goals:** provisionar ou depender de AWS; promover/deployar na EC2; criar `develop` sem staging real comprovado; representar worktrees no remoto; ampliar a guarda para as leis §5.4/5.5/5.7/5.8.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| LOCAL-STATE | Repository | `docs/superpowers/state.md`; `docs/superpowers/backlog.md`; `CLAUDE.md` | base commit | available | estado, escopo, D-08 e prioridade |
| LOCAL-RUNTIME | Repository | `docker/Dockerfile.prod`; `docker-compose.prod.yml`; `frontend/tests/compose-prod.test.ts`; `frontend/src/shared/api/axios.ts`; `frontend/vite.config.ts` | base commit | available | contrato da imagem e URL do bundle |
| LOCAL-ADR | Repository | `docs/adrs.md` ADR-13/ADR-14 | base commit | available | Compose e deploy EC2 |
| LOCAL-TREE | Git | árvore de `HEAD`, remotes, worktrees e histórico de `.github/workflows` | base commit | available | topologia e workflows existentes |
| GH-CORP | GitHub | repository ID unavailable; locator `Gatika/lotus` | n/a | unavailable | `get_repo` decisivo: `GitHub API error 404 ... Not Found`; busca instalada retornou `[]` |
| GH-WORKBENCH | GitHub | repository ID `1283278382`, node ID `R_kgDOTH1GLg`; PR `#66` | 2026-08-24T22:27:07Z | partial | branches, fork, rulesets, workflows e postura pública |
| DRIVE-ADR | Google Drive | file ID `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw`, `decisao-stack.md` | 2026-07-31T16:15:51Z | available | CI/CD, entrega e ambiente de produção |
| DRIVE-ENV | Google Drive | file ID `1L8vq7Pp1xFBSvzyISg5sw6SVVihzSR5l`, `SETUP_AMBIENTE_LOTUS.md` | 2026-06-24T15:37:08Z | available | ambiente local e deploy único |
| NOTION-10 | Notion | collection ID `e64b7d57-d000-4433-b652-a410e75193cc`, database ID `7e55d684-cdd4-4bf3-b152-e15ce70d324b`; pages `10.1.5` ID `388bc960-3dfa-810e-b1eb-f66936836cf2` e `10.1.7` ID `388bc960-3dfa-812e-a9fe-caf1b0449257` | snapshots as of 2026-08-14 | available | tasks 10.1.x e status |

## Key facts

1. `state.md` confirma `lane-b`, `context_required`, item ativo correto e ponteiros de packet/spec/plano nulos. A árvore estava limpa; `HEAD` e hashes foram medidos. `[LOCAL-STATE]`
2. A topologia desejada ainda não existe: só há remote `origin` para o repository ID `1283278382`; não há `upstream`, e o GitHub declara esse repositório público como `fork:false`. Nem branches locais nem as 64 branches retornadas do repositório pessoal incluem `develop`. `[LOCAL-TREE]` `[GH-WORKBENCH]`
3. O repositório corporativo não pôde ser identificado por ID nem lido. Portanto branches, `develop`, rulesets/protection, required checks, Environments, nomes de secrets/variables, Actions, permissões de `GITHUB_TOKEN` e GHCR corporativo são desconhecidos, não ausentes. `[GH-CORP]`
4. No repositório pessoal, `main` aparece com `protected:false`, rulesets retornam `[]`, e o commit atual de `main` não tem workflow runs nem statuses. O detalhe de branch protection falhou com `403 Resource not accessible by integration`; Environments, Actions permissions, token permissions, secrets, variables e GHCR falharam com `HTTPError: 400: GitHub Fetch URL is not an allowed public GitHub repository or search endpoint.` `[GH-WORKBENCH]`
5. Não existe `.github/` nesta árvore; `git log --all -- .github/workflows` é vazio. A listagem de arquivos da PR `#66` do BD-15 também não contém `.github/workflows`, e o conteúdo remoto de `main` retorna 404 para esse diretório. Qualquer workflow do item 11 será novo; o aviso de sobreposição do estado não corresponde ao artefato medido. `[LOCAL-TREE]` `[GH-WORKBENCH]`
6. O runtime exige contexto de build na raiz, nenhum `ARG`, um Dockerfile e dois alvos/imagens: `app` e `web`, consumidos separadamente por `LOTUS_IMAGE` e `LOTUS_WEB_IMAGE`. O estágio SPA fixa `VITE_API_URL=""`; `axios.ts` continua lendo `import.meta.env.VITE_API_URL`, preservando mesma origem e promoção por SHA. `[LOCAL-RUNTIME]`
7. D-08 cobre somente §5.3: regenerar `typescript:transform`, reprovar drift do `frontend/src/shared/types/generated.ts` e provar por sonda que uma edição manual falha nomeando o arquivo. O lint atualmente apenas ignora o gerado; as outras sub-leis sem guarda não entram. `[LOCAL-STATE]`
8. Notion mantém `10.1.1–10.1.8` em `A fazer`, não possui task de CI/GitHub, chama a imagem multi-stage de `10.1.5` e ainda prescreve em `10.1.7` `git pull → build → migrate → restart`. Drive igualmente registra SSH/manual primeiro e Actions "quando incomodar"; nenhum dos dois comprova staging separado. `[NOTION-10]` `[DRIVE-ADR]` `[DRIVE-ENV]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| CI agora | Drive adia pipeline completo | item 11 exige CI/CD e artefato SHA agora | instrução explícita atual vence o snapshot Drive |
| Runtime | Notion `10.1.5` permanece `A fazer` | runtime fechou na PR #67 e já existe | repositório/progresso atual vencem Notion organizacional stale |
| Deploy | Notion `10.1.7` recompila no servidor | item 11 só produz artefato; promoção é item 12 | recorte explícito do backlog; AWS não é dependência |
| Workflows BD-15 | estado alerta sobre `.github/workflows` | nenhum workflow existe ou foi tocado na PR #66 | árvore de `base_commit`, histórico Git e PR medida |
| Artefato singular | escopo usa "imagem" no singular | contrato runtime produz o par `app` + `web` do mesmo SHA | `docker-compose.prod.yml` e os dois targets são o consumidor vigente |
| Upstream corporativo | GitHub corporativo inacessível | topologia permanece objetivo não comprovado | não resolver sem repository ID e leitura efetiva |

## Constraints

- Não nomear checks, Environments, secrets, variables, permissões ou pacote GHCR como existentes.
- O acesso corporativo ausente é restrição do planejamento; qualquer mudança de governança exige leitura prévia por repository ID.
- Sem prova de staging real, `develop` não entra; worktrees permanecem locais.
- Um release promovível precisa identificar conjuntamente as imagens `app` e `web` pelo mesmo commit SHA.
- Nenhuma etapa deste bloco depende de EC2, RDS, S3, SES, DNS ou das quatro decisões AWS abertas.

## External acceptance signals

- CI pessoal e corporativa executam backend test; frontend com `pnpm install --frozen-lockfile`, lint, test e build; auditorias de dependências.
- A sonda D-08 altera `generated.ts` e o check reprova citando o arquivo.
- Commit com qualquer gate vermelho não publica artefato promovível.
- Commit aprovado publica o par imutável `app`/`web`, ambos rastreáveis ao SHA.
- Governança corporativa é comprovada por readback de protection/ruleset e required checks pelo repository ID, nunca inferida do YAML.

## Open questions

- Não bloqueante para planejar: qual é o repository ID acessível de `Gatika/lotus` e qual sua configuração administrativa real?
- Não bloqueante: existe staging real fora das fontes acessíveis? Até prova positiva, não existe base para `develop`.

## Deferred

- Provisionamento AWS e as quatro decisões do João.
- Promoção SSH/Compose, deploy e rollback do item 12.
- Guardas das leis §5.4/5.5/5.7/5.8.

## Staleness triggers

- Mudança do item ativo, do escopo de D-08 ou criação de spec/plano com decisões diferentes.
- Alteração semântica no Dockerfile, Compose de produção, `VITE_API_URL` ou workflows.
- Disponibilização do repository ID corporativo ou leitura de suas configurações.
- Mudança relevante nas tasks Notion 10.1.x, nos dois arquivos Drive ou decisão nova sobre staging/topologia.
