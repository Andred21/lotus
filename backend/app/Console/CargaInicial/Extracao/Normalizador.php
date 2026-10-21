<?php

namespace App\Console\CargaInicial\Extracao;

use App\Shared\Support\Rut;
use DateTimeImmutable;

/**
 * Aplica o recorte e as exclusões da spec §2 sobre as linhas da `REGISTROS` e
 * monta a carga no formato de `ArquivoDeCarga` (§5.1).
 *
 * Três destinos para uma linha: fica fora sem registro (fora do prefixo),
 * vira recusa com motivo (exclusão explícita, RUT que não se confia) ou entra.
 * O que não é decisão do João e impede de gravar vira erro: o comando não
 * grava nada com erro, e a Lotus corrige a origem ou o complemento.
 *
 * Um RUT recusado sai INTEIRO, com todas as linhas dele: nenhuma pessoa entra
 * com nome escolhido por heurística.
 */
final class Normalizador
{
    private const MOTIVO_DV = 'RUT com DV inválido';

    private const MOTIVO_NOMES = 'RUT com nomes diferentes';

    private const ISO = 'Y-m-d';

    /**
     * @param  list<array<string, mixed>>  $linhas  a saída do `LeitorDeRegistros`
     * @param  array<string, mixed>  $complemento  o `complemento.json`
     */
    public function normalizar(array $linhas, array $complemento): Normalizacao
    {
        $prefixo = (string) $complemento['recorte_prefixo'];
        $recorte = array_values(array_filter(
            $linhas,
            fn (array $l) => str_starts_with((string) $l['codigo'], $prefixo),
        ));

        [$mantidas, $recusas] = $this->recortar($recorte, $complemento);

        $erros = $this->erros($mantidas, $complemento);

        return new Normalizacao(
            $erros === [] ? $this->carga($mantidas, $complemento) : [],
            $recusas,
            $erros,
            count($recorte),
        );
    }

    /** O arquivo do documento do redator dentro da pasta de dados. */
    public static function arquivoDoDocumento(string $chave, string $type): string
    {
        return "documentos/{$chave}-{$type}.pdf";
    }

    // --------------------------------------------------------------- recorte

    /**
     * R2 (exclusão explícita), R3 (DV) e R4 (nomes). A ordem das recusas é a
     * das linhas; cada código aparece uma vez, com o primeiro motivo que o pega.
     *
     * @param  list<array<string, mixed>>  $recorte
     * @param  array<string, mixed>  $complemento
     * @return array{0: list<array<string, mixed>>, 1: list<array{codigo: string, motivo: string}>}
     */
    private function recortar(array $recorte, array $complemento): array
    {
        $excluidos = [];
        foreach ($complemento['excluir'] ?? [] as $exclusao) {
            $excluidos[(string) $exclusao['codigo']] = (string) $exclusao['motivo'];
        }

        $nomesPorRut = [];
        foreach ($recorte as $linha) {
            if (! isset($excluidos[(string) $linha['codigo']])) {
                $nomesPorRut[$this->chaveDoRut($linha['aluno_rut'])][$this->colapsar($linha['aluno_nome'])] = true;
            }
        }

        $mantidas = [];
        $recusas = [];

        foreach ($recorte as $linha) {
            $codigo = (string) $linha['codigo'];
            $rut = $this->chaveDoRut($linha['aluno_rut']);

            $motivo = $excluidos[$codigo] ?? match (true) {
                ! Rut::parse((string) $linha['aluno_rut'])->isValid() => self::MOTIVO_DV,
                count($nomesPorRut[$rut]) > 1 => self::MOTIVO_NOMES,
                default => null,
            };

            if ($motivo === null) {
                $mantidas[] = $linha;
            } else {
                $recusas[] = ['codigo' => $codigo, 'motivo' => $motivo];
            }
        }

        return [$mantidas, $recusas];
    }

    // ----------------------------------------------------------------- erros

