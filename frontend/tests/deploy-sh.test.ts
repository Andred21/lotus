import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/deploy.sh` é a única sequência de deploy do projeto: o botão do
 * item 12 não a reescreve, ele a INVOCA por SSM. Até 2026-09-21 o script não
 * tinha catraca nenhuma, embora a lição 19 já listasse `deploy/bin/*.sh` entre
 * os pares guardados — glob na lição não é asserção no arquivo.
 *
 * Conferência textual pelo mesmo motivo do backup-db.test.ts: o comportamento se
 * prova rodando contra a produção (tasks 9 a 12 do plano); a catraca guarda a
 * regressão silenciosa.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'deploy.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')
const linhas = semComentarios.split(/\r?\n/)
const indiceDe = (agulha: string) => linhas.findIndex((linha) => linha.includes(agulha))

describe('deploy/bin/deploy.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('falha alto em erro, variável indefinida e pipe quebrado', () => {
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('pega o cadeado sem bloquear e antes de qualquer escrita', () => {
    expect(semComentarios).toMatch(/flock -n 9/)
    const cadeado = indiceDe('flock -n 9')
    expect(cadeado).toBeGreaterThan(-1)
    expect(cadeado).toBeLessThan(indiceDe('docker login'))
  })

  it('abre o cadeado em APPEND — truncar apagaria o PID do detentor', () => {
    expect(semComentarios).toMatch(/exec 9>>/)
    expect(semComentarios).not.toMatch(/exec 9>[^>]/)
  })

  it('grava CURRENT_SHA por mv atômico, nunca por redirecionamento', () => {
    expect(semComentarios).toMatch(/mv -f .* "\$BASE\/CURRENT_SHA"/)
    expect(semComentarios).not.toMatch(/> "\$BASE\/CURRENT_SHA"/)
  })

  it('mantém a conferência de digest puxado contra digest em execução', () => {
    expect(semComentarios).toContain('ID_PUXADO')
    expect(semComentarios).toContain('ID_RODANDO')
    expect(indiceDe('ID_RODANDO')).toBeLessThan(indiceDe('mv -f'))
  })

  it('exige os três manifestos antes de puxar', () => {
    expect(semComentarios.match(/docker manifest inspect/g)).toHaveLength(3)
    expect(indiceDe('docker manifest inspect')).toBeLessThan(indiceDe('compose pull'))
  })

  it('mede o schema APLICADO no banco, não um diff de arquivos', () => {
    expect(semComentarios).toContain('SELECT migration FROM migrations')
  })

  it('mede o schema CONHECIDO pela imagem alvo, não pela árvore de trabalho', () => {
    expect(semComentarios).toMatch(/docker run --rm --entrypoint sh "\$APP"/)
    expect(semComentarios).toContain('/var/www/database/migrations')
  })

  it('o gate roda depois do pull e antes do migrate', () => {
    const gate = indiceDe('A_FRENTE=')
    expect(gate).toBeGreaterThan(indiceDe('compose pull'))
    expect(gate).toBeLessThan(indiceDe('artisan migrate'))
  })

  it('recusa alvo cujo schema o banco já ultrapassou', () => {
    expect(semComentarios).toMatch(/exit 4/)
    expect(semComentarios).toContain('LOTUS_ACEITAR_SCHEMA_A_FRENTE')
  })

  it('a recusa imprime, do ledger, o dump que precede cada migration à frente', () => {
    // Spec §6. Até 2026-09-25 a recusa só dizia "procure em releases.jsonl" — o
    // plano trocou a chave por uma dica sem declarar o desvio, e catar JSON à mão
    // no meio de um rollback é o jeito de restaurar o dump errado.
    expect(semComentarios).toMatch(/^dump_que_introduziu\(\) \{$/m)
    const recusa = indiceDe('o banco esta A FRENTE')
    const busca = indiceDe('dump_que_introduziu "$')
    expect(busca).toBeGreaterThan(recusa)
    expect(busca).toBeLessThan(indiceDe('|| exit 4'))
    expect(semComentarios).not.toContain('procure em')
  })

  it('a busca do dump casa o nome inteiro, só em linha `inicio`, e fica com a última', () => {
    // Aspas em volta do nome: "x" não casa "x_y". Última, porque release refeita
    // registra a migration de novo, e o dump mais recente é o que perde menos.
    const corpo = semComentarios.match(/^dump_que_introduziu\(\) \{\n([\s\S]*?)^\}$/m)?.[1] ?? ''
    expect(corpo).toContain(`grep -F '"evento":"inicio"' "$LEDGER"`)
    expect(corpo).toContain('grep -F "\\"$1\\""')
    expect(corpo).toContain('tail -n 1')
  })

  it('a busca do dump tolera ausência — senão `set -e` mata antes da recusa', () => {
    const corpo = semComentarios.match(/^dump_que_introduziu\(\) \{\n([\s\S]*?)^\}$/m)?.[1] ?? ''
    expect(corpo).toMatch(/\|\|\s*true\s*$/m)
  })

  it('abre o ledger antes do migrate e o fecha no fim', () => {
    expect(semComentarios).toContain('"evento":"inicio"')
    expect(semComentarios).toContain('"evento":"fim"')
    expect(indiceDe('"evento":"inicio"')).toBeLessThan(indiceDe('artisan migrate'))
  })

  it('escreve o ledger em append, nunca sobrescrevendo', () => {
    expect(semComentarios).toMatch(/>> "\$LEDGER"/)
    expect(semComentarios).not.toMatch(/[^>]> "\$LEDGER"/)
  })

  it('tira o dump antes do migrate e aborta o deploy se ele falhar', () => {
    const dump = indiceDe('LOTUS_BACKUP_SAIDA')
    expect(dump).toBeGreaterThan(-1)
    expect(dump).toBeLessThan(indiceDe('artisan migrate'))
  })

  it('só tira dump quando há migration pendente', () => {
    expect(semComentarios).toMatch(/if \[ -n "\$PENDENTES" \]/)
  })

  it('registra o SHA anterior explicitamente, em vez de deixar deduzir', () => {
    expect(semComentarios).toContain('sha_anterior')
  })

  it('identifica quem promoveu, com default para o caminho manual', () => {
    expect(semComentarios).toMatch(/LOTUS_DEPLOY_ATOR:-manual:/)
  })

  it('recusa nome de migration fora de [A-Za-z0-9_] em vez de emitir JSON quebrado', () => {
    expect(semComentarios).toMatch(/\^\[A-Za-z0-9_\]\+\$/)
  })

  it('fecha o ledger também no caminho de falha, por trap', () => {
    expect(semComentarios).toMatch(/^trap .* EXIT$/m)
    expect(semComentarios).toContain('"resultado":"falha"')
  })
})
