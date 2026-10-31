# Spec — bloco 45 · `cicd-releases-versionamento-e-licenca`

> Brainstorming de 2026-10-31 com o João. Ficha: `docs/superpowers/backlog.md` §45 (entra pela PR
> desta lane, como no item 42).

## 1. Por que existe

- O Lotus não tem versão, tag, release nem CHANGELOG. `frontend/src/shared/config/brand.ts` traz
  `APP_VERSION = 'v0.1.0'` escrito à mão, mostrado na sidebar e no login, e ninguém o atualiza.
  O backend não tem versão nenhuma.
- `backend/composer.json:7` declara `"license": "MIT"`, e o `Andred21/lotus` é **público**
  (portfólio). A MIT concede a qualquer um uso, cópia e revenda. Nenhuma decisão de licença foi
  tomada, e o contrato com a Gatika/Lotus não diz quem é o titular do código.
- O que o João quer proteger: impedir reaproveitamento indevido do código por terceiros e ter
  base para provar autoria. Ataque à produção e engenharia reversa foram discutidos, e a
  conclusão é que licença não os resolve (ver §5 Fora).

## 2. Objetivo

1. Toda versão do Lotus significa **o que foi para produção**, numerada em SemVer pelos
   Conventional Commits que o projeto já usa, e o processo é automático do merge ao registro.
2. A versão aparece dentro do sistema (sidebar e backend) a partir de uma fonte única, sem
   edição manual.
3. O histórico desde o go-live é reconstruído: a versão atual em produção passa a ser `v1.9.1`.
4. Os dois repositórios ficam sob a mesma licença proprietária, com titularidade do João e uso
   perpétuo garantido à Gatika/Lotus.

## 3. Decisões do João (2026-10-31)

- **D1 · Release = produção.** Versão é o que foi promovido, não o que foi mesclado na `main`.
- **D2 · Critério SemVer.** `fix`/`perf` sobe o PATCH, `feat` sobe o MINOR, `BREAKING CHANGE` /
  `tipo!:` sobe o MAJOR. **Só conta mudança de produto real**: commits que tocam `backend/`,
  `frontend/`, `docker/`, `deploy/` ou `.github/`. Harness, docs e tooling de desenvolvimento não
  geram versão. Os demais tipos (`refactor`, `infra`, `cicd`, `chore`, `docs`, `test`) nunca
  sobem versão, mesmo em caminho de produto: entram no CHANGELOG da próxima versão, se a seção
  existir, mas não a disparam.
- **D3 · `1.0.0` = go-live.** A primeira promoção a produção, em 2026-09-26, quando o escopo
  funcional do Notion (Sprints 0–6) estava pronto, menos a task 8.3.1. As quatro promoções desse
  dia fundem-se numa só `1.0.0`, no último commit promovido no dia.
- **D4 · Backfill.** Cada promoção bem-sucedida posterior vira uma versão, com o salto calculado
  por D2 desde a promoção anterior (tabela no §4.4). Promoção sem nenhum commit que suba versão
  por D2 não vira versão: os commits dela entram na versão seguinte.
- **D5 · Titularidade.** O João é o autor e titular do copyright. A Gatika/Lotus recebe licença
  de uso **perpétua, irrevogável, não exclusiva** e sem custo adicional para a operação dela:
  usar, hospedar, modificar e manter, inclusive com outro fornecedor. Não pode revender,
  sublicenciar nem distribuir a terceiros. O João retém o direito de reutilizar funcionalidades,
  criar derivações e usar o sistema em portfólio e divulgação comercial própria.
- **D6 · Terceiros.** Nenhuma permissão: todos os direitos reservados.
- **D7 · Escopo.** Licença, releases e versão. Exposição do repo público, vitrine de portfólio,
  varredura de segredos e assinatura de commits ficam fora (§5).

## 4. Design

### 4.1 Fonte única da versão

