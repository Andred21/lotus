import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Lição 13 em forma de mecanismo: doc que descreve intenção não-construída é
 * pior que doc ausente. Três reincidências pagas — o ADR-15 mandando por uma
 * arquitetura que nunca existiu, as leis mandando por DTO em `app/Data` (pasta
 * que nunca existiu) e a nota do ADR-12 citando `LibreOfficeConverter` (classe
 * que nunca existiu, Q-5 de 2026-08-10). Nenhuma delas foi erro de comando: as
 * três foram um path ou uma classe citada que não estava lá.
 *
 * Mora em `frontend/tests/` por um motivo medido, não por gosto: o container
 * `app` monta só `./backend` e `./frontend`, então PHPUnit não enxerga
 * `CLAUDE.md`, `.claude/rules/` nem `docs/`. O vitest roda nativo no WSL e é o
 * único runner do projeto com acesso à raiz.
 */
const RAIZ = resolve(__dirname, '..', '..')

/** Doc NORMATIVO: afirma o que É. Histórico fica fora. */
const DOCS = [
  'CLAUDE.md',
  'INSTRUÇÕES-DO-PROJETO.md',
  '.claude/rules/backend-ddd.md',
  '.claude/rules/frontend-estilizacao.md',
  '.claude/rules/frontend-fsliced.md',
  '.claude/rules/generated-types.md',
  '.claude/rules/migrations.md',
  'docs/README.md',
  'docs/adrs.md',
  'docs/der-fisico.md',
  'docs/estrutura-monolito.md',
]

/**
 * `docs/superpowers/**` (progress, state, plans, specs) e `docs/superpowers/pendencias/abertas.md`
 * ficam FORA de propósito: o primeiro é histórico e congela referência morta
 * por design — `ManualPdfService` morreu em 2026-08-10 e a linha que o cita
 * continua correta como registro —, e o segundo REGISTRA divergência, então
 * citar o que não existe é a função dele.
 */

/** Bases tentadas: a doc cita path relativo ao projeto de que fala. */
const BASES = ['', 'backend/', 'frontend/', 'frontend/src/', 'backend/app/', 'docs/', 'frontend/src/shared/ui/']

const EXTENSOES = ['.php', '.ts', '.tsx', '.md', '.json', '.png', '.pdf', '.sh', '.yml', '.yaml', '.js', '.css']

const PREFIXOS = ['backend/', 'frontend/', 'src/', 'app/', 'docs/', '.claude/', 'tests/', 'database/', 'config/', 'resources/', 'bootstrap/']

/**
 * Citações deliberadas de coisa que NÃO existe. Lista que só encolhe; ampliar
 * é uma linha mais a justificativa no commit — mesmo contrato do `ALLOWED` do
 * `DomainDependencyTest`. Detectar isso por vizinhança de texto ("não existe",
 * "nunca existiu") foi considerado e recusado: guarda frágil é pior que
 * nenhuma.
 */
const CITACOES_DELIBERADAS: Record<string, string> = {
  '.claude/rules/generated-types.md::app/Data': 'a rule escreve "Não existe `app/Data`" — a negação é o conteúdo',
  'docs/README.md::app/Data': 'a lição 13 cita a pasta justamente por ela nunca ter existido',
  'docs/estrutura-monolito.md::src/Domains/': 'alternativa em aberto na lista [A CONFIRMAR FASE 2], não afirmação',
  // Ledger local de execução: `.gitignore:21` o exclui por decisão e o CLAUDE.md
  // §3 o cita como "OPCIONAL (se presente)". Ele existe só na máquina que está
  // executando um bloco, então conferi-lo transforma estado local em critério:
  // a guarda passava no main tree de 2026-08-11 (onde a execução o havia criado)
  // e reprovava em worktree novo e em clone limpo. Medido em 2026-08-11, na
  // abertura de `estilizacao-adr16-shell-tipografia`, com as três reprovando.
  'CLAUDE.md::.superpowers/sdd/progress.md': 'ledger local gitignorado (.gitignore:21), declarado OPCIONAL no CLAUDE.md §3',
  'INSTRUÇÕES-DO-PROJETO.md::.superpowers/sdd/progress.md': 'idem — nunca versionado, por decisão',
  'docs/README.md::.superpowers/sdd/progress.md': 'idem — nunca versionado, por decisão',
}

/** Glob, placeholder e alternativa não são path conferível. */
const ehPadrao = (token: string) => /[*<>|]/.test(token)

/** O Drive é fonte externa ao repositório (CLAUDE.md §3). */
const foraDoRepo = (token: string) => token.startsWith('Drive/')

