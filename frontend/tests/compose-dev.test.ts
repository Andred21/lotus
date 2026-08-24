import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
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
/** O recorte do config do Vite que este arquivo inspeciona. */
type ConfigResolvido = {
  server?: { port?: number; strictPort?: boolean }
  define?: Record<string, string>
}

/** Devolve uma variável de ambiente ao valor que tinha — inclusive ao "não existia". */
function restaurar(nome: string, valor: string | undefined): void {
  if (valor === undefined) {
    delete process.env[nome]
  } else {
    process.env[nome] = valor
  }
}

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

  it('injeta no app toda chave de URL que carrega porta, derivada da mesma variável', () => {
    // Sem isto, trocar o offset sobe a stack e derruba a sessão: o cookie do
    // Sanctum é emitido para o domínio de APP_URL e conferido contra
    // SANCTUM_STATEFUL_DOMAINS, e a URL pública de arquivo aponta para a
    // porta do MinIO da OUTRA árvore. Foi o passo manual de 2026-08-19.
    // Record<string, string[]>, não Record<string, string>: SANCTUM_STATEFUL_DOMAINS
    // carrega DUAS variáveis no mesmo valor (Vite e HTTP). Um mapa 1:1 só
    // conferia a metade HTTP — a metade Vite podia virar literal com a
    // catraca verde, e é exatamente o que faria a segunda árvore levar 401
    // silencioso no `/api/me` (achado E do review final).
    const CHAVES: Record<string, string[]> = {
      APP_URL: ['LOTUS_DEV_HTTP_PORT'],
      FRONTEND_URL: ['LOTUS_DEV_VITE_PORT'],
      SANCTUM_STATEFUL_DOMAINS: ['LOTUS_DEV_VITE_PORT', 'LOTUS_DEV_HTTP_PORT'],
      AWS_ENDPOINT_PUBLIC: ['LOTUS_DEV_MINIO_PORT'],
      AWS_URL: ['LOTUS_DEV_MINIO_PORT'],
      // Cookie de sessão não é isolado por porta pelo navegador: sem este
      // sufixo, logar numa árvore sobrescreve o `laravel-session` da outra
      // (achado A do review final).
      SESSION_COOKIE: ['LOTUS_DEV_HTTP_PORT'],
    }
    const [environmentDoApp] = regioesDaChave(blocoDoServico('app'), 'environment')
    expect(environmentDoApp).toBeDefined()
    for (const [chave, variaveis] of Object.entries(CHAVES)) {
      for (const variavel of variaveis) {
        // O número do default é PINADO (não `\d+`): sem isso, um default
        // trocado por engano (ex.: `LOTUS_DEV_VITE_PORT:-5174`) passaria
        // verde mesmo divergindo da porta histórica (achado F do review final).
        const linha = new RegExp(`^\\s*${chave}:.*\\$\\{${variavel}:-${DEFAULTS[variavel]}\\}`, 'm')
        expect(environmentDoApp ?? '').toMatch(linha)
      }
    }
  })
})