- Um arquivo de versão na raiz, mantido pelo release-please (`release-type: simple`, arquivo
  `version.txt` + `.release-please-manifest.json`). Ele propaga a versão como `extra-files` para
  `frontend/package.json` (`$.version`) e `backend/composer.json` (`$.version`).
- **Frontend:** `APP_VERSION` deixa de ser literal. O Vite injeta a versão do `package.json` no
  build e `brand.ts` exporta `v${versão}`. A sidebar continua mostrando `APP_VERSION`.
- **Backend:** `config('app.version')` lida de dentro da imagem, sem rede (o builder escolhe
  entre ler o `composer.json`, copiar o `version.txt` para a imagem ou usar build-arg; a imagem
  precisa saber a própria versão offline). Exposta **só para usuário autenticado** (endpoint sob
  `auth:sanctum`, ou campo num payload autenticado já existente, à escolha do builder) e no
  contexto de log.
- **Catraca de CI:** um teste falha se `version.txt`, `frontend/package.json` e
  `backend/composer.json` divergirem.

### 4.2 Fluxo automático

1. **Andred21 (`origin`).** Workflow novo `release-please.yml`, guardado por
   `if: github.repository == 'Andred21/lotus'` (o `.github/` atravessa o espelho, mesmo padrão
   do `deploy.yml`). Em cada push na `main`, ele mantém a PR de release com o CHANGELOG e o bump
   calculados por D2 (`exclude-paths` para tudo fora dos caminhos de produto). O release-please só
   aceita lista negativa, então uma catraca confere que toda entrada da raiz do repositório ou é
   caminho de produto (D2) ou está no `exclude-paths`: diretório novo na raiz reprova até alguém
   decidir de que lado ele fica. A config leva `bootstrap-sha` = `5fba081d` (a `v1.9.1`), para a
   primeira execução não depender do backfill já escrito nem varrer o histórico inteiro. A
   primeira versão pelo fluxo novo é a deste bloco, prevista `1.10.0` (há `feat` em
   `frontend/`). A PR de release precisa rodar os cinco gates do CI (`pull_request`), e PR aberta
   com o `GITHUB_TOKEN` não dispara workflow. Por isso o workflow usa um token próprio (PAT
   fine-grained ou GitHub App) guardado em secret: ação externa 1, feita **antes** do merge deste
   bloco, porque o push do merge já dispara o workflow.
2. **Mesclar a PR de release** é a decisão "isto vai para produção". Ela grava a versão nos
   arquivos e cria a tag `vX.Y.Z` e a Release no Andred21. Diferença declarada: no Andred21 a
   Release aparece no merge, antes da promoção, porque o repo público não sabe da produção.
3. **Espelho.** `scripts/espelhar-corporativo.sh` leva o commit ao Gatika-CL como hoje.
   `version.txt`, o manifest e `CHANGELOG.md` atravessam (estão fora do `.espelho-exclusoes`).
4. **Promoção.** O `deploy.yml` (Gatika-CL) continua com o mesmo botão e o mesmo SHA. Depois do
   deploy OK, um passo novo lê a versão do `version.txt` do SHA promovido e cria a tag anotada
   `vX.Y.Z` nesse SHA e a Release no Gatika-CL, com as notas da seção correspondente do
   `CHANGELOG.md`. A permissão do job passa a `contents: write`. A lógica do passo vive num
   script versionado que **atravessa** o espelho (fora do `.espelho-exclusoes`), chamado pelo
   `deploy.yml`, para ser testável com `gh` falso no `PATH`.
   - Tag já existente no mesmo SHA (repromoção): sucesso sem ação.
   - Tag já existente em **outro** SHA: o passo avisa e não sobrescreve, e o deploy segue OK.
     O passo de release nunca reprova um deploy já concluído (lei 7 no espírito: registro, não
     gate).
   - Rollback para versão anterior não cria release.