function pareceCaminho(token: string): boolean {
  if (token.includes(' ') || token.startsWith('http')) return false
  if (PREFIXOS.some((p) => token.startsWith(p))) return true
  return token.includes('/') && EXTENSOES.some((e) => token.endsWith(e))
}

/**
 * Citação do projeto é line-precise: `backend/config/logging.php:134-142`,
 * `docker/php/entrypoint.sh:19-25`. O sufixo `:NN` / `:NN-NN` faz parte da
 * convenção — tirá-lo para caber nesta guarda seria a guarda mandando na doc.
 * Aqui ele é recortado e depois CONFERIDO: o arquivo precisa existir e ser
 * comprido o bastante para a linha citada. Citação que aponta para além do fim
 * do arquivo é o mesmo defeito da lição 13, um passo mais sutil — o path existe,
 * mas o que ele promete mostrar não está lá.
 *
 * Só o começo da faixa é conferido: é onde a âncora da citação está, e um fim
 * de faixa passando alguns caracteres do EOF não muda o que o leitor acha.
 */
function resolvePath(token: string): boolean {
  const limpo = token.replace(/[.,;:]+$/, '')
  const comLinha = /^(.*?):(\d+)(?:-\d+)?$/.exec(limpo)
  const caminho = comLinha ? comLinha[1] : limpo
  const linha = comLinha ? Number(comLinha[2]) : null

  return BASES.some((base) => {
    const absoluto = join(RAIZ, base + caminho)
    if (!existsSync(absoluto)) return false
    if (linha === null) return true

    return readFileSync(absoluto, 'utf8').split('\n').length >= linha
  })
}

type Referencia = { doc: string; linha: number; token: string }

function referencias(doc: string): Referencia[] {
  const conteudo = readFileSync(join(RAIZ, doc), 'utf8')
  const achados: Referencia[] = []

  conteudo.split('\n').forEach((linha, i) => {
    for (const match of linha.matchAll(/`([^`\n]+)`/g)) {
      const token = match[1]
      if (!pareceCaminho(token) || ehPadrao(token) || foraDoRepo(token)) continue
      achados.push({ doc, linha: i + 1, token })
    }
  })

  return achados
}

describe('referência de path em doc normativo', () => {
  it.each(DOCS)('%s existe', (doc) => {
    // Sem isto, apagar um doc da lista deixaria a guarda passando com zero
    // referências conferidas — silêncio verde é o pior resultado possível.
    expect(existsSync(join(RAIZ, doc))).toBe(true)
  })

  it('todo path citado aponta para algo que existe', () => {
    const quebrados = DOCS.flatMap(referencias)
      .filter((ref) => !(`${ref.doc}::${ref.token}` in CITACOES_DELIBERADAS))
      .filter((ref) => !resolvePath(ref.token))
      .map((ref) => `${ref.doc}:${ref.linha}  ${ref.token}`)

    expect(quebrados).toEqual([])
  })

  it('confere um volume de referências compatível com o medido', () => {
    // Guarda da guarda: se o extrator parar de casar (uma mudança de formato
    // de doc, uma regex quebrada), o teste acima passaria com zero achados e
    // ninguém saberia. Medido em 2026-08-10: 87 conferíveis.
    const total = DOCS.flatMap(referencias).length

    expect(total).toBeGreaterThan(60)
  })

  it('toda rule de `.claude/rules/` está na lista conferida', () => {
    // Q-1 do review de 2026-08-11. A D4 da spec declara o escopo com GLOB
    // (`.claude/rules/*.md`) e `DOCS` é lista literal: rule nova entrava sem
    // ser conferida, em silêncio. Provado por sonda — uma rule citando um path
    // inexistente passava com 13 verdes. É a pasta onde a lição 13 reincidiu
    // duas vezes no mesmo arquivo, então é o pior lugar possível para a
    // cobertura encolher sozinha.
    //
    // Só `.claude/rules/` é glob. `docs/` não pode ser varrida assim: a D4
    // exclui `docs/superpowers/pendencias/abertas.md` e `docs/superpowers/**` de propósito, e um
    // glob os traria de volta.
    const rules = readdirSync(join(RAIZ, '.claude', 'rules'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => `.claude/rules/${f}`)

    expect(rules.filter((r) => !DOCS.includes(r))).toEqual([])
    expect(rules.length).toBeGreaterThan(0)
  })

  it('toda citação deliberada ainda está no doc que a declara', () => {
    // Exceção que sobrevive ao texto que a justificava vira permissão órfã.
    for (const chave of Object.keys(CITACOES_DELIBERADAS)) {
      const [doc, token] = chave.split('::')
      expect(readFileSync(join(RAIZ, doc), 'utf8')).toContain(`\`${token}\``)
    }
  })
})

