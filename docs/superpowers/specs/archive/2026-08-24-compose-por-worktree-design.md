# Design — `compose-por-worktree`

> Bloco da `lane-b`, árvore `../lotus-infra`, branch `infra/compose-por-worktree`.
> Paga a **P-03** (`docs/superpowers/pendencias/abertas.md`), cujo gatilho venceu em 2026-08-24.
> Sem Context Packet: a fonte é interna — a própria ficha e a medição do repositório.
> Data: 2026-08-24.

## 1. Problema

A P-03 diz que "compose por worktree não existe" e que o que existe é **"receita manual que depende
de quem executa lembrar"** — o override efêmero de 2026-08-19 (nginx 8081, MySQL 3308, MinIO
9002/9003, Mailpit 8025, Vite 5174), montado fora do repositório e perdido no fim do bloco.

O gatilho formal venceu: a fila tem quatro blocos de backend (itens 4, 5, 6 e 7 do `backlog.md`) e
o compose sobe com portas fixas, então só uma lane de backend cabe por vez.

## 2. Medição — duas das três premissas da ficha já estão pagas

A ficha e o `state.md` descrevem o bloco como "portas parametrizadas, `COMPOSE_PROJECT_NAME` por
árvore, binds da árvore corrente". Medido em 2026-08-24 nesta árvore:

| Premissa | Medido |
|---|---|
| `COMPOSE_PROJECT_NAME` por árvore | **já existe de graça.** `docker compose config` aqui devolve `name: lotus-infra` — o Compose deriva o projeto do basename do diretório. Rede e volumes saem namespaced (`lotus-infra_default`, `lotus-infra_lotus-db`), então o banco de uma árvore não é o da outra. |
| binds da árvore corrente | **já corretos.** `./backend` e `./frontend` resolvem contra o diretório do arquivo de compose, não contra o main tree. |
| portas parametrizadas | **é o buraco real.** `8080`, `3307`, `8025`, `9000` e `9001` são literais em `docker-compose.yml`. |

**Buraco segundo, que a ficha não registra:** `backend/.env` é gitignored e carrega a porta *dentro
do valor* — `APP_URL=http://localhost:8080`, `SANCTUM_STATEFUL_DOMAINS=localhost:5173,...:8080`,
`AWS_ENDPOINT_PUBLIC` e `AWS_URL` em `:9000`. Trocar a porta host sem casar essas chaves derruba a
sessão Sanctum e a URL pública de arquivo. É exatamente onde a receita manual de 2026-08-19 exigia
memória.

**Divergência de doc registrada:** o `state.md` diz que este bloco toca `.env.example` na raiz.
Esse arquivo **não existe** — o bloco o cria.

**Estado da máquina na medição:** cinco árvores (`lotus` main, `fix-frontend`, `lotus-infra`,
`lotus-preview`), com a stack do projeto `lotus` no ar segurando 8080/3307/8025/9000/9001.

## 3. Decisões

- **D1 — Alocação por offset explícito, não derivada.** `docker-compose.yml` passa a ler cada porta
  de uma variável com default; o número vem de um `.env` na raiz (gitignored), copiado de um
  `.env.example` versionado que traz a tabela de offsets. Recusado: script que deriva o offset de
  `git worktree list` (peça nova, mais superfície) e porta efêmera do Docker (a URL mudaria a cada
  `up`, e `APP_URL`/`SANCTUM`/`AWS_URL` precisam de porta estável).
- **D2 — Prefixo `LOTUS_DEV_`, distinto do prod.** `docker-compose.prod.yml` já usa
  `LOTUS_HTTP_PORT`, `LOTUS_IMAGE`, `LOTUS_WEB_IMAGE`, `LOTUS_ENV_FILE` e **lê o mesmo `.env` da
  raiz**. Reusar `LOTUS_HTTP_PORT` faria o offset de dev vazar para o compose de produção e para o
  overlay de sonda.
- **D3 — O compose injeta as chaves de URL; `backend/.env` não é editado.** O serviço `app` ganha
  `environment:` derivando `APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`,
  `AWS_ENDPOINT_PUBLIC` e `AWS_URL` das mesmas variáveis de porta. Uma fonte só.
