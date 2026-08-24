# `compose-por-worktree` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer duas árvores de trabalho subirem a stack de desenvolvimento ao mesmo tempo, sem receita manual, pagando a **P-03**.

**Architecture:** as portas host de `docker-compose.yml` passam a vir de variáveis `LOTUS_DEV_*` com default igual à porta histórica; um `.env` na raiz (gitignored, copiado de um `.env.example` versionado) escolhe o offset da árvore; o serviço `app` injeta as chaves de URL que carregam porta (`APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `AWS_ENDPOINT_PUBLIC`, `AWS_URL`) derivadas das mesmas variáveis, e o Vite deriva porta e `VITE_API_URL` do mesmo offset. Projeto compose e volumes já isolam por diretório — medido, não tocado.

**Tech Stack:** Docker Compose, Laravel 13 (PHP 8.3), Vite 7 + React 19, vitest (runner da raiz).

**Spec:** `docs/superpowers/specs/2026-08-24-compose-por-worktree-design.md`

## Global Constraints

- **Prefixo `LOTUS_DEV_`, nunca `LOTUS_`.** `docker-compose.prod.yml` já usa `LOTUS_HTTP_PORT`, `LOTUS_IMAGE`, `LOTUS_WEB_IMAGE` e `LOTUS_ENV_FILE`, e lê o **mesmo** `.env` da raiz. Reusar o nome vaza o offset de dev para o compose de produção.
- **Todo default é a porta histórica:** `LOTUS_DEV_HTTP_PORT=8080`, `LOTUS_DEV_DB_PORT=3307`, `LOTUS_DEV_MAILPIT_PORT=8025`, `LOTUS_DEV_MINIO_PORT=9000`, `LOTUS_DEV_MINIO_CONSOLE_PORT=9001`, `LOTUS_DEV_VITE_PORT=5173`. Quem clona sem `.env` na raiz sobe idêntico a hoje.
- **Nenhum arquivo de produção é tocado:** `docker-compose.prod.yml`, `docker-compose.prod-probe.yml`, `docker/Dockerfile.prod`, `docker/probe.env` e `docker/nginx/prod.conf` ficam fora do diff. `git diff main...HEAD --stat` no fim não pode listar nenhum deles.
- **Nenhum código de aplicação é tocado:** `backend/app/**` e `frontend/src/**` ficam fora do diff. Sem `backend/`, `pint` e `typescript:transform` são N/A por escopo medido — declare isso, não presuma.
- **Toda asserção de catraca precisa ser vista REPROVAR** com uma sonda antes de passar, e a sonda revertida no mesmo passo.
- Comandos de backend rodam no container (`docker compose exec -T app ...`); o host WSL não tem mbstring. `pnpm` roda nativo de dentro de `frontend/`.
- Esta árvore é `/home/jvbat/projetos/lotus-infra`, branch `infra/compose-por-worktree`. Não `cd` para o main tree.

---

### Task 1: Provar a precedência de variável de ambiente sobre o `.env` do Laravel

A §5 da spec desenha a injeção em cima de uma premissa **não medida**: variável de ambiente real vence o valor do `.env` (o Laravel usa `Dotenv` imutável). `backend/vendor` não existe nesta árvore, então não deu para medir no planejamento. Se a premissa cair, o desenho muda — por isso ela é a primeira task, e não um detalhe da terceira.

**Files:**
- Nenhum arquivo de código. A entrega é uma medição e a decisão que ela fecha.
- Modify: `docs/superpowers/plans/2026-08-24-compose-por-worktree.md` (registrar o resultado medido abaixo desta task)

**Interfaces:**
- Consumes: nada.
- Produces: a decisão **A** (injeção por `environment:`, como a §5 desenha) ou o **plano B** (as cinco chaves saem de `backend/.env.example` e passam a morar só no compose). A Task 3 lê esta decisão.

- [ ] **Step 1: Instalar as dependências do backend nesta árvore**

`docker compose run` **não** publica portas (diferente de `up`), então isto não colide com a stack do main tree que está no ar.

```bash
docker compose run --rm --no-deps app composer install
```

Esperado: `Generating optimized autoload files`, e `backend/vendor/` passa a existir.

- [ ] **Step 2: Medir a precedência**

```bash
docker compose run --rm --no-deps -e APP_URL=http://sonda-env:9999 app \
  php -r 'require "vendor/autoload.php"; $app = require "bootstrap/app.php"; $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo config("app.url"), PHP_EOL;'
```

`backend/.env` desta árvore traz `APP_URL=http://localhost:8080` (medido em 2026-08-24).

- Saída `http://sonda-env:9999` → **premissa confirmada**, segue a decisão A.
- Saída `http://localhost:8080` → **premissa caiu**, segue o plano B.

- [ ] **Step 3: Registrar o resultado no plano**

Acrescente ao fim desta task, no arquivo do plano, uma linha literal com o comando, a saída obtida e a decisão (A ou B). Não escreva "confirmado" sem colar a saída — a lei §5 nº8 vale para premissa também.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-08-24-compose-por-worktree.md
git commit -m "docs(plan): registra a medicao da precedencia env real sobre .env"
```

---

### Task 2: Portas parametrizadas, `.env.example` da raiz e as três primeiras asserções

**Files:**
- Create: `frontend/tests/compose-dev.test.ts`
- Create: `.env.example`
- Modify: `docker-compose.yml` (chaves `ports:` de `nginx`, `mysql`, `mailpit`, `minio`)
- Modify: `.gitignore` (acrescentar `/.env`)

**Interfaces:**
- Consumes: nada da Task 1.
- Produces: o arquivo de catraca `frontend/tests/compose-dev.test.ts` com o `describe('docker-compose.yml', ...)`, as constantes `RAIZ`, `DEV`, `EXEMPLO`, `DEFAULTS` e os helpers `blocoDoServico(nome)` e `regioesDaChave(texto, chave)`. As Tasks 3 e 4 acrescentam `it`s e um segundo `describe` a este mesmo arquivo.

- [ ] **Step 1: Escrever o teste que falha**

Crie `frontend/tests/compose-dev.test.ts`. Os dois helpers são cópia deliberada de `frontend/tests/compose-prod.test.ts` — o projeto não tem parser de YAML, e acrescentar dependência de runtime ao frontend por causa de arquivo de infra seria acoplamento na direção errada.

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * O compose de DESENVOLVIMENTO tem uma propriedade cuja violação é
 * silenciosa: uma porta host literal volta, o arquivo segue subindo na
 * máquina de quem a escreveu, e só a SEGUNDA árvore descobre — na hora em
 * que a segunda lane de backend precisa existir (P-03). Este arquivo prova
 * por texto que toda porta publicada vem de variável com default histórico,
 * e que toda variável lida tem linha declarada no `.env.example` da raiz.
 *
 * Mora em `frontend/tests/` pelo mesmo motivo medido de `compose-prod.test.ts`
 * e `repo-docs-refs.test.ts`: o container `app` monta só `./backend` e
 * `./frontend`, então PHPUnit não enxerga a raiz. O vitest roda nativo no WSL
 * e é o único runner do projeto com acesso a ela.
 */
const RAIZ = resolve(__dirname, '..', '..')
const DEV = readFileSync(join(RAIZ, 'docker-compose.yml'), 'utf8')
const EXEMPLO = readFileSync(join(RAIZ, '.env.example'), 'utf8')

/**
 * A porta histórica de cada serviço. É o valor que quem clona o repositório
 * SEM `.env` na raiz continua recebendo — a parametrização abre a segunda
 * árvore, não muda a primeira.
 */
const DEFAULTS: Record<string, string> = {
  LOTUS_DEV_HTTP_PORT: '8080',
  LOTUS_DEV_DB_PORT: '3307',
  LOTUS_DEV_MAILPIT_PORT: '8025',
  LOTUS_DEV_MINIO_PORT: '9000',
  LOTUS_DEV_MINIO_CONSOLE_PORT: '9001',
  LOTUS_DEV_VITE_PORT: '5173',
}

/** Recorta o bloco de um serviço, da linha "  <nome>:" até o próximo serviço no mesmo nível. */
function blocoDoServico(nome: string, texto: string = DEV): string {
  const inicio = new RegExp(`^ {2}${nome}:.*$`, 'm').exec(texto)
  if (!inicio) {
    throw new Error(`serviço "${nome}" não encontrado no texto informado`)
  }
  const resto = texto.slice(inicio.index + inicio[0].length)
  const fimRelativo = resto.slice(1).search(/^ {2}\S/m)
  return fimRelativo === -1 ? resto : resto.slice(0, fimRelativo + 1)
}

/** Recorta todas as regiões que uma chave de nível de serviço (4 espaços) abrange. */
function regioesDaChave(texto: string, chave: string): string[] {
  const linhas = texto.split(/\r?\n/)
  const ehChave = new RegExp(`^ {4}${chave}:`)
  const ehContinuacao = (linha: string) => linha.trim() === '' || /^ {5,}/.test(linha)
  const regioes: string[] = []
  for (let i = 0; i < linhas.length; i++) {
    if (!ehChave.test(linhas[i])) continue
    const regiao = [linhas[i]]
    let j = i + 1
    while (j < linhas.length && ehContinuacao(linhas[j])) {
      regiao.push(linhas[j])
      j++
    }
    regioes.push(regiao.join('\n'))
  }
  return regioes
}

describe('docker-compose.yml', () => {
  it('publica toda porta host por variável LOTUS_DEV_*, nunca literal', () => {
    const regioes = regioesDaChave(DEV, 'ports')
    expect(regioes.length).toBeGreaterThan(0)
    for (const regiao of regioes) {
      const mapeamentos = [...regiao.matchAll(/["']([^"']+)["']/g)].map((m) => m[1])
      expect(mapeamentos.length).toBeGreaterThan(0)
      for (const mapeamento of mapeamentos) {
        expect(mapeamento).toMatch(/^\$\{LOTUS_DEV_[A-Z_]+:-\d+\}:\d+$/)
      }
      // Uma entrada SEM aspas ("- 8080:80") escaparia do laço acima; o que
      // sobra depois de remover os mapeamentos citados não pode conter
      // nenhum par de porta.
      const semMapeamentosCitados = regiao.replace(/["'][^"']*["']/g, '')
      expect(semMapeamentosCitados).not.toMatch(/\d+\s*:\s*\d+/)
    }
  })

  it.each(Object.entries(DEFAULTS).filter(([nome]) => nome !== 'LOTUS_DEV_VITE_PORT'))(
    'usa a porta histórica como default de %s',
    (nome, porta) => {
      expect(DEV).toMatch(new RegExp(`\\$\\{${nome}:-${porta}\\}`))
    },
  )

  it('declara no .env.example da raiz toda variável LOTUS_DEV_* que lê', () => {
    const lidas = new Set([...DEV.matchAll(/\$\{(LOTUS_DEV_[A-Z_]+)/g)].map((m) => m[1]))
    expect(lidas.size).toBeGreaterThan(0)
    for (const nome of lidas) {
      expect(EXEMPLO).toMatch(new RegExp(`^\\s*#?\\s*${nome}=`, 'm'))
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm vitest run tests/compose-dev.test.ts
```

Esperado: FAIL. O primeiro erro é a leitura de `.env.example` (`ENOENT`), porque o arquivo ainda não existe.

- [ ] **Step 3: Criar o `.env.example` da raiz**

```bash
cat > .env.example <<'EOF'
# Offset de portas da ÁRVORE DE TRABALHO. Copie para `.env` (gitignored) e
# some o offset da sua árvore a cada porta. Sem `.env`, o compose usa os
# defaults abaixo, que são as portas históricas — quem clona o repositório
# sobe exatamente como sempre subiu.
#
# O offset existe porque `docker compose` já isola projeto, rede e volume por
# diretório (uma worktree é `lotus-infra_lotus-db`, o main tree é
# `lotus_lotus-db`), mas NÃO isola porta host: só uma árvore por vez pode
# publicar a 8080. Ver `docs/adrs.md`, ADR-13.
#
#   main tree           offset +0   (deixe como está)
#   segunda árvore      offset +1   8081 / 3308 / 8026 / 9002 / 9003 / 5174
#   terceira árvore     offset +2   8082 / 3309 / 8027 / 9004 / 9005 / 5175
#
# MinIO consome DUAS portas (API e console), então o offset dela anda de dois
# em dois. Escolheu um número já usado por outra árvore? `docker compose up`
# falha alto com "port is already allocated" — é a detecção, e é de graça.
#
# As variáveis do compose de PRODUÇÃO (LOTUS_IMAGE, LOTUS_WEB_IMAGE,
# LOTUS_HTTP_PORT, LOTUS_ENV_FILE) leem este mesmo arquivo e por isso não
# compartilham o prefixo LOTUS_DEV_.
LOTUS_DEV_HTTP_PORT=8080
LOTUS_DEV_DB_PORT=3307
LOTUS_DEV_MAILPIT_PORT=8025
LOTUS_DEV_MINIO_PORT=9000
LOTUS_DEV_MINIO_CONSOLE_PORT=9001
LOTUS_DEV_VITE_PORT=5173
EOF
```

- [ ] **Step 4: Parametrizar as portas do compose**

Em `docker-compose.yml`, troque as quatro chaves `ports:` — e **só** elas:

```yaml
  nginx:
    ports: ["${LOTUS_DEV_HTTP_PORT:-8080}:80"]

  mysql:
    ports: ["${LOTUS_DEV_DB_PORT:-3307}:3306"]

  mailpit:
    ports: ["${LOTUS_DEV_MAILPIT_PORT:-8025}:8025"]

  minio:
    ports: ["${LOTUS_DEV_MINIO_PORT:-9000}:9000", "${LOTUS_DEV_MINIO_CONSOLE_PORT:-9001}:9001"]
```

`DB_HOST`/`DB_PORT` (`mysql:3306`), `AWS_ENDPOINT` (`http://minio:9000`) e `GOTENBERG_URL` são rede interna do Compose, não porta publicada: **não mudam** com o offset e não entram aqui.

- [ ] **Step 5: Ignorar o `.env` da raiz**

Em `.gitignore`, na seção `# Ambiente / segredos`, acrescente a linha `/.env` junto de `/backend/.env` e `/frontend/.env`.

- [ ] **Step 6: Rodar e ver passar**

```bash
cd frontend && pnpm vitest run tests/compose-dev.test.ts
```

Esperado: PASS, **7 testes** — 1 (portas por variável) + 5 (`it.each` dos defaults, sem o do Vite, que ainda não é lido pelo compose) + 1 (declaração no `.env.example`).

- [ ] **Step 7: Ver cada asserção REPROVAR**

Três sondas, uma por asserção, cada uma revertida antes da próxima:

1. Em `docker-compose.yml`, troque `ports: ["${LOTUS_DEV_HTTP_PORT:-8080}:80"]` por `ports: ["8080:80"]`. Rode o teste: deve reprovar na primeira asserção. Reverta.
2. Troque o default de `LOTUS_DEV_DB_PORT` de `3307` para `3308`. Rode: deve reprovar no `it.each`. Reverta.
3. Em `.env.example`, apague a linha `LOTUS_DEV_MINIO_CONSOLE_PORT=9001`. Rode: deve reprovar na terceira asserção. Reverta.

Confirme `git status` limpo (fora do que a task entrega) antes de commitar.

- [ ] **Step 8: Provar que o caminho padrão não mudou**

```bash
docker compose config | grep -A2 "published"
```

Esperado: `published: "8080"`, `"3307"`, `"8025"`, `"9000"`, `"9001"` — sem `.env` na raiz, o compose resolve para as portas históricas.

- [ ] **Step 9: Commit**

```bash
git add docker-compose.yml .env.example .gitignore frontend/tests/compose-dev.test.ts
git commit -m "feat(compose): portas de dev por variavel com default historico"
```

---

### Task 3: Injetar no `app` as chaves de URL que carregam porta

**Files:**
- Modify: `docker-compose.yml` (serviço `app`, chave `environment:`)
- Modify: `frontend/tests/compose-dev.test.ts` (um `it` novo no `describe('docker-compose.yml')`)

**Interfaces:**
- Consumes: a decisão da Task 1 (A ou plano B).
- Produces: as cinco chaves injetadas. A Task 6 as prova contra a API real.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao `describe('docker-compose.yml', ...)`, depois do último `it`:

```ts
  it('injeta no app toda chave de URL que carrega porta, derivada da mesma variável', () => {
    // Sem isto, trocar o offset sobe a stack e derruba a sessão: o cookie do
    // Sanctum é emitido para o domínio de APP_URL e conferido contra
    // SANCTUM_STATEFUL_DOMAINS, e a URL pública de arquivo aponta para a
    // porta do MinIO da OUTRA árvore. Foi o passo manual de 2026-08-19.
    const CHAVES: Record<string, string> = {
      APP_URL: 'LOTUS_DEV_HTTP_PORT',
      FRONTEND_URL: 'LOTUS_DEV_VITE_PORT',
      SANCTUM_STATEFUL_DOMAINS: 'LOTUS_DEV_HTTP_PORT',
      AWS_ENDPOINT_PUBLIC: 'LOTUS_DEV_MINIO_PORT',
      AWS_URL: 'LOTUS_DEV_MINIO_PORT',
    }
    const [environmentDoApp] = regioesDaChave(blocoDoServico('app'), 'environment')
    expect(environmentDoApp).toBeDefined()
    for (const [chave, variavel] of Object.entries(CHAVES)) {
      const linha = new RegExp(`^\\s*${chave}:.*\\$\\{${variavel}:-\\d+\\}`, 'm')
      expect(environmentDoApp ?? '').toMatch(linha)
    }
  })
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm vitest run tests/compose-dev.test.ts
```

Esperado: FAIL com `serviço "app" ... environment` indefinido — o serviço `app` ainda não tem a chave.

- [ ] **Step 3: Injetar (decisão A da Task 1)**

No serviço `app` de `docker-compose.yml`, entre `volumes:` e `depends_on:`:

```yaml
    # A porta host vive no OFFSET da árvore (.env da raiz), e estas cinco
    # chaves carregam a porta DENTRO do valor — o cookie do Sanctum é emitido
    # para o domínio de APP_URL e conferido contra SANCTUM_STATEFUL_DOMAINS, e
    # a URL pública de arquivo aponta para a porta do MinIO. Derivá-las aqui é
    # o que dispensa editar `backend/.env` a cada árvore nova (P-03): variável
    # de ambiente real vence o `.env` do Laravel, que é imutável.
    #
    # AWS_ENDPOINT, DB_HOST/DB_PORT e GOTENBERG_URL ficam de fora de
    # propósito: são rede interna do Compose, não porta publicada.
    environment:
      APP_URL: http://localhost:${LOTUS_DEV_HTTP_PORT:-8080}
      FRONTEND_URL: http://localhost:${LOTUS_DEV_VITE_PORT:-5173}
      SANCTUM_STATEFUL_DOMAINS: localhost:${LOTUS_DEV_VITE_PORT:-5173},localhost:${LOTUS_DEV_HTTP_PORT:-8080}
      AWS_ENDPOINT_PUBLIC: http://localhost:${LOTUS_DEV_MINIO_PORT:-9000}
      AWS_URL: http://localhost:${LOTUS_DEV_MINIO_PORT:-9000}/lotus
```

**Se a Task 1 devolveu o plano B** (o `.env` vence a variável real): mantenha este bloco — ele continua sendo a fonte única — e, no mesmo commit, remova as cinco chaves de `backend/.env.example`, acrescentando no lugar delas um comentário de uma linha dizendo que elas vêm do `environment:` do serviço `app` em `docker-compose.yml`. Registre a mudança de rota no corpo da mensagem de commit.

- [ ] **Step 4: Rodar e ver passar**

```bash
cd frontend && pnpm vitest run tests/compose-dev.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Ver a asserção REPROVAR**

Apague a linha `AWS_URL:` do `environment:`. Rode o teste: deve reprovar nomeando `AWS_URL`. Reverta.

- [ ] **Step 6: Provar a resolução com offset**

```bash
LOTUS_DEV_HTTP_PORT=8081 LOTUS_DEV_MINIO_PORT=9002 LOTUS_DEV_VITE_PORT=5174 \
  docker compose config | grep -E "APP_URL|SANCTUM_STATEFUL_DOMAINS|AWS_URL"
```

Esperado: `APP_URL: http://localhost:8081`, `SANCTUM_STATEFUL_DOMAINS: localhost:5174,localhost:8081`, `AWS_URL: http://localhost:9002/lotus`.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml frontend/tests/compose-dev.test.ts
git commit -m "feat(compose): deriva as chaves de URL do app do offset da arvore"
```

---

### Task 4: Vite com porta derivada, `strictPort` e `VITE_API_URL` só em `serve`

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tests/compose-dev.test.ts` (um `describe` novo)
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: `DEFAULTS` da Task 2 (mesmo arquivo de teste).
- Produces: `vite.config.ts` exportando `defineConfig((env) => ...)` — uma **função**, não um objeto. Quem importar o config precisa chamá-lo com `{ command, mode }`.

- [ ] **Step 1: Escrever o teste que falha**

O teste **importa e chama** o config em vez de conferir texto: a propriedade que interessa é o objeto que o Vite recebe, e um `define` emitido no `build` levaria a URL de dev para dentro do bundle de produção sem que texto nenhum denunciasse. Acrescente ao fim de `frontend/tests/compose-dev.test.ts`:

```ts
describe('vite.config.ts', () => {
  const carregar = async (command: 'serve' | 'build') => {
    const modulo = await import('../vite.config')
    const fabrica = modulo.default as unknown as (env: {
      command: 'serve' | 'build'
      mode: string
    }) => Promise<Record<string, any>> | Record<string, any>
    expect(typeof fabrica).toBe('function')
    return await fabrica({ command, mode: command === 'serve' ? 'development' : 'production' })
  }

  it('serve a porta do offset da árvore, com strictPort ligado', async () => {
    // strictPort é a decisão: sem ele o Vite escorrega para a porta seguinte
    // em silêncio, e o SANCTUM_STATEFUL_DOMAINS injetado no container passa a
    // apontar para uma porta que ninguém está servindo — a sessão morre sem
    // mensagem que explique.
    const config = await carregar('serve')
    expect(config.server?.strictPort).toBe(true)
    expect(config.server?.port).toBe(Number(DEFAULTS.LOTUS_DEV_VITE_PORT))
  })

  it('deriva VITE_API_URL no serve e NÃO emite o define no build', async () => {
    // A imagem de produção passa `ENV VITE_API_URL=""` (docker/Dockerfile.prod:32)
    // para servir SPA e API da mesma origem. Um define incondicional aqui
    // gravaria "http://localhost:8080" dentro do bundle de produção.
    const servir = await carregar('serve')
    expect(servir.define?.['import.meta.env.VITE_API_URL']).toBe(
      JSON.stringify(`http://localhost:${DEFAULTS.LOTUS_DEV_HTTP_PORT}`),
    )

    const construir = await carregar('build')
    expect(construir.define?.['import.meta.env.VITE_API_URL']).toBeUndefined()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm vitest run tests/compose-dev.test.ts
```

Esperado: FAIL em `expect(typeof fabrica).toBe('function')` — hoje `vite.config.ts` exporta um objeto.

- [ ] **Step 3: Reescrever `frontend/vite.config.ts`**

O arquivo inteiro fica assim. Os dois comentários existentes (`resolve.alias` e o bloco sobre `globals`) são preservados palavra por palavra — eles explicam decisões que continuam valendo.

```ts
/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// A RAIZ do repositório, não `frontend/`: o offset de portas da árvore de
// trabalho mora no `.env` da raiz, que o compose também lê. O prefixo
// `LOTUS_` restringe a leitura a ele — `import.meta.env` da aplicação segue
// vindo só de `frontend/.env`, e as chaves `VITE_*` continuam sendo dele.
const RAIZ_DO_REPO = path.resolve(__dirname, "..");

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const offset = loadEnv(mode, RAIZ_DO_REPO, "LOTUS_");
  const portaVite = Number(offset.LOTUS_DEV_VITE_PORT ?? 5173);
  const portaApi = offset.LOTUS_DEV_HTTP_PORT ?? "8080";
  const apiJaDefinida = loadEnv(mode, __dirname, "VITE_").VITE_API_URL !== undefined;

  return {
    plugins: [react(), tailwindcss({ optimize: true })],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@app": path.resolve(__dirname, "./src/app"),
        "@shared": path.resolve(__dirname, "./src/shared"),
        "@features": path.resolve(__dirname, "./src/features"),
      },
    },
    // `strictPort` falha alto na porta ocupada em vez de escorregar para a
    // seguinte: o container recebe `SANCTUM_STATEFUL_DOMAINS` com ESTA porta,
    // e escorregar em silêncio mata a sessão sem mensagem que explique.
    server: { port: portaVite, strictPort: true },
    // Só no `serve`, e só como default. No `build` este define NÃO é emitido:
    // a imagem de produção passa `ENV VITE_API_URL=""` (docker/Dockerfile.prod)
    // para servir SPA e API da mesma origem, e um define incondicional
    // gravaria a URL de desenvolvimento dentro do bundle. Um `VITE_API_URL`
    // explícito em `frontend/.env` continua vencendo o derivado.
    ...(command === "serve" && !apiJaDefinida
      ? { define: { "import.meta.env.VITE_API_URL": JSON.stringify(`http://localhost:${portaApi}`) } }
      : {}),
    // Sem `globals`: cada teste importa describe/it/expect de 'vitest'. Assim os
    // arquivos de teste continuam type-checados pelo `tsc -b` do pnpm build, em
    // vez de virarem zona sem tipo.
    test: {
      environment: "jsdom",
      // `tests/` fica fora de `src/` porque o que ele confere é o REPOSITÓRIO,
      // não a app: o container `app` monta só `./backend` e `./frontend`, então
      // o vitest é o único runner do projeto com acesso à raiz.
      include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    },
  };
});
```

- [ ] **Step 4: Ajustar `frontend/.env.example`**

O arquivo hoje tem uma linha só, `VITE_API_URL=http://localhost:8080`. Ela passa a ser comentada, com a explicação:

```
# Descomente APENAS para apontar o dev server para uma API que não é a da sua
# árvore. Comentada, a URL é derivada de LOTUS_DEV_HTTP_PORT (.env da raiz)
# pelo vite.config.ts, e segue o offset da árvore sozinha.
# VITE_API_URL=http://localhost:8080
```

Quem já tem `frontend/.env` com a chave descomentada continua funcionando — o explícito vence.

- [ ] **Step 5: Rodar e ver passar**

```bash
cd frontend && pnpm vitest run tests/compose-dev.test.ts
```

Esperado: PASS nos dois `it` novos.

Se o `import('../vite.config')` estourar por causa dos plugins (`@vitejs/plugin-react`, `@tailwindcss/vite`), **não** desista da propriedade: troque a fábrica por leitura textual do arquivo (a mesma técnica dos outros testes de raiz), exigindo `strictPort: true`, `LOTUS_DEV_VITE_PORT` e `command === "serve"` guardando o `define`. Registre a troca no corpo do commit — é limitação medida, não escolha.

- [ ] **Step 6: Ver as duas asserções REPROVAREM**

1. Troque `strictPort: true` por `strictPort: false`. Rode: reprova. Reverta.
2. Tire o `command === "serve" &&` da condição do `define`. Rode: reprova no `build`. Reverta.

- [ ] **Step 7: Provar que o build não regrediu**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: `tsc -b` e `vite build` em exit 0, lint 0, e a suíte com **um arquivo a mais** que a baseline de 100 arquivos / 555 testes. Registre os números medidos.

- [ ] **Step 8: Commit**

```bash
git add frontend/vite.config.ts frontend/tests/compose-dev.test.ts frontend/.env.example
git commit -m "feat(vite): porta e VITE_API_URL derivados do offset da arvore"
```

---

### Task 5: Doc — ADR-13, `CLAUDE.md` §6 e `README.md`

**Files:**
- Modify: `docs/adrs.md:107-108` (ADR-13)
- Modify: `CLAUDE.md:159-161`
- Modify: `README.md:16-17`

**Interfaces:**
- Consumes: os nomes das variáveis e os defaults da Task 2.
- Produces: nada que outra task leia.

- [ ] **Step 1: Emendar o ADR-13**

Acrescente ao fim do parágrafo do ADR-13, antes da linha do ADR-14:

```markdown
**Emenda 2026-08-24 (bloco `compose-por-worktree`, paga a P-03):** o Compose já isola projeto, rede e volume por diretório — uma worktree sobe `lotus-infra_lotus-db`, o main tree sobe `lotus_lotus-db` —, mas **não** isola porta host. As portas publicadas de `docker-compose.yml` vêm de variáveis `LOTUS_DEV_*` com default igual à porta histórica, e o `.env` da raiz (gitignored, molde em `.env.example`) escolhe o offset da árvore. O serviço `app` deriva das mesmas variáveis as cinco chaves que carregam porta dentro do valor (`APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `AWS_ENDPOINT_PUBLIC`, `AWS_URL`), e o Vite deriva a sua porta e o `VITE_API_URL`. O prefixo é `LOTUS_DEV_` e não `LOTUS_` porque `docker-compose.prod.yml` lê o mesmo `.env`. Catraca: `frontend/tests/compose-dev.test.ts`.
```

- [ ] **Step 2: Corrigir o §6 do `CLAUDE.md`**

O parágrafo atual crava as portas como se fossem constantes. Substitua-o por:

```markdown
Backend via nginx: http://localhost:8080 · Frontend: http://localhost:5173 — **defaults do offset
zero**. Cada árvore de trabalho escolhe o seu offset no `.env` da raiz (molde em `.env.example`),
porque o Compose isola projeto e volume por diretório mas não isola porta host (ADR-13, emenda de
2026-08-24). Compose: `app` (PHP-FPM Alpine), `nginx`, `mysql` (host :3307), `gotenberg` (PDF),
`minio` (S3 dev) e `createbuckets` (job de bootstrap do bucket do MinIO; sobe, cria e sai).
```

- [ ] **Step 3: Corrigir o `README.md`**

As linhas 16-17 passam a nomear o default:

```markdown
- Backend: http://localhost:8080 (default; some o offset da sua árvore — ver `.env.example`)
- Frontend: http://localhost:5173 (default; idem)
```

- [ ] **Step 4: Rodar a catraca de doc**

```bash
cd frontend && pnpm vitest run tests/repo-docs-refs.test.ts
```

Esperado: PASS. Ela varre `CLAUDE.md`, `docs/adrs.md` e `README.md` atrás de path citado que não existe — `.env.example` e `frontend/tests/compose-dev.test.ts` precisam existir de fato, e existem desde as Tasks 2 e 4.

- [ ] **Step 5: Commit**

```bash
git add docs/adrs.md CLAUDE.md README.md
git commit -m "docs: registra o offset de portas por arvore no ADR-13, CLAUDE.md e README"
```

---

### Task 6: DoD — duas stacks no ar, login real na segunda

Esta é a task que paga a P-03. Nada aqui é opcional: sem ela, o bloco entrega parametrização sem prova de que a segunda lane de backend existe.

**Files:**
- Create: `.env` na raiz (gitignored — **não** entra em commit nenhum)
- Create: `docs/superpowers/audits/2026-08-24-compose-por-worktree-dod.md` (as saídas medidas, coladas)

**Interfaces:**
- Consumes: tudo das Tasks 2 a 4.
- Produces: a evidência que o `/revisar-sprint` e o `/fechar-sprint` leem.

- [ ] **Step 1: Confirmar a stack do main tree no ar, nas portas históricas**

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep '^lotus-'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/up
```

Esperado: os containers `lotus-*` publicando 8080/3307/8025/9000/9001, e `/up` em **200**. Se a stack do main tree estiver desligada, ligue-a de lá — a prova exige as duas de pé ao mesmo tempo, e é isso que a P-03 diz não existir.

- [ ] **Step 2: Escolher o offset +1 desta árvore**

```bash
cp .env.example .env
sed -i -e 's/^LOTUS_DEV_HTTP_PORT=.*/LOTUS_DEV_HTTP_PORT=8081/' \
       -e 's/^LOTUS_DEV_DB_PORT=.*/LOTUS_DEV_DB_PORT=3308/' \
       -e 's/^LOTUS_DEV_MAILPIT_PORT=.*/LOTUS_DEV_MAILPIT_PORT=8026/' \
       -e 's/^LOTUS_DEV_MINIO_PORT=.*/LOTUS_DEV_MINIO_PORT=9002/' \
       -e 's/^LOTUS_DEV_MINIO_CONSOLE_PORT=.*/LOTUS_DEV_MINIO_CONSOLE_PORT=9003/' \
       -e 's/^LOTUS_DEV_VITE_PORT=.*/LOTUS_DEV_VITE_PORT=5174/' .env
git status --short .env
```

Esperado: `git status` **não** lista `.env` — a linha `/.env` da Task 2 o cobre.

- [ ] **Step 3: Subir a stack desta árvore**

```bash
docker compose up -d
docker compose ps --format '{{.Name}}\t{{.Ports}}'
```

Esperado: containers `lotus-infra-*` nas portas 8081/3308/8026/9002/9003, com os `lotus-*` intactos.

- [ ] **Step 4: Preparar o banco próprio da árvore**

```bash
docker compose exec -T app php -r 'echo file_get_contents(".env");' | grep '^APP_KEY='
docker compose exec -T app php artisan migrate --seed --force
docker volume ls | grep lotus
```

`backend/.env` desta árvore já existe (medido em 2026-08-24). Se o `APP_KEY` vier vazio, rode
`docker compose exec -T app php artisan key:generate` antes do `migrate` — sem chave o boot morre
com `No application encryption key has been specified`, e isso não é falha da parametrização.

Esperado: migrations e seeders concluídos, e `docker volume ls` mostrando **`lotus-infra_lotus-db` ao lado de `lotus_lotus-db`** — a prova de que o dado do main tree não foi tocado.

- [ ] **Step 5: Prova 1 — as duas portas respondendo ao mesmo tempo**

```bash
curl -s -o /dev/null -w 'main  %{http_code}\n' http://localhost:8080/up
curl -s -o /dev/null -w 'infra %{http_code}\n' http://localhost:8081/up
```

Esperado: **200** nas duas.

- [ ] **Step 6: Prova 2 — a injeção chegou à aplicação**

```bash
docker compose exec -T app php artisan tinker --execute="echo config('app.url'), ' | ', implode(',', config('sanctum.stateful')), ' | ', config('filesystems.disks.s3.url');"
```

Esperado: `http://localhost:8081` e `localhost:5174,localhost:8081` na lista do Sanctum, e a URL do S3 em `:9002`. Colar a saída literal.

- [ ] **Step 7: Prova 3 — login real ponta a ponta na porta alternativa**

```bash
rm -f /tmp/lotus-infra-cookies.txt
curl -s -c /tmp/lotus-infra-cookies.txt -o /dev/null -w 'csrf   %{http_code}\n' http://localhost:8081/sanctum/csrf-cookie
XSRF=$(grep XSRF-TOKEN /tmp/lotus-infra-cookies.txt | awk '{print $7}' | sed 's/%3D/=/g')
curl -s -b /tmp/lotus-infra-cookies.txt -c /tmp/lotus-infra-cookies.txt \
     -H "X-XSRF-TOKEN: $XSRF" -H 'Accept: application/json' \
     -H 'Origin: http://localhost:8081' -H 'Referer: http://localhost:8081/' \
     -d 'email=admin@lotus.cl&password=senha123' \
     -o /dev/null -w 'login  %{http_code}\n' http://localhost:8081/api/login
curl -s -b /tmp/lotus-infra-cookies.txt -H 'Accept: application/json' \
     -w '\nme     %{http_code}\n' http://localhost:8081/api/me
```

Esperado: csrf **204**, login **200** com `lotus-session` gravado no arquivo de cookies, `/api/me` **200** com o admin do seed (`backend/database/seeders/DatabaseSeeder.php:40`). Um **419** no login significa que a cadeia Sanctum não casou com a porta — é a falha que esta prova existe para pegar, não um detalhe de curl.

- [ ] **Step 8: Prova 4 — arquivo no MinIO da porta alternativa**

```bash
docker compose exec -T app php artisan tinker --execute="Storage::disk('s3')->put('sonda-p03.txt', 'ok'); echo Storage::disk('s3')->url('sonda-p03.txt'), PHP_EOL;"
curl -s -o /dev/null -w 'objeto %{http_code}\n' "http://localhost:9002/lotus/sonda-p03.txt"
docker compose exec -T app php artisan tinker --execute="Storage::disk('s3')->delete('sonda-p03.txt');"
```

Esperado: a URL impressa em `:9002` (não `:9000`), e o objeto respondendo. Apague a sonda no fim — é escrita em bucket, e não fica.

- [ ] **Step 9: Prova 5 — Vite na porta derivada falando com a API certa**

```bash
cd frontend && pnpm dev
```

Em outro terminal:

```bash
curl -s -o /dev/null -w 'vite   %{http_code}\n' http://localhost:5174/
```

Esperado: Vite anunciando `http://localhost:5174/` (e **não** 5173, que é do main tree), com `strictPort` recusando se a porta estiver tomada. No navegador, `http://localhost:5174` faz login com o mesmo admin e a aba de rede mostra as chamadas indo para `http://localhost:8081/api/...`. Registre isso — é a prova de que `VITE_API_URL` derivou.

- [ ] **Step 10: Escrever a evidência**

Crie `docs/superpowers/audits/2026-08-24-compose-por-worktree-dod.md` com as saídas **literais** dos Steps 1 e 5 a 9 (comando, saída, veredito). Sem paráfrase.

- [ ] **Step 11: Gate do bloco**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
git diff main...HEAD --stat
```

Esperado: lint 0, build exit 0, suíte verde com os números registrados. O `--stat` **não** pode listar `backend/`, `frontend/src/`, `docker-compose.prod.yml`, `docker-compose.prod-probe.yml`, `docker/Dockerfile.prod`, `docker/probe.env` nem `docker/nginx/prod.conf`. Com `backend/` vazio, declare `pint` e `typescript:transform` como **N/A por escopo medido** — cole o `--stat` que prova.

- [ ] **Step 12: Derrubar a stack desta árvore e commitar**

```bash
docker compose down
git add docs/superpowers/audits/2026-08-24-compose-por-worktree-dod.md
git commit -m "docs(audit): evidencia do DoD do compose por worktree (P-03)"
```

---

## Handoff de execução

**executor: claude**

Critério: a Task 1 mede uma premissa que pode virar o desenho (plano B da §5), a Task 4 tem uma rota alternativa que depende de julgamento na hora (fábrica importável × leitura textual), e a Task 6 é prova contra API real e navegador com decisão sobre o que conta como evidência. Nenhuma delas é mecânica com verificação fechada — que é o critério para `codex`.