5. Promoção de um SHA sem bump (sem PR de release mesclada desde a última) não cria release
   nova: o `version.txt` dele aponta para uma tag que já existe em outro SHA, e cai no caso
   "aviso, não sobrescreve" acima. O caminho normal é sempre mesclar a PR de release antes de
   espelhar.

### 4.3 Licença

- `LICENSE` proprietária idêntica nos dois repositórios (atravessa o espelho): copyright
  `© 2025-2026 João Victor Andreoli`, todos os direitos reservados, sem nenhuma permissão a
  terceiros. Texto em pt-BR com versão em espanhol no mesmo arquivo (cliente chileno).
- A licença à Gatika/Lotus (D5) **não** vai no `LICENSE` público em detalhe. O `LICENSE` diz que
  o uso só é permitido a quem tem licença escrita do titular. O detalhe vive no **rascunho do
  termo** em `docs/superpowers/blocos/45-.../termo-licenca-rascunho.md` (pt-BR + es), que o João
  leva à Gatika. `docs/` não atravessa o espelho.
- O rascunho cobre D5 e a ressalva: o uso em portfólio não inclui dados da Lotus (alunos,
  certificados, clientes) nem a marca "Lotus" como endosso sem autorização, e screenshots usam
  dados fictícios (Lei 19.628, Chile).
- Manifests: `backend/composer.json` `"license": "proprietary"`, e `frontend/package.json`
  `"license": "UNLICENSED"` com `"private": true`.
- O texto é rascunho para validação jurídica do João. O bloco não emite parecer.

### 4.4 Backfill

Tabela autoritativa. A origem é o commit no Andred21; o espelho é o commit promovido no
Gatika-CL (mapeado pelo trailer `Source-Commit`, conferido contra as execuções do `deploy.yml`
em 2026-10-31).

| Versão | Promovida | Origem (Andred21) | Espelho (Gatika-CL) |
|---|---|---|---|
| 1.0.0 | 2026-09-26 | `ffe092cdfcec2a4be6c114b61313b47203cb1ce5` | `fa5f023aadd22e2e3aa20abf0f561b4fcafa762f` |
| 1.0.1 | 2026-09-27 | `162cbaa71c7ac5aac3b4d4570aaf91cdce663d9a` | `4fa3b650c3839bfc689949dbc3b5ba879e5aaa02` |
| 1.1.0 | 2026-09-28 | `42a50a4d2418d89121ca0d693cdf1bcd5cde5c72` | `a8ba3361d842b9ce9cfee57e0e295fa7c4116a5f` |
| 1.2.0 | 2026-09-28 | `982b49292f9d3bee0ff79d3acf0e762805d0b7e7` | `550758d76f1bcb0a847758bbbe243bcbefdc96ea` |
| 1.3.0 | 2026-10-04 | `0726bfec2da7e69b192564e7eb6f1894003d359c` | `2608713392d646473c893efce4fbcff8643f5e19` |
| 1.4.0 | 2026-10-05 | `c5a0421326d999600df371e926051ce3ad218587` | `994cf802965901d961c2e9a5c67c7d534c894fe1` |
| 1.4.1 | 2026-10-24 | `d8e14239e717e69cd2ed379a7ce6e10b4df2d4a4` | `abd73766c9edbc2b5a6f0a5fb312b8f82011bf9b` |
| 1.5.0 | 2026-10-24 | `dfa348473c3a0d9e72e08ca77aef257aa971d939` | `e28fdc52e1c6a172b9c73f3a5dbdedf40c9be66c` |
| 1.6.0 | 2026-10-25 | `d61d782d64b5ed6ae7e2e07c86ba15ad20fc830f` | `61dde89ddc6ac5bc7dff33c2d3d7e2b41f4ec07d` |
| 1.7.0 | 2026-10-28 | `0c09fa4f8da56aa853b575bed4705a9a0c57f239` | `c4cde5b870c74129a48421cbba90a7a0c346edc2` |
| 1.8.0 | 2026-10-29 | `07579e04a8f51f81845928c24f299b4fec735c79` | `4ba6de954a80fe6956739d086a50fb653822e261` |
| 1.9.0 | 2026-10-31 | `c97c49bebf31075c047a5449278099686d461ccd` | `bd442310d3cc90c24c8c3c611bcb5c527fe3c5f4` |
| 1.9.1 | 2026-10-31 | `5fba081d7bff45e4ad4b930d49957f6c91f47978` | `935145f5394ed9aa3ba389222591ede703353bca` |