    /**
     * R5: as guardas. Todas rodam, para a Lotus corrigir tudo de uma vez, e
     * cada uma lista os códigos envolvidos.
     *
     * @param  list<array<string, mixed>>  $mantidas
     * @param  array<string, mixed>  $complemento
     * @return list<string>
     */
    private function erros(array $mantidas, array $complemento): array
    {
        if ($mantidas === []) {
            return ['nenhuma linha restou no recorte'];
        }

        $cursos = array_column($complemento['cursos'], null, 'chave');
        $instrutores = $this->instrutores($complemento);
        $cotacoes = array_column($complemento['cotacoes'], null, 'scap');
        $clienteRut = Rut::parse((string) $complemento['cliente']['rut'])->format();

        $erros = [];
        $acusar = function (string $mensagem, array $codigos) use (&$erros): void {
            if ($codigos !== []) {
                $erros[] = $mensagem.': '.implode(', ', array_values(array_unique($codigos)));
            }
        };

        $achados = [];
        $porScap = [];

        foreach ($mantidas as $linha) {
            $codigo = (string) $linha['codigo'];
            $chave = $this->chaveDoCurso($linha['curso_seletor']);
            $curso = $chave === null ? null : ($cursos[$chave] ?? null);

            $problemas = [
                'seletor de curso sem chave em cursos' => $curso === null,
                'instrutor ausente de instrutores' => ! isset($instrutores[$this->colapsar($linha['instrutor'])]),
                'RUT de cliente diferente do cliente do complemento' => Rut::parse((string) $linha['cliente_rut'])->format() !== $clienteRut,
                'horas diferente do curso' => $curso !== null && $linha['horas'] !== (int) $curso['workload_hours'],
                'modalidad diferente de Presencial' => mb_strtolower($this->colapsar($linha['modalidad'])) !== 'presencial',
                // Toda linha traz certificado, e certificado só vai para matrícula aprobada (ArquivoDeCarga::erroDeTurma).
                'estado_eval fora de Aprobado' => mb_strtolower($this->colapsar($linha['estado_eval'])) !== 'aprobado',
                'evaluacion inválida' => is_string($linha['evaluacion']),
            ];

            foreach (['fecha_curso', 'vigencia', 'f_emision'] as $campo) {
                $problemas["data fora do formato ISO ({$campo})"] = ! $this->dataIso($linha[$campo]);
            }

            foreach (['aluno_nome', 'cliente_nome', 'realizado_en', 'nom_curso'] as $campo) {
                $problemas["campo obrigatório vazio ({$campo})"] = $this->colapsar($linha[$campo]) === '';
            }

            foreach ($problemas as $mensagem => $ocorre) {
                if ($ocorre) {
                    $achados[$mensagem][] = $codigo;
                }
            }

            if (preg_match('/^SCAP-(\d+)$/i', $this->colapsar($linha['servicio']), $scap) !== 1) {
                $achados['SERVICIO fora do padrão SCAP-<número>'][] = $codigo;

                continue;
            }

            $numero = (int) $scap[1];
            $porScap[$numero][] = $linha + ['_chave' => $chave];

            if (! isset($cotacoes[$numero])) {
                $achados["SCAP {$numero} sem item em cotacoes"][] = $codigo;
            }
        }

        foreach ($achados as $mensagem => $codigos) {
            $acusar($mensagem, $codigos);
        }

        $codigos = array_count_values(array_map(fn (array $l) => (string) $l['codigo'], $mantidas));
        $acusar('código repetido', array_keys(array_filter($codigos, fn (int $n) => $n > 1)));

        foreach ($porScap as $numero => $doScap) {
            $rotulos = [
                'curso' => '_chave',
                'fecha_curso' => 'fecha_curso',
                'realizado_en' => 'realizado_en',
                'instrutor' => 'instrutor',
            ];

            foreach ($rotulos as $rotulo => $campo) {
                $valores = array_unique(array_map(fn (array $l) => $this->colapsar($l[$campo]), $doScap));

                if (count($valores) > 1) {
                    $acusar("SCAP {$numero}: {$rotulo} diferente entre as linhas", array_map(fn (array $l) => (string) $l['codigo'], $doScap));
                }
            }

            $porRut = [];
            foreach ($doScap as $l) {
                $porRut[$this->chaveDoRut($l['aluno_rut'])][] = (string) $l['codigo'];
            }
            foreach ($porRut as $doRut) {
                $acusar("SCAP {$numero}: RUT repetido na SCAP", count($doRut) > 1 ? $doRut : []);
            }

            if (isset($cotacoes[$numero]) && ($cotacoes[$numero]['sem_turma'] ?? null) !== null) {
                $acusar("SCAP {$numero}: tem sem_turma no complemento e linhas na planilha", array_map(fn (array $l) => (string) $l['codigo'], $doScap));
            }
        }

        foreach ($complemento['cotacoes'] as $cotacao) {
            $numero = (int) $cotacao['scap'];
            $semTurma = $cotacao['sem_turma'] ?? null;

            if (! is_numeric($cotacao['value_uf'] ?? null) || $cotacao['value_uf'] < 0) {
                $erros[] = "SCAP {$numero}: value_uf do complemento não é um número";
            }

            if ($semTurma === null && ! isset($porScap[$numero])) {
                $erros[] = "SCAP {$numero}: cotação sem linhas mantidas e sem sem_turma no complemento";
            }

            if ($semTurma !== null) {
                if (! isset($cursos[$semTurma['curso'] ?? null])) {
                    $erros[] = "SCAP {$numero}: sem_turma.curso sem chave em cursos";
                }

                if (! is_int($semTurma['student_count'] ?? null) || $semTurma['student_count'] < 1) {
                    $erros[] = "SCAP {$numero}: sem_turma.student_count deve ser um inteiro maior que zero";
                }

                if (! $this->dataIso($cotacao['data'] ?? null)) {
                    $erros[] = "SCAP {$numero}: data do complemento fora do formato ISO";
                }
            }
        }

        foreach ($complemento['cursos'] as $curso) {
            $dias = $curso['dias_de_turma'] ?? 1;

            if (! is_int($dias) || $dias < 1) {
                $erros[] = "curso {$curso['chave']}: dias_de_turma deve ser um inteiro maior que zero";
            }
        }

        return $erros;
    }