- **D4 — Vite entra no escopo, com `strictPort`.** Sem isso o Vite escorrega sozinho para 5174 em
  silêncio e o backend não sabe. O `localhost:5174` que hoje está no `backend/.env` desta máquina é
  resíduo da receita manual de 2026-08-19 e sai.
- **D5 — Catraca de texto, no molde do `compose-prod.test.ts`.** Mesmo runner, mesmo precedente,
  zero dependência nova.
- **D6 — DoD é duas stacks no ar com login real na segunda.** Lei §5 nº8: build verde não é DoD, e
  este bloco é infra — se as duas não subiram juntas, a P-03 não foi paga.
- **D8 — `VITE_API_URL` derivado só no modo `serve`.** O `frontend/.env` (gitignored) traz
  `VITE_API_URL=http://localhost:8080`, e o Vite não lê o `.env` da raiz. A derivação entra por
  `define` **condicionada a `command === 'serve'`**: no `build` nada muda, então a origem única de
  produção (`ENV VITE_API_URL=""` em `docker/Dockerfile.prod:32`, que entra no bundle) fica intocada
  por construção, e não por cuidado de quem edita. Em `serve`, um `VITE_API_URL` explícito no
  `frontend/.env` continua vencendo o derivado.
- **D7 — Não há detecção de colisão de offset.** O `.env` da raiz é gitignored e invisível entre
  árvores; varrer o disco seria caro, e `docker compose up` já falha alto com
  `port is already allocated`.

## 4. Variáveis

| Variável | Default | Serviço |
|---|---|---|
| `LOTUS_DEV_HTTP_PORT` | `8080` | `nginx` |
| `LOTUS_DEV_DB_PORT` | `3307` | `mysql` |
| `LOTUS_DEV_MAILPIT_PORT` | `8025` | `mailpit` |
| `LOTUS_DEV_MINIO_PORT` | `9000` | `minio` (API) |
| `LOTUS_DEV_MINIO_CONSOLE_PORT` | `9001` | `minio` (console) |
| `LOTUS_DEV_VITE_PORT` | `5173` | Vite (nativo no WSL, fora do compose) |

**Cada default é a porta histórica.** Quem clona o repositório sem `.env` na raiz sobe exatamente
como hoje — a parametrização não muda o caminho padrão, só abre o segundo.

## 5. Injeção no serviço `app`

```yaml
environment:
  APP_URL: http://localhost:${LOTUS_DEV_HTTP_PORT:-8080}
  FRONTEND_URL: http://localhost:${LOTUS_DEV_VITE_PORT:-5173}
  SANCTUM_STATEFUL_DOMAINS: localhost:${LOTUS_DEV_VITE_PORT:-5173},localhost:${LOTUS_DEV_HTTP_PORT:-8080}
  AWS_ENDPOINT_PUBLIC: http://localhost:${LOTUS_DEV_MINIO_PORT:-9000}
  AWS_URL: http://localhost:${LOTUS_DEV_MINIO_PORT:-9000}/lotus
```

**Premissa a PROVAR antes de desenhar em cima (Task 1), não a supor:** variável de ambiente real
vence o valor do `.env` do Laravel (`Dotenv` imutável). Não foi possível medir no planejamento —
`backend/vendor` não existe nesta árvore.

**Plano B declarado, caso a premissa caia:** as cinco chaves saem do `backend/.env.example` e
passam a morar somente no compose, com o `.env.example` documentando de onde vêm.

`AWS_ENDPOINT` (`http://minio:9000`) **não** entra na injeção: é comunicação de rede interna do
Compose, não porta publicada, e não muda com o offset. Mesma coisa para `DB_HOST`/`DB_PORT`
(`mysql:3306`) e `GOTENBERG_URL`.

## 6. Vite

`frontend/vite.config.ts` passa a ser a forma funcional e usa `loadEnv(mode, <raiz do repo>,
'LOTUS_')` para ler o `.env` da raiz **somente no prefixo `LOTUS_`** — o `import.meta.env` que a
aplicação enxerga fica intocado, e `frontend/.env` continua sendo o dono das chaves `VITE_*`.