- O mapeamento promoção→SHA usou o `headSha` das execuções, que é a `main` do Gatika-CL no
  clique. Antes de criar tags, o script confere cada linha contra o input `sha` da execução do
  `deploy.yml` correspondente (`gh run view`, leitura; o ledger do host não entra, porque exige
  acesso ao servidor). Divergência para tudo e é reportada.
- Um script versionado em `scripts/`, **listado no `.espelho-exclusoes`** (é ferramenta de
  desenvolvimento, roda uma vez na máquina do João), gera, para cada linha, a tag anotada
  `vX.Y.Z` com a data da promoção e a Release com as notas dos commits de produto (D2) desde a
  versão anterior, agrupadas em Funcionalidades / Correções. Ele roda com `--simular` (mostra
  tudo, não escreve) e, sem a flag, escreve nos dois repos. Quem roda a escrita é o João (ação
  externa 2), porque escrita remota não sai de sessão de agente.
- O mesmo script gera o `CHANGELOG.md` inicial com as 13 versões, commitado neste bloco: as notas
  das Releases do backfill e as seções do `CHANGELOG.md` saem da mesma geração, e o passo do
  `deploy.yml` lê as notas dali. O manifest do release-please começa em `1.9.1`, e
  `version.txt` também.

## 5. Fora

- Tornar `Andred21/lotus` privado, criar repo-vitrine, varrer segredos no histórico e
  sourcemaps: ficha própria se o João quiser (risco de exposição discutido no brainstorming).
- Assinatura de commits e tags (SSH/GPG), `SECURITY.md`, atestado de procedência da imagem.
- Parecer jurídico, assinatura do termo com a Gatika, registro no INPI.
- Cabeçalho de copyright em cada arquivo-fonte.
- Mudança no fluxo de deploy além do passo de release pós-sucesso.
- Task 8.3.1 do Notion.

## 6. Anti-objetivos

- A versão exibida divergir da que roda. Pior que não ter versão.
- O passo de release reprovar ou atrasar um deploy concluído.
- Release no Gatika-CL para algo que não foi promovido.
- Versão nova por mudança só de harness ou docs.
- Qualquer texto de licença que ainda conceda uso a terceiros.
- Expor a versão a usuário não autenticado no backend.

## 7. Restrições

- Push direto em `main` é proibido; tudo entra por PR (`CONTRIBUINDO.md`). A PR de release
  também.
- `.github/` atravessa o espelho: todo workflow novo é guardado por `github.repository`.
- O `deploy.yml` só roda no Gatika-CL e é o único caminho para produção.
- Escrita remota (tags, releases, secrets) é ação do João.
- `generated.ts` não muda à mão (lei 3), se algum DTO for tocado.

## 8. DoD

1. Catraca de CI: as três fontes de versão iguais, vista reprovar com uma divergente.
2. `frontend` build com `APP_VERSION` derivado do `package.json`, sem literal no código (teste).
3. Backend: `config('app.version')` igual ao `version.txt`, e a exposição autenticada responde
   401 sem sessão e a versão com sessão (teste de feature).
4. release-please: config validada em dry-run local ou PR de teste, com `fix` em caminho de
   produto propondo PATCH, `feat` propondo MINOR e commit só em `docs/` não propondo nada; e a
   catraca da raiz (§4.2.1) vista reprovar com um diretório novo não classificado.
5. `deploy.yml`: passo de release coberto pelos três casos de §4.2.4 (tag nova, repromoção,
   tag em outro SHA), com `gh` falso, no padrão das catracas de script existentes.