    // ----------------------------------------------------------------- carga

    /**
     * Só roda sem erro: as guardas já garantiram curso, instrutor, SCAP e datas.
     *
     * @param  list<array<string, mixed>>  $mantidas
     * @param  array<string, mixed>  $complemento
     * @return array<string, mixed>
     */
    private function carga(array $mantidas, array $complemento): array
    {
        $dominio = (string) $complemento['dominio_email_sintetico'];
        $cursos = array_column($complemento['cursos'], null, 'chave');
        $instrutores = $this->instrutores($complemento);
        $cotacoes = array_column($complemento['cotacoes'], null, 'scap');

        $primeira = min(array_map(fn (array $l) => $l['fecha_curso'], $mantidas));

        $porScap = [];
        foreach ($mantidas as $linha) {
            preg_match('/^SCAP-(\d+)$/i', $this->colapsar($linha['servicio']), $scap);
            $porScap[(int) $scap[1]][] = $linha;
        }

        $orcamentos = [];
        foreach ($cotacoes as $numero => $item) {
            $orcamentos[$numero] = isset($porScap[$numero])
                ? $this->orcamentoComTurma($numero, $porScap[$numero], $item, $cursos, $instrutores)
                : $this->orcamentoSemTurma($numero, $item);
        }
        ksort($orcamentos);

        return [
            'schema_version' => 1,
            'cliente' => $this->cliente($complemento, $dominio, $primeira),
            'cursos' => array_map($this->curso(...), $complemento['cursos']),
            'redatores' => array_map($this->redator(...), $complemento['redatores']),
            'alunos' => $this->alunos($mantidas, $dominio),
            'orcamentos' => array_values($orcamentos),
        ];
    }