describe('vite.config.ts', () => {
  /**
   * O que interessa é o OBJETO que o Vite recebe, não o texto do arquivo: um
   * `define` acrescentado fora do ternário sobreviveria ao `build` e entraria
   * no bundle de produção sem que regex nenhuma denunciasse. Então o teste
   * importa a fábrica e a executa.
   *
   * O que quebrou a rota na primeira tentativa NÃO foi o Vite: é o VITEST que
   * resolve o próprio `vite.config.ts` (com `command: "serve"`) para montar o
   * ambiente antes dos testes e, em `deleteDefineConfig`
   * (`node_modules/vitest/dist/chunks/cli-api.*.js`, ~linha 10070), move todo
   * `define["import.meta.env.X"]` para `process.env[X]` e o apaga do config.
   * Como `loadEnv` lê `process.env` por prefixo, `apiJaDefinida` já chegava
   * `true` dentro do teste e o define sumia do resultado. Limpar a variável
   * antes de cada caso remove a contaminação.
   */
  // A extensão `.ts` é obrigatória no import: `tsconfig.node.json` — que é o
  // projeto que cobre `tests/` — resolve por `nodenext`, e sem ela o `tsc -b`
  // do `pnpm build` para com TS2307. `allowImportingTsExtensions` já está ligado.
  const carregar = async (command: 'serve' | 'build') => {
    const modulo = await import('../vite.config.ts')
    const fabrica = modulo.default as unknown as (env: {
      command: 'serve' | 'build'
      mode: string
    }) => Promise<ConfigResolvido> | ConfigResolvido
    expect(typeof fabrica).toBe('function')
    return await fabrica({ command, mode: command === 'serve' ? 'development' : 'production' })
  }

  // `loadEnv(mode, RAIZ, prefixo)` lê os quatro arquivos abaixo para
  // `mode === 'development'` (o `command: 'serve'` desta suíte) — qualquer um
  // deles presente na raiz de quem roda o teste (ou plantado pela Task 6
  // seguinte, que cria justamente `.env`) venceria os defaults sem que os
  // casos que os afirmam percebessem. Por isso TODOS saem de cena no
  // `beforeEach`, não só `.env`.
  const NOMES_ENV_DA_RAIZ = ['.env', '.env.local', '.env.development', '.env.development.local'] as const
  const ENV_DA_RAIZ = join(RAIZ, '.env')
  const CAMINHOS_ENV = NOMES_ENV_DA_RAIZ.map((nome) => ({
    nome,
    real: join(RAIZ, nome),
    backup: join(RAIZ, `${nome}.backup-do-teste`),
  }))

  /** Guarda o valor original na primeira sobrescrita e aplica o novo. */
  const originais = new Map<string, string | undefined>()
  function sobrescrever(nome: string, valor: string | undefined): void {
    if (!originais.has(nome)) originais.set(nome, process.env[nome])
    restaurar(nome, valor)
  }

  /**
   * Nomes (relativos a `CAMINHOS_ENV`) com backup pendente de devolução —
   * marcado IMEDIATAMENTE após o `renameSync`, antes de qualquer escrita.
   * Separado de `plantados` de propósito: se a escrita adiante falhar (disco,
   * permissão), o backup já harmonizado neste Set ainda é restaurado — o real
   * não fica órfão à espera de um `writeFileSync` que nunca marcou uma flag.
   */
  const backupsPendentes = new Set<string>()
  /** Nomes com arquivo PLANTADO pelo teste atual (precisa ser removido). */
  const plantados = new Set<string>()

  /** Afasta um `.env*` real da raiz por rename, se existir. Idempotente. */
  function afastarEnvReal(caminho: (typeof CAMINHOS_ENV)[number]): void {
    if (existsSync(caminho.backup)) {
      throw new Error(`${caminho.backup} já existe — restaure-o à mão antes de rodar a suíte`)
    }
    if (existsSync(caminho.real)) {
      renameSync(caminho.real, caminho.backup)
      backupsPendentes.add(caminho.nome)
    }
  }

  /** Remove o plantado (se houver) e devolve o backup (se houver) de um `.env*`. */
  function restaurarEnvReal(caminho: (typeof CAMINHOS_ENV)[number]): void {
    if (plantados.has(caminho.nome)) {
      rmSync(caminho.real, { force: true })
      plantados.delete(caminho.nome)
    }
    if (backupsPendentes.has(caminho.nome)) {
      renameSync(caminho.backup, caminho.real)
      backupsPendentes.delete(caminho.nome)
    }
  }

  function restaurarTodosOsEnvsDaRaiz(): void {
    for (const caminho of CAMINHOS_ENV) restaurarEnvReal(caminho)
  }

  // Rede de segurança para Ctrl-C, timeout de CI ou crash entre o rename e o
  // `afterEach`: sem isto, a árvore volta em silêncio às portas históricas e
  // um `.env` real do usuário fica sequestrado sob o nome de backup — que por
  // isso também está no `.gitignore`, para nunca entrar num `git add -A`.
  process.on('exit', restaurarTodosOsEnvsDaRaiz)
  process.on('SIGINT', () => {
    restaurarTodosOsEnvsDaRaiz()
    process.exit(130)
  })

  /**
   * Escreve o `.env` da RAIZ com o offset do teste. O real já foi afastado
   * pelo `beforeEach` (`afastarEnvReal`) — aqui só resta escrever e marcar
   * como plantado, para o `afterEach`/`restaurarTodosOsEnvsDaRaiz` remover.
   */
  function plantarEnvDaRaiz(conteudo: string): void {
    writeFileSync(ENV_DA_RAIZ, conteudo, 'utf8')
    plantados.add('.env')
  }

  beforeEach(() => {
    // O VITEST espelhou o define em `process.env` antes dos testes (ver acima);
    // limpar a chave devolve a fábrica ao estado que o Vite lhe daria. As
    // variáveis do offset também saem, para que o `.env` plantado seja a única
    // fonte — `loadEnv` deixa `process.env` vencer o arquivo.
    sobrescrever('VITE_API_URL', undefined)
    sobrescrever('LOTUS_DEV_VITE_PORT', undefined)
    sobrescrever('LOTUS_DEV_HTTP_PORT', undefined)

    // Os casos de default (`toBe(DEFAULTS...)`) só provam algo se NENHUM
    // `.env*` real da raiz estiver no disco durante a chamada à fábrica —
    // senão `loadEnv` o lê do disco e vence o default, como o revisor mediu
    // com o `.env` que a Task 6 cria (`LOTUS_DEV_VITE_PORT=5174`).
    for (const caminho of CAMINHOS_ENV) afastarEnvReal(caminho)
  })

  afterEach(() => {
    restaurarTodosOsEnvsDaRaiz()
    for (const [nome, valor] of originais) restaurar(nome, valor)
    originais.clear()
  })

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
    // A imagem de produção passa `ENV VITE_API_URL=""` (docker/Dockerfile.prod)
    // para servir SPA e API da mesma origem. Um define incondicional aqui
    // gravaria "http://localhost:8080" dentro do bundle de produção — por isso
    // o caso de `build` afirma a AUSÊNCIA da chave no define RESOLVIDO, não a
    // ausência de um texto no arquivo.
    const servir = await carregar('serve')
    expect(servir.define?.['import.meta.env.VITE_API_URL']).toBe(
      JSON.stringify(`http://localhost:${DEFAULTS.LOTUS_DEV_HTTP_PORT}`),
    )

    const construir = await carregar('build')
    expect(construir.define?.['import.meta.env.VITE_API_URL']).toBeUndefined()
  })

  it('deriva porta e API do `.env` da RAIZ do repositório, não de valores fixos', async () => {
    // Sem este caso nada reprova se `RAIZ_DO_REPO` virar `__dirname`: os dois
    // defaults continuariam batendo e o offset morreria em silêncio — a
    // suíte ficaria verde com a segunda árvore servindo nas portas da
    // primeira. MEDIDO: a via por `process.env` NÃO serve aqui, porque
    // `loadEnv` lê `process.env` seja qual for o diretório — com
    // `RAIZ_DO_REPO = __dirname` os 11 testes continuavam passando. Por isso
    // o offset entra pelo arquivo, na RAIZ, que é o que amarra o DIRETÓRIO.
    //
    // Isto NÃO pina o prefixo `LOTUS_`: `vite.config.ts` só lê
    // `offset.LOTUS_DEV_VITE_PORT` e `offset.LOTUS_DEV_HTTP_PORT` por nome
    // fixo — trocar `loadEnv(mode, RAIZ_DO_REPO, "LOTUS_")` por
    // `loadEnv(mode, RAIZ_DO_REPO, "")` amplia o conjunto que `loadEnv`
    // devolve, mas como o código só acessa essas duas chaves (já prefixadas
    // de qualquer forma), nenhuma chave extra no objeto muda o resultado
    // observável — MEDIDO plantando `VITE_API_URL` (sem prefixo `LOTUS_`) no
    // `.env` da raiz: o alargamento do prefixo não derruba nenhum assert
    // aqui. Pinar o prefixo por este teste exigiria tocar `vite.config.ts`
    // (fora do escopo desta correção); o que este caso prova é só o
    // diretório.
    plantarEnvDaRaiz('LOTUS_DEV_VITE_PORT=5199\nLOTUS_DEV_HTTP_PORT=8199\n')

    const config = await carregar('serve')
    expect(config.server?.port).toBe(5199)
    expect(config.define?.['import.meta.env.VITE_API_URL']).toBe(
      JSON.stringify('http://localhost:8199'),
    )
  })

  it('cai no default quando a variável do `.env` está VAZIA, não só quando está ausente', async () => {
    // Achado B do review final: o plano original usava `??`, que só cai no
    // default com a variável UNSET. O Compose lê o MESMO arquivo com
    // `${VAR:-default}`, que cai no default também com a variável VAZIA —
    // `??` deixaria `Number("") === 0` (porta aleatória, `strictPort` não
    // protege) e a baseURL quebrada "http://localhost:". `||` cobre os dois
    // casos.
    plantarEnvDaRaiz('LOTUS_DEV_VITE_PORT=\nLOTUS_DEV_HTTP_PORT=\n')

    const config = await carregar('serve')
    expect(config.server?.port).toBe(Number(DEFAULTS.LOTUS_DEV_VITE_PORT))
    expect(config.define?.['import.meta.env.VITE_API_URL']).toBe(
      JSON.stringify(`http://localhost:${DEFAULTS.LOTUS_DEV_HTTP_PORT}`),
    )
  })
})
