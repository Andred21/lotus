# Spec — CI de governança e artefato imutável

> Bloco `cicd-ci-governanca-e-artefato` · item 11 do `backlog.md` · lane-b · 2026-08-24
> Context packet: `docs/superpowers/context-packets/2026-08-24-cicd-ci-governanca-e-artefato.md`
> Branch: `cicd/ci-governanca-e-artefato`, nascida de `main@6e8e8618`.

## 1. O problema

O Lotus tem runtime de produção versionado desde 2026-08-22 (`infra-producao-runtime-e-aws`, PR #67)
e **nenhum mecanismo que decida se um commit merece virar release**. Hoje o repositório não tem
`.github/` — medido, não suposto: `git log --all -- .github/workflows` volta vazio e a PR #66 do
BD-15 não lista o diretório, ao contrário do que a seleção de 2026-08-22 previu.

Duas consequências vivas:

- **A lei §5.3 do `CLAUDE.md` não tem mecanismo** (débito **D-08**). `generated.ts` é gerado do
  backend e não se edita à mão, mas o único guardião hoje é `globalIgnores` no
  `eslint.config.js:158`, que apenas tira o arquivo do corte do lint. Editar o arquivo à mão passa
  verde em tudo.
- **Não existe artefato promovível.** O item 12 (`cicd-promocao-deploy-e-rollback`) precisa promover
  uma imagem já testada por SHA; sem CI que construa e etiquete, o deploy continua sendo
  `git pull → build na VM`, que é exatamente o que o Notion `10.1.7` ainda prescreve.

## 2. Objetivo

Um commit reprovado não gera release promovível. Um commit aprovado gera artefato imutável
identificável pelo SHA.

**Não-objetivos**, cada um com dono declarado:

| Fora | Dono |
|---|---|
| Deploy, promoção e rollback | item 12 |
| EC2, RDS, S3, SES, TLS, DNS | item 10 (`infra-producao-provisionamento-aws`) |
| Branch `develop` | sem staging real provado, não nasce |
| Pint / gate de formatação | não está na ficha do item 11 |
| Guardas das leis §5.4, §5.5, §5.7, §5.8 | sem desenho medido; só a §5.3 entra |

## 3. Restrições medidas

Cada uma sai de leitura, não de suposição. As de origem externa citam a chave do packet.

1. **O runtime produz DUAS imagens, não uma.** `docker/Dockerfile.prod` tem os alvos `app` (linha 36)
   e `web` (linha 68); `docker-compose.prod.yml:23,36` os consome por `LOTUS_IMAGE` e
   `LOTUS_WEB_IMAGE`, variáveis independentes. Um release é o **par**. A ficha do item 11 fala em
   "build único da imagem de produção" no singular — divergência registrada no packet e resolvida
   pelo consumidor vigente.
2. **Contexto de build é a raiz, sem `ARG`.** O estágio SPA fixa `ENV VITE_API_URL=""`
   (`Dockerfile.prod:32`) e `axios.ts` continua lendo `import.meta.env.VITE_API_URL` — é o que
   mantém origem única e torna a imagem promovível por SHA. Nenhum parâmetro de build precisa
   atravessar a CI.
3. **Backend testa sem banco de serviço.** `backend/phpunit.xml:26-27` fixa `DB_CONNECTION=sqlite`
   e `DB_DATABASE=:memory:`. A CI não sobe MySQL.
4. **`frontend/package.json` não declara `packageManager`.** Sem esse campo o corepack escolhe a
   versão que quiser, e `pnpm install --frozen-lockfile` contra um `pnpm-lock.yaml` `lockfileVersion: 9`
   pode divergir por versão de resolvedor. O host usa pnpm 11.23.0.
5. **`Gatika/lotus` não existe.** O conector devolveu `404 Not Found` e `Andred21/lotus` é
   `fork:false`, sem remote `upstream` — a topologia da ficha é destino, não estado. **Decisão do
   João (2026-08-24): o repositório será criado na conta empresarial dentro deste bloco.**
   `[GH-CORP]` `[GH-WORKBENCH]` `[LOCAL-TREE]`
6. **Nada é herdado de configuração corporativa.** Rulesets, Environments, secrets, required checks e
   pacotes GHCR do repositório corporativo são desconhecidos porque não existem ainda. Nenhum será
   nomeado como preexistente. `[GH-CORP]`

## 4. Desenho

### 4.1 Um workflow, dono-agnóstico

Arquivo único: `.github/workflows/ci.yml`. **Nenhum nome de repositório aparece no YAML.** O dono sai
de `${{ github.repository }}` em tempo de execução, então o mesmo arquivo serve o repositório pessoal
na fatia 1 e o corporativo na fatia 2 sem uma linha reescrita.

Alternativa recusada: dois arquivos (`ci-fast.yml` pessoal + `ci.yml` corporativo). Dois arquivos
precisam concordar sobre versão de PHP, versão de Node e comandos de teste, e nada mediria se
concordam — o drift entre eles seria silencioso, que é a mesma classe de falha que a D-08 descreve.

### 4.2 Jobs

| Job | Conteúdo | Reprova |
|---|---|---|
| `backend` | PHP 8.3, `composer install`, `php artisan test` | sim |
| `frontend` | Node 22 + pnpm fixado, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, `pnpm build` | sim |
| `types-drift` | `php artisan typescript:transform` e `git diff --exit-code -- frontend/src/shared/types/generated.ts` | sim |
| `audit-prod` | `composer audit --no-dev`, `pnpm audit --prod` | sim |
| `audit-dev` | os mesmos audits com dev-dependencies | **não** (`continue-on-error: true`) |
| `image` | `needs: [backend, frontend, types-drift, audit-prod]`; build dos dois alvos, push GHCR | condicional |

`audit-dev` não reprova por decisão explícita: um advisory `moderate` numa dependência transitiva de
ferramenta de desenvolvimento travaria toda a fila sem que uma linha de código mudasse, e a saída
prática disso é desligar o check — pior que não tê-lo. O que reprova é o que a imagem de produção
carrega, e a régua bate com o artefato real porque o `Dockerfile.prod` instala vendor sem dev.

### 4.3 O gate de publicação

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

Sem dono no `if`. Push em branch e `pull_request` rodam só os gates — é daí que vem o "CI rápido
pessoal" da ficha: o custo real está no build multi-stage das duas imagens, não nos testes. A régua
de correção é **idêntica** nos dois repositórios, que é o que torna o DoD literal.

Efeito colateral aceito: durante a fatia 1, provar a publicação deixa um par de imagens no GHCR
pessoal. É o preço de provar o job antes de o repositório corporativo existir.

### 4.4 O artefato

```
ghcr.io/<owner>/lotus-app:<sha-completo>
ghcr.io/<owner>/lotus-web:<sha-completo>
```

SHA completo, **sem tag `latest`**. Tag móvel convida `docker pull latest` no servidor, que é o
hábito que o item 12 existe para substituir; e um release identificado por ponteiro móvel não é
identificável por SHA, que é o DoD do item 12.

Credencial: `GITHUB_TOKEN` com `permissions: { contents: read, packages: write }`. **Nenhum secret é
criado, guardado ou nomeado** — o que também satisfaz a restrição 6.

### 4.5 Gatilhos

`pull_request` com destino `main`, e `push` em `main`. Push em branch qualquer fica fora: as
worktrees são locais e o par PR+push duplicaria execução sem informação nova.

## 5. A D-08, explicitamente

A ficha do débito exige mecanismo com sonda própria: *"editar `generated.ts` e ver o mecanismo
reprovar nomeando o arquivo."*

O job `types-drift` regenera pelo comando canônico do `CLAUDE.md` §6 e compara com o commitado. A
falha é `git diff --exit-code` sobre o caminho exato, então a saída do job **nomeia o arquivo** — o
requisito da ficha é sobre a legibilidade da reprovação, não só sobre existir.

Escopo do que fecha: **somente a §5.3.** As sub-leis §5.1/§5.2 já têm `PersistenceLawsTest` e a §5.6
tem `no-restricted-imports`; §5.4, §5.5, §5.7 e §5.8 seguem sem guarda e **não entram como promessa**.

Risco a medir antes de escrever o job: `typescript:transform` boota o Laravel e pode exigir conexão
de banco. A medição precede a escrita; se exigir, o job usa a mesma configuração `sqlite`/`:memory:`
do `phpunit.xml`.

## 6. Fatia 2 — a topologia, na ordem que funciona

A ordem não é preferência: **required checks só podem ser exigidos por nome depois que o GitHub viu
os jobs rodarem pelo menos uma vez.** Configurar protection antes do primeiro run significa digitar
nomes de check à mão e torcer para baterem.

1. João cria `Gatika/lotus` privado na conta empresarial.
2. Remote `upstream` adicionado; `main` empurrada.
3. O workflow roda uma vez no corporativo.
4. Protection em `Gatika/main`: PR obrigatório, required status checks `backend`, `frontend`,
   `types-drift`, `audit-prod`, sem push direto, sem force-push, sem deleção da branch.
5. **Readback pela API**, comparando o que ficou gravado com o desenhado acima.

**Aprovação humana não é exigida.** O GitHub não permite aprovar o próprio PR; com um dev, exigir
uma aprovação trancaria o merge, e a saída seria bypass de admin — que não distingue "estou sozinho"
de "estou com pressa" e esvazia a regra. Quem reprova é a CI, que é precisamente o DoD do bloco.
Quando entrar segunda pessoa no time, ligar a exigência é uma linha.

O passo 5 existe porque o packet o exige: governança se comprova por leitura de volta, nunca por
inferência do YAML.

## 7. Definition of Done

Comportamento provado, não pacote instalado:

1. **Sonda D-08:** editar `generated.ts` à mão, empurrar, ver `types-drift` reprovar citando
   `frontend/src/shared/types/generated.ts`.
2. **Vermelho não publica:** um commit com qualquer gate reprovado não produz imagem alguma no GHCR.
3. **Verde publica o par:** um commit aprovado em `main` publica `lotus-app` e `lotus-web`, ambos
   etiquetados com o mesmo SHA completo, e ambos existem no registry.
4. **`--frozen-lockfile` sobrevive:** o job `frontend` instala sem alterar o `pnpm-lock.yaml`.
5. **Readback:** a protection lida de volta de `Gatika/main` bate com §6.4 — PR obrigatório, os
   quatro checks, force-push e deleção negados.

## 8. Entregáveis

- `.github/workflows/ci.yml`
- campo `packageManager` em `frontend/package.json`
- `Gatika/lotus` criado, `upstream` configurado, `main` empurrada
- branch protection aplicada e lida de volta
- evidência datada da sonda D-08 e do readback em `docs/superpowers/audits/`

## 9. Riscos

| Risco | Mitigação |
|---|---|
| `typescript:transform` exige banco ao bootar | medir antes de escrever o job; cair no `sqlite`/`:memory:` do `phpunit.xml` |
| Corepack escolhe pnpm divergente do lockfile v9 | fixar `packageManager` e a versão no workflow — é entregável, não contorno |
| Build de duas imagens sem cache leva minutos | cache buildx via GHA; ambos os alvos partilham os estágios iniciais do mesmo Dockerfile |
| `composer audit --no-dev` reprova por advisory sem correção upstream | decisão consciente: o que a imagem de produção carrega reprova. Exceção pontual é decisão do João, registrada, nunca desligamento do check |
| GHCR pessoal acumula imagens da fatia 1 | aceito e declarado; a fatia 1 precisa de uma execução de prova |