    /**
     * @param  array<string, mixed>  $complemento
     * @return array<string, mixed>
     */
    private function cliente(array $complemento, string $dominio, string $desde): array
    {
        $cliente = $complemento['cliente'];
        $endereco = $cliente['endereco'] ?? [];
        $contato = $cliente['contato'] ?? [];

        return [
            'rut' => Rut::parse((string) $cliente['rut'])->format(),
            'name' => $cliente['name'],
            'legal_name' => $cliente['legal_name'],
            'business_activity' => $cliente['business_activity'] ?? null,
            'email' => $this->email((string) $cliente['rut'], $dominio),
            'desde' => $desde,
            'endereco' => [
                'line1' => $endereco['line1'] ?? null,
                'line2' => $endereco['line2'] ?? null,
                'number' => $endereco['number'] ?? null,
                'commune' => $endereco['commune'] ?? null,
                'city' => $endereco['city'] ?? null,
                'region' => $endereco['region'] ?? null,
                'zip_code' => $endereco['zip_code'] ?? null,
            ],
            'contato' => [
                'name' => $contato['name'] ?? null,
                'email' => $contato['email'] ?? null,
                'phone' => $contato['phone'] ?? null,
                'job_title' => $contato['job_title'] ?? null,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $curso
     * @return array<string, mixed>
     */
    private function curso(array $curso): array
    {
        return [
            'chave' => $curso['chave'],
            'name' => $curso['name'],
            'technical_name' => $curso['technical_name'] ?? null,
            'description' => $curso['description'] ?? null,
            'workload_hours' => $curso['workload_hours'],
            'modulos' => array_map(fn (array $m) => [
                'name' => $m['name'],
                'learnings' => $m['learnings'] ?? null,
                'contents' => $m['contents'] ?? null,
                'theory_hours' => $m['theory_hours'] ?? 0,
                'practice_hours' => $m['practice_hours'] ?? 0,
            ], $curso['modulos'] ?? []),
        ];
    }

    /**
     * R12.
     *
     * @param  array<string, mixed>  $redator
     * @return array<string, mixed>
     */
    private function redator(array $redator): array
    {
        return [
            'chave' => $redator['chave'],
            'name' => $redator['name'],
            'rut' => Rut::parse((string) $redator['rut'])->format(),
            'email' => $redator['email'],
            'phone' => $redator['phone'] ?? null,
            'cursos' => $redator['cursos'] ?? [],
            'documentos' => array_map(fn (array $d) => [
                'type' => $d['type'],
                'arquivo' => self::arquivoDoDocumento($redator['chave'], $d['type']),
                'original_name' => $this->nomeOriginal($d),
                'valid_until' => $d['valid_until'] ?? null,
            ], $redator['documentos'] ?? []),
        ];
    }

    /**
     * O nome-base da origem (para `x.zip#membro`, o do membro). Documento
     * recortado por páginas leva o recorte no nome: `<base> (p. i-f).pdf`.
     *
     * @param  array<string, mixed>  $documento
     */
    private function nomeOriginal(array $documento): string
    {
        $origem = (string) $documento['origem'];
        $membro = str_contains($origem, '#') ? explode('#', $origem, 2)[1] : $origem;
        $base = basename($membro);

        $paginas = $documento['paginas'] ?? null;

        if (! is_array($paginas)) {
            return $base;
        }

        return sprintf('%s (p. %d-%d).pdf', preg_replace('/\.pdf$/i', '', $base), $paginas[0], $paginas[1]);
    }

    /**
     * R7: um aluno por RUT. O nome é o da linha mais recente (empate: a última
     * lida), com os espaços colapsados; `desde` é a primeira `fecha_curso`.
     *
     * @param  list<array<string, mixed>>  $mantidas
     * @return list<array<string, string>>
     */
    private function alunos(array $mantidas, string $dominio): array
    {
        $alunos = [];

        foreach ($mantidas as $linha) {
            $rut = Rut::parse((string) $linha['aluno_rut'])->format();
            $aluno = $alunos[$rut] ?? ['rut' => $rut, 'name' => '', 'email' => $this->email($rut, $dominio), 'desde' => $linha['fecha_curso'], 'recente' => ''];

            if ($linha['fecha_curso'] >= $aluno['recente']) {
                $aluno['recente'] = $linha['fecha_curso'];
                $aluno['name'] = $this->colapsar($linha['aluno_nome']);
            }

            $aluno['desde'] = min($aluno['desde'], $linha['fecha_curso']);
            $alunos[$rut] = $aluno;
        }

        return array_values(array_map(fn (array $a) => [
            'rut' => $a['rut'],
            'name' => $a['name'],
            'email' => $a['email'],
            'desde' => $a['desde'],
        ], $alunos));
    }

    /**
     * R6, R8, R9, R10.
     *
     * @param  list<array<string, mixed>>  $linhas
     * @param  array<string, mixed>  $item
     * @param  array<string, array<string, mixed>>  $cursos
     * @param  array<string, string>  $instrutores
     * @return array<string, mixed>
     */
    private function orcamentoComTurma(int $scap, array $linhas, array $item, array $cursos, array $instrutores): array
    {
        $primeira = $linhas[0];
        $chave = (string) $this->chaveDoCurso($primeira['curso_seletor']);
        $inicio = $primeira['fecha_curso'];
        $dias = (int) ($cursos[$chave]['dias_de_turma'] ?? 1);

        $fim = (new DateTimeImmutable($inicio))->modify(sprintf('+%d days', $dias - 1))->format(self::ISO);

        $matriculas = array_map(fn (array $l) => [
            'aluno' => Rut::parse((string) $l['aluno_rut'])->format(),
            'nota' => $l['evaluacion'],
            'approval_status' => mb_strtolower($this->colapsar($l['estado_eval'])),
            'certificado' => [
                'codigo' => $l['codigo'],
                'emitido_em' => $l['f_emision'],
                'valido_ate' => $l['vigencia'],
                'aluno_impresso' => $l['aluno_nome'],
                'curso_impresso' => $l['nom_curso'],
                'horas_impressas' => $l['horas'],
                'cliente_impresso' => $l['cliente_nome'],
                'cliente_rut_impresso' => Rut::parse((string) $l['cliente_rut'])->format(),
                'redator_impresso' => $l['instrutor'],
                'cidade' => $l['realizado_en'],
            ],
        ], $linhas);

        return [
            'scap' => $scap,
            'data' => $inicio,
            'cotacao' => [
                'curso' => $chave,
                'student_count' => count($matriculas),
                'value_uf' => $this->uf($item['value_uf']),
                'status' => 'approved',
                'approved_on' => $inicio,
            ],
            'turma' => [
                'curso' => $chave,
                'local_aplicacao' => $primeira['realizado_en'],
                'start_date' => $inicio,
                'end_date' => $fim,
                'redator' => $instrutores[$this->colapsar($primeira['instrutor'])],
                'matriculas' => $matriculas,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function orcamentoSemTurma(int $scap, array $item): array
    {
        return [
            'scap' => $scap,
            'data' => $item['data'],
            'cotacao' => [
                'curso' => $item['sem_turma']['curso'],
                'student_count' => $item['sem_turma']['student_count'],
                'value_uf' => $this->uf($item['value_uf']),
                'status' => 'pending',
                'approved_on' => null,
            ],
            'turma' => null,
        ];
    }

    // --------------------------------------------------------------- apoio

    /** `<número><dv minúsculo>@<domínio>`, igual para qualquer grafia do mesmo RUT. */
    private function email(string $rut, string $dominio): string
    {
        $r = Rut::parse($rut);

        return strtolower($r->number.$r->dv).'@'.$dominio;
    }

    private function uf(mixed $valor): string
    {
        return number_format((float) $valor, 4, '.', '');
    }

    /** A chave com que o RUT casa consigo mesmo, qualquer que seja a grafia (pontos, hífen, `k`). */
    private function chaveDoRut(mixed $rut): string
    {
        $r = Rut::parse((string) $rut);

        return $r->number.$r->dv;
    }

    /** `NNN#` no início do seletor (`Nombre del curso`). */
    private function chaveDoCurso(mixed $seletor): ?string
    {
        return preg_match('/^\s*(\d+#)/', (string) $seletor, $p) === 1 ? $p[1] : null;
    }

    /**
     * Grafia impressa do instrutor (espaços colapsados) => chave do redator.
     *
     * @param  array<string, mixed>  $complemento
     * @return array<string, string>
     */
    private function instrutores(array $complemento): array
    {
        $mapa = [];
        foreach ($complemento['instrutores'] ?? [] as $impresso => $chave) {
            $mapa[$this->colapsar($impresso)] = (string) $chave;
        }

        return $mapa;
    }

    private function dataIso(mixed $valor): bool
    {
        if (! is_string($valor)) {
            return false;
        }

        $data = DateTimeImmutable::createFromFormat('!'.self::ISO, $valor);

        return $data !== false && $data->format(self::ISO) === $valor;
    }

    /** Espaço duplo e nas pontas (inclusive o não separável) não faz um nome diferente do outro. */
    private function colapsar(mixed $texto): string
    {
        $limpo = (string) preg_replace('/[\s\x{00A0}]+/u', ' ', (string) $texto);

        return trim($limpo);
    }
}
