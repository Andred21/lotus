<?php

namespace App\Console\CargaInicial\Extracao;

/**
 * O `relatorio.md` que o João confere antes da carga: contagens por entidade,
 * cada linha recusada com o motivo, e o que a carga monta por SCAP, curso e
 * redator.
 *
 * Não traz nome nem RUT de aluno (spec §4): o relatório circula fora da pasta
 * de dados, e dado pessoal de aluno não tem por que sair dela. O redator
 * aparece porque o complemento é curado e o João precisa conferi-lo.
 */
final class Relatorio
{
    /**
     * Rótulo => total, na ordem em que aparecem no relatório e no console.
     *
     * @return array<string, int>
     */
    public static function contagens(Normalizacao $n): array
    {
        $carga = $n->carga;
        $orcamentos = $carga['orcamentos'] ?? [];
        $turmas = array_filter(array_column($orcamentos, 'turma'));
        $status = array_count_values(array_column(array_column($orcamentos, 'cotacao'), 'status'));

        return [
            'linhas no recorte' => $n->linhasNoRecorte,
            'linhas recusadas' => count($n->recusas),
            'certificados' => array_sum(array_map(fn (array $t) => count($t['matriculas']), $turmas)),
            'turmas' => count($turmas),
            'alunos' => count($carga['alunos'] ?? []),
            'orçamentos' => count($orcamentos),
            'cotações aprovadas' => $status['approved'] ?? 0,
            'cotações pendentes' => $status['pending'] ?? 0,
            'cursos' => count($carga['cursos'] ?? []),
            'módulos' => array_sum(array_map(fn (array $c) => count($c['modulos']), $carga['cursos'] ?? [])),
            'redatores' => count($carga['redatores'] ?? []),
            'documentos' => array_sum(array_map(fn (array $r) => count($r['documentos']), $carga['redatores'] ?? [])),
        ];
    }

    public static function markdown(Normalizacao $n): string
    {
        $carga = $n->carga;

        $secoes = [
            "# Relatório da carga inicial\n",
            self::secao('Contagens', ['item', 'total'], array_map(
                fn (string $rotulo, int $total) => [$rotulo, (string) $total],
                array_keys(self::contagens($n)),
                self::contagens($n),
            )),
            self::secao('Recusas', ['código', 'motivo'], array_map(
                fn (array $r) => [$r['codigo'], $r['motivo']],
                $n->recusas,
            )),
            self::secao('Por SCAP', ['SCAP', 'curso', 'local', 'início', 'fim', 'alunos', 'UF', 'status'], array_map(
                fn (array $o) => [
                    (string) $o['scap'],
                    $o['cotacao']['curso'],
                    $o['turma']['local_aplicacao'] ?? '—',
                    $o['turma']['start_date'] ?? '—',
                    $o['turma']['end_date'] ?? '—',
                    (string) ($o['turma'] === null ? $o['cotacao']['student_count'] : count($o['turma']['matriculas'])),
                    $o['cotacao']['value_uf'],
                    $o['cotacao']['status'],
                ],
                $carga['orcamentos'] ?? [],
            )),
            self::secao('Cursos', ['chave', 'nome', 'horas', 'módulos'], array_map(
                fn (array $c) => [$c['chave'], $c['name'], (string) $c['workload_hours'], (string) count($c['modulos'])],
                $carga['cursos'] ?? [],
            )),
            self::secao('Redatores', ['chave', 'nome', 'e-mail', 'cursos', 'documentos'], array_map(
                fn (array $r) => [
                    $r['chave'],
                    $r['name'],
                    $r['email'],
                    implode(', ', $r['cursos']),
                    implode(', ', array_map(fn (array $d) => $d['type'], $r['documentos'])),
                ],
                $carga['redatores'] ?? [],
            )),
        ];

        return implode("\n", $secoes);
    }

    /**
     * @param  list<string>  $colunas
     * @param  list<list<string>>  $linhas
     */
    private static function secao(string $titulo, array $colunas, array $linhas): string
    {
        $tabela = [
            '| '.implode(' | ', $colunas).' |',
            '|'.str_repeat(' --- |', count($colunas)),
            ...array_map(fn (array $l) => '| '.implode(' | ', array_map(self::celula(...), $l)).' |', $linhas),
        ];

        return "## {$titulo}\n\n".($linhas === [] && $titulo !== 'Contagens' ? "_nenhum_\n" : implode("\n", $tabela)."\n");
    }

    /** Uma barra ou uma quebra de linha no valor quebraria a tabela. */
    private static function celula(string $valor): string
    {
        return str_replace(['|', "\r", "\n"], ['\\|', ' ', ' '], $valor);
    }
}