6. Script de backfill em `--simular` imprime as 13 linhas da tabela §4.4 com as notas.
7. `LICENSE` presente, nenhum manifest com MIT (`grep -ri '"license": "MIT"'` vazio fora de
   `vendor/` e `node_modules/`), e o rascunho do termo gravado.

## 8.1 Deixado ao builder

- Como o backend lê a versão dentro da imagem (§4.1).
- Endpoint dedicado ou campo em payload autenticado existente (§4.1).
- PAT fine-grained ou GitHub App para o release-please; documentar o escolhido em
  `CONTRIBUINDO.md`.
- Formato exato das notas de release do backfill.

## 9. Emendas pré-plano (2026-10-31, decisões do João)

- **E1 · Versão do backend em `backend/config/app.php`, não no `composer.json`.** O Composer põe
  `version` no content-hash do `composer.lock`: com o release-please gravando `$.version`, toda PR
  de release deixaria o lock desatualizado. A fonte do backend passa a ser a linha
  `'version' => '1.9.1', // x-release-please-version` em `backend/config/app.php`, atualizada pelo
  updater genérico do release-please (`extra-files` do tipo `generic`). Sem I/O, vale no container
  de dev (que monta só `./backend`) e na imagem, e o `config:cache` cobre. O `composer.json` fica
  **sem** `version`. Substitui o `composer.json` em §4.1, DoD 1 e DoD 3: a catraca compara
  `version.txt`, `frontend/package.json` e essa linha.
- **E2 · D2 mantido como está.** Caminho de produto é só `backend/`, `frontend/`, `docker/`,
  `deploy/` e `.github/`. `docker-compose.prod.yml` e `docker-compose.prod-tls.yml` ficam no
  `exclude-paths` mesmo indo para produção, por decisão explícita. A catraca da raiz (§4.2.1)
  classifica cada entrada de `git ls-files` de primeiro nível.
- **Fatos do repositório para o plano** (levantados em 2026-10-31):
  - o `deploy.yml` faz checkout do SHA alvo em `alvo/` e da `main` em `main/`, e chama script de
    `main/.github/scripts/` (padrão do `conferir-alinhamento.sh`). O passo de release segue o
    mesmo padrão: `.github/scripts/publicar-release.sh`, lendo `version.txt` e `CHANGELOG.md` de
    `alvo/`;
  - catraca de script por execução com binário falso: `frontend/tests/<nome>.test.ts` +
    `frontend/tests/fixtures/<nome>/` (molde: `podar-imagens.test.ts`), no projeto vitest `repo`;
  - o `deploy.yml` não tem `run-name`, e a API de runs não devolve os inputs: a conferência do
    backfill (§4.4) lê o `SHA` do log da execução (`gh run view <id> --log`, cabeçalho `env` do
    passo), nas execuções `success` do `deploy.yml` do Gatika-CL;
  - `APP_VERSION` é consumido em `Sidebar.tsx` e `LoginPage.tsx`; não há `vite-env.d.ts` em
    `frontend/src/` (a constante injetada pelo Vite precisa de declaração de tipo);
  - rota autenticada: grupo `auth.active` em `backend/app/Domains/Identity/routes.php`.

## Verificação externa

1. Secret do token do release-please criado no `Andred21/lotus`, e a primeira PR de release
   aberta pelo workflow com os cinco gates rodando.
   - prova: nenhuma
2. Backfill escrito: 13 tags e Releases `v1.0.0`…`v1.9.1` nos dois repositórios, conferidas com
   `gh release list`.
   - prova: nenhuma
3. Primeira release pelo fluxo novo promovida: a Release aparece no Gatika-CL criada pelo
   `deploy.yml`, e a sidebar em produção mostra a mesma versão. A prova HTTP só mede que a
   produção responde depois da promoção; a versão é conferida à mão, porque só é exposta a
   usuário autenticado (§6).
   - prova: `producao GET /up -> 200`