```
server: { port: <derivado>, strictPort: true }
```

`strictPort: true` é a decisão: falhar alto na porta ocupada em vez de escorregar para a seguinte
sem avisar quem configurou o `SANCTUM_STATEFUL_DOMAINS`.

**`VITE_API_URL` (D8).** A aplicação lê `import.meta.env.VITE_API_URL` em
`frontend/src/shared/api/axios.ts:25`, e o valor entra no bundle no build. Em `serve`, o config
define `import.meta.env.VITE_API_URL` como `http://localhost:${LOTUS_DEV_HTTP_PORT}` **quando o
`frontend/.env` não trouxer a chave**; em `build`, o `define` não é emitido.

## 7. Catraca — `frontend/tests/compose-dev.test.ts`

Molde do `compose-prod.test.ts` (conferência textual; o projeto não tem parser de YAML e acrescentar
dependência de runtime ao frontend por causa de arquivo de infra seria acoplamento na direção
errada). Prova:

1. Toda `ports:` de `docker-compose.yml` publica por `${VAR:-default}` — nenhuma porta host literal.
2. O default de cada variável é a porta histórica da tabela da §4.
3. Toda `LOTUS_DEV_*` lida pelo `docker-compose.yml` tem linha declarada no `.env.example` da raiz.
4. `vite.config.ts` lê a porta da variável e mantém `strictPort` ligado.
5. O serviço `app` declara as cinco chaves de URL da §5, cada uma derivada de uma `LOTUS_DEV_*` —
   remover a injeção em silêncio volta a exigir a receita manual.
6. O `define` de `VITE_API_URL` é emitido somente em `serve` — a asserção existe para que ninguém
   o promova a incondicional e leve a URL de dev para dentro da imagem de produção.

Cada asserção precisa ser **vista reprovar** antes de passar, com a sonda revertida.

## 8. Definition of Done

Stack do projeto `lotus` (main tree) de pé nas portas históricas; esta árvore sobe no offset `+1`:

1. `composer install` e `migrate --seed` no banco próprio da árvore — provado que o volume é
   `lotus-infra_lotus-db` e que o dado da `lotus` não é tocado.
2. `GET /up` **200** na porta alternativa, com a stack da `lotus` respondendo 200 na 8080 ao mesmo tempo.
3. `GET /sanctum/csrf-cookie` **204** e `POST /api/login` **200** com cookie de sessão gravado no
   domínio da porta alternativa.
4. `GET /api/me` **200** — prova de que `SANCTUM_STATEFUL_DOMAINS` injetado alcançou a aplicação.
5. Upload de um arquivo chegando ao MinIO da porta alternativa, com a URL pública apontando para ela.
6. `pnpm dev` na porta derivada, falando com a API da árvore certa.
7. Catraca verde, com as quatro asserções vistas reprovando.

## 9. Documentação

- **`docs/adrs.md` — emenda ao ADR-13** (Containerização): registra a parametrização e o fato de o
  projeto/volume já isolarem por diretório.
- **`README.md:16-17`:** mesmas duas URLs cravadas.
- **`CLAUDE.md` §6:** hoje crava `http://localhost:8080` e `:5173` como se fossem constantes; passa a
  descrevê-los como default do offset zero.
- **`.env.example` da raiz:** a receita de árvore nova, com a tabela de offsets.
- **`docs/superpowers/pendencias/`:** a P-03 fecha no `/fechar-sprint` deste bloco, com a linha do
  índice acompanhando.

## 10. Fora do escopo

- `docker-compose.prod.yml` e `docker-compose.prod-probe.yml` — outro público, e o prefixo `LOTUS_DEV_`
  existe para não os tocar.
- Offset derivado por script (D1) e detecção de colisão entre árvores (D7).
- Versionar o `.env` da raiz — ele é ambiente local, e o `.gitignore` já cobre `/backend/.env` e
  `/frontend/.env`; ganha a terceira linha.
- Qualquer mudança em código de aplicação: este bloco não toca `backend/app` nem `frontend/src`.
