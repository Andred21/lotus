<?php

namespace App\Console\CargaInicial;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Shared\Support\Rut;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use JsonException;

/**
 * O contrato do `carga.json` (`schema_version` 1): o que o extrator da
 * planilha produz e o que a carga consome. Conferir tudo aqui, antes de gravar
 * qualquer linha, é o que deixa a carga atômica em produção falhar por um
 * motivo conhecido e não no meio da gravação.
 *
 * Duas fases. A primeira confere a FORMA (campos, tipos, datas, enums); se ela
 * acusa algo, a segunda não roda, porque conferir referência sobre um arquivo
 * torto devolveria erro em cascata. A segunda confere o que só se enxerga
 * cruzando o arquivo: unicidade, RUT, referências entre as listas, regras
 * entre campos e a existência dos PDFs na pasta.
 */
final class ArquivoDeCarga
{
    public const SCHEMA_VERSION = 1;

    public const ARQUIVO = 'carga.json';

    private const DATA = 'Y-m-d';

    /**
     * Lê `$pasta/carga.json` e o devolve conferido.
     *
     * @return array<string, mixed>
     *
     * @throws CargaInvalidaException
     */
    public static function ler(string $pasta): array
    {
        $caminho = $pasta.'/'.self::ARQUIVO;

        if (! is_file($caminho)) {
            throw self::falha(sprintf('%s não existe em %s', self::ARQUIVO, $pasta));
        }

        try {
            $carga = json_decode((string) file_get_contents($caminho), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw self::falha(sprintf('%s não é JSON válido: %s', self::ARQUIVO, $e->getMessage()));
        }

        if (! is_array($carga)) {
            throw self::falha(sprintf('%s deve conter um objeto JSON', self::ARQUIVO));
        }

        $erros = self::validar($carga, $pasta);

        if ($erros !== []) {
            throw new CargaInvalidaException($erros);
        }

        return $carga;
    }

    /** A mensagem nasce fora da chamada: a catraca `MensagemLiteralTest` não admite texto literal em `new ...Exception(`. */
    private static function falha(string $mensagem): CargaInvalidaException
    {
        return new CargaInvalidaException([$mensagem]);
    }

    /**
     * Com `$pasta`, confere também que cada `documentos.*.arquivo` existe sob ela.
     *
     * @param  array<string, mixed>  $carga
     * @return list<string>
     */
    public static function validar(array $carga, ?string $pasta = null): array
    {
        if (($carga['schema_version'] ?? null) !== self::SCHEMA_VERSION) {
            return [sprintf(
                'schema_version deve ser %d, veio %s',
                self::SCHEMA_VERSION,
                json_encode($carga['schema_version'] ?? null),
            )];
        }

        $erros = self::erroDeForma($carga);

        if ($erros !== []) {
            return $erros;
        }

        return [
            ...self::erroDeRut($carga),
            ...self::erroDeUnicidade($carga),
            ...self::erroDeReferencia($carga),
            ...self::erroDeCotacao($carga),
            ...self::erroDeTurma($carga),
            ...($pasta === null ? [] : self::erroDeDocumento($carga, $pasta)),
        ];
    }

    // ---------------------------------------------------------------- forma

    /**
     * @param  array<string, mixed>  $carga
     * @return list<string>
     */
    private static function erroDeForma(array $carga): array
    {
        $texto = ['required', 'string'];
        $textoOuNulo = ['present', 'nullable', 'string'];
        $data = ['required', 'date_format:'.self::DATA];
        $dataOuNula = ['present', 'nullable', 'date_format:'.self::DATA];
        $lista = ['present', 'array'];
        $inteiro = ['required', 'integer', 'min:0'];

        $regras = [
            'cliente' => ['required', 'array'],
            'cliente.rut' => $texto,
            'cliente.name' => $texto,
            'cliente.legal_name' => $texto,
            'cliente.business_activity' => $textoOuNulo,
            'cliente.email' => ['required', 'email'],
            'cliente.desde' => $data,
            'cliente.endereco' => ['required', 'array'],
            'cliente.endereco.line1' => $texto,
            'cliente.endereco.line2' => $textoOuNulo,
            'cliente.endereco.number' => $textoOuNulo,
            'cliente.endereco.commune' => $textoOuNulo,
            'cliente.endereco.city' => $textoOuNulo,
            'cliente.endereco.region' => $textoOuNulo,
            'cliente.endereco.zip_code' => $textoOuNulo,
            'cliente.contato' => ['required', 'array'],
            'cliente.contato.name' => $texto,
            'cliente.contato.email' => $textoOuNulo,
            'cliente.contato.phone' => $textoOuNulo,
            'cliente.contato.job_title' => $textoOuNulo,

            'cursos' => $lista,
            'cursos.*' => ['array'],
            'cursos.*.chave' => $texto,
            'cursos.*.name' => $texto,
            'cursos.*.technical_name' => $textoOuNulo,
            'cursos.*.description' => $textoOuNulo,
            'cursos.*.workload_hours' => $inteiro,
            'cursos.*.modulos' => $lista,
            'cursos.*.modulos.*' => ['array'],
            'cursos.*.modulos.*.name' => $texto,
            'cursos.*.modulos.*.learnings' => $textoOuNulo,
            'cursos.*.modulos.*.contents' => $textoOuNulo,
            'cursos.*.modulos.*.theory_hours' => ['required', 'numeric', 'min:0'],
            'cursos.*.modulos.*.practice_hours' => ['required', 'numeric', 'min:0'],

            'redatores' => $lista,
            'redatores.*' => ['array'],
            'redatores.*.chave' => $texto,
            'redatores.*.name' => $texto,
            'redatores.*.rut' => $texto,
            'redatores.*.email' => ['required', 'email'],
            'redatores.*.phone' => $textoOuNulo,
            'redatores.*.cursos' => $lista,
            'redatores.*.cursos.*' => $texto,
            'redatores.*.documentos' => $lista,
            'redatores.*.documentos.*' => ['array'],
            'redatores.*.documentos.*.type' => ['required', Rule::in(RedatorDocumentType::values())],
            'redatores.*.documentos.*.arquivo' => $texto,
            'redatores.*.documentos.*.original_name' => $texto,
            'redatores.*.documentos.*.valid_until' => $dataOuNula,

            'alunos' => $lista,
            'alunos.*' => ['array'],
            'alunos.*.rut' => $texto,
            'alunos.*.name' => $texto,
            'alunos.*.email' => ['required', 'email'],
            'alunos.*.desde' => $data,

            'orcamentos' => $lista,
            'orcamentos.*' => ['array'],
            'orcamentos.*.scap' => ['required', 'integer', 'min:1'],
            'orcamentos.*.data' => $data,
            'orcamentos.*.cotacao' => ['required', 'array'],
            'orcamentos.*.cotacao.curso' => $texto,
            'orcamentos.*.cotacao.student_count' => ['required', 'integer', 'min:1'],
            'orcamentos.*.cotacao.value_uf' => ['required', 'numeric', 'min:0'],
            'orcamentos.*.cotacao.status' => ['required', Rule::in(['approved', 'pending'])],
            'orcamentos.*.cotacao.approved_on' => $dataOuNula,
            'orcamentos.*.turma' => ['present', 'nullable', 'array'],
        ];

        foreach ((array) ($carga['orcamentos'] ?? []) as $i => $orcamento) {
            if (! is_array($orcamento) || ! is_array($orcamento['turma'] ?? null)) {
                continue;
            }

            $turma = "orcamentos.{$i}.turma";
            $regras += [
                "{$turma}.curso" => $texto,
                "{$turma}.local_aplicacao" => $texto,
                "{$turma}.start_date" => $data,
                "{$turma}.end_date" => $data,
                "{$turma}.redator" => $texto,
                "{$turma}.matriculas" => $lista,
                "{$turma}.matriculas.*" => ['array'],
                "{$turma}.matriculas.*.aluno" => $texto,
                "{$turma}.matriculas.*.nota" => ['present', 'nullable', 'numeric'],
                "{$turma}.matriculas.*.approval_status" => [
                    'required',
                    Rule::in(array_column(EnrollmentApprovalStatus::cases(), 'value')),
                ],
                "{$turma}.matriculas.*.certificado" => ['required', 'array'],
                "{$turma}.matriculas.*.certificado.codigo" => $texto,
                "{$turma}.matriculas.*.certificado.emitido_em" => $data,
                "{$turma}.matriculas.*.certificado.valido_ate" => $data,
                "{$turma}.matriculas.*.certificado.aluno_impresso" => $texto,
                "{$turma}.matriculas.*.certificado.curso_impresso" => $texto,
                "{$turma}.matriculas.*.certificado.horas_impressas" => $inteiro,
                "{$turma}.matriculas.*.certificado.cliente_impresso" => $texto,
                "{$turma}.matriculas.*.certificado.cliente_rut_impresso" => $texto,
                "{$turma}.matriculas.*.certificado.redator_impresso" => $texto,
                "{$turma}.matriculas.*.certificado.cidade" => $texto,
            ];
        }

        // A mensagem do Laravel troca `_` por espaço e sai no idioma da
        // aplicação: o caminho do campo, que é o que quem corrige o arquivo
        // procura, se perderia. Por isso o erro é montado daqui, a partir da
        // regra que falhou, com o caminho literal.
        $erros = [];
        $validador = Validator::make($carga, $regras);
        $validador->fails(); // `failed()` só devolve algo depois de a validação rodar

        foreach ($validador->failed() as $campo => $falhas) {
            foreach ($falhas as $regra => $parametros) {
                $erros[] = sprintf(
                    '%s: viola a regra %s%s',
                    $campo,
                    strtolower($regra),
                    $parametros === [] ? '' : ' ('.implode(',', array_map('strval', $parametros)).')',
                );
            }
        }

        return $erros;
    }

    // ------------------------------------------------------------------ RUT

    /**
     * @param  array<string, mixed>  $carga
     * @return list<string>
     */
    private static function erroDeRut(array $carga): array
    {
        $erros = [];

        $conferir = function (string $dono, string $rut) use (&$erros): void {
            if (! Rut::parse($rut)->isValid()) {
                $erros[] = sprintf('%s: RUT %s inválido', $dono, $rut);
            }
        };

        $conferir('cliente', $carga['cliente']['rut']);

        foreach ($carga['redatores'] as $redator) {
            $conferir(sprintf('redator %s', $redator['chave']), $redator['rut']);
        }

        foreach ($carga['alunos'] as $aluno) {
            $conferir(sprintf('aluno %s', $aluno['rut']), $aluno['rut']);
        }

        return $erros;
    }

    // ------------------------------------------------------------ unicidade

    /**
     * @param  array<string, mixed>  $carga
     * @return list<string>
     */
    private static function erroDeUnicidade(array $carga): array
    {
        $rut = fn (array $item, string $campo) => Rut::parse($item[$campo])->format();
        $email = fn (array $item) => mb_strtolower($item['email']);

        $codigos = [];
        $porTurma = [];
        foreach ($carga['orcamentos'] as $orcamento) {
            $matriculas = $orcamento['turma']['matriculas'] ?? [];
            $codigos = [...$codigos, ...array_map(fn (array $m) => $m['certificado']['codigo'], $matriculas)];
            $porTurma[sprintf('SCAP %d matriculas.aluno', $orcamento['scap'])] = array_map(
                fn (array $m) => $rut($m, 'aluno'),
                $matriculas,
            );
        }

        $erros = [
            ...self::repetidos('cursos.chave', array_column($carga['cursos'], 'chave')),
            ...self::repetidos('redatores.chave', array_column($carga['redatores'], 'chave')),
            ...self::repetidos('redatores.rut', array_map(fn (array $r) => $rut($r, 'rut'), $carga['redatores'])),
            ...self::repetidos('redatores.email', array_map($email, $carga['redatores'])),
            ...self::repetidos('alunos.rut', array_map(fn (array $a) => $rut($a, 'rut'), $carga['alunos'])),
            ...self::repetidos('alunos.email', array_map($email, $carga['alunos'])),
            ...self::repetidos('orcamentos.scap', array_column($carga['orcamentos'], 'scap')),
            ...self::repetidos('certificado.codigo', $codigos),
        ];

        foreach ($porTurma as $campo => $alunos) {
            $erros = [...$erros, ...self::repetidos($campo, $alunos)];
        }

        foreach ($carga['redatores'] as $redator) {
            $erros = [...$erros, ...self::repetidos(
                sprintf('redator %s documentos.type', $redator['chave']),
                array_column($redator['documentos'], 'type'),
            )];
        }

        return $erros;
    }

    /**
     * @param  list<mixed>  $valores
     * @return list<string>
     */
    private static function repetidos(string $campo, array $valores): array
    {
        $erros = [];

        foreach (array_keys(array_filter(array_count_values(array_map('strval', $valores)), fn (int $n) => $n > 1)) as $valor) {
            $erros[] = sprintf('%s: o valor %s se repete', $campo, $valor);
        }

        return $erros;
    }

    // ----------------------------------------------------------- referências

    /**
     * @param  array<string, mixed>  $carga
     * @return list<string>
     */
    private static function erroDeReferencia(array $carga): array
    {
        $erros = [];
        $cursos = array_flip(array_column($carga['cursos'], 'chave'));
        $redatores = array_flip(array_column($carga['redatores'], 'chave'));
        $alunos = array_flip(array_map(fn (array $a) => Rut::parse($a['rut'])->format(), $carga['alunos']));

        foreach ($carga['redatores'] as $redator) {
            foreach ($redator['cursos'] as $curso) {
                if (! isset($cursos[$curso])) {
                    $erros[] = sprintf('redator %s: o curso %s não existe em cursos', $redator['chave'], $curso);
                }
            }
        }

        foreach ($carga['orcamentos'] as $orcamento) {
            $scap = $orcamento['scap'];
            $curso = $orcamento['cotacao']['curso'];

            if (! isset($cursos[$curso])) {
                $erros[] = sprintf('SCAP %d: cotacao.curso %s não existe em cursos', $scap, $curso);
            }

            $turma = $orcamento['turma'];
            if ($turma === null) {
                continue;
            }

            if (! isset($cursos[$turma['curso']])) {
                $erros[] = sprintf('SCAP %d: turma.curso %s não existe em cursos', $scap, $turma['curso']);
            }

            if (! isset($redatores[$turma['redator']])) {
                $erros[] = sprintf('SCAP %d: turma.redator %s não existe em redatores', $scap, $turma['redator']);
            }

            if ($turma['curso'] !== $curso) {
                $erros[] = sprintf(
                    'SCAP %d: turma.curso %s difere de cotacao.curso %s',
                    $scap,
                    $turma['curso'],
                    $curso,
                );
            }

            foreach ($turma['matriculas'] as $matricula) {
                if (! isset($alunos[Rut::parse($matricula['aluno'])->format()])) {
                    $erros[] = sprintf('SCAP %d: matricula do aluno %s não existe em alunos', $scap, $matricula['aluno']);
                }
            }
        }

        return $erros;
    }

    // ------------------------------------------------- regras entre campos

    /**
     * @param  array<string, mixed>  $carga
     * @return list<string>
     */
    private static function erroDeCotacao(array $carga): array
    {
        $erros = [];

        foreach ($carga['orcamentos'] as $orcamento) {
            $cotacao = $orcamento['cotacao'];
            $aprovada = $cotacao['status'] === 'approved';

            if ($aprovada && $cotacao['approved_on'] === null) {
                $erros[] = sprintf('SCAP %d: cotacao approved exige approved_on', $orcamento['scap']);
            }

            if (! $aprovada && $cotacao['approved_on'] !== null) {
                $erros[] = sprintf('SCAP %d: cotacao pending não pode ter approved_on', $orcamento['scap']);
            }
        }

        return $erros;
    }

    /**
     * @param  array<string, mixed>  $carga
     * @return list<string>
     */
    private static function erroDeTurma(array $carga): array
    {
        $erros = [];

        foreach ($carga['orcamentos'] as $orcamento) {
            $turma = $orcamento['turma'];
            if ($turma === null) {
                continue;
            }

            if ($orcamento['cotacao']['status'] !== 'approved') {
                $erros[] = sprintf(
                    'SCAP %d: turma exige cotacao approved, mas o status é %s',
                    $orcamento['scap'],
                    $orcamento['cotacao']['status'],
                );
            }

            // As duas datas já passaram em `date_format:Y-m-d`; nesse formato a
            // ordem das strings é a ordem dos dias.
            if ($turma['end_date'] < $turma['start_date']) {
                $erros[] = sprintf(
                    'SCAP %d: turma.end_date %s é anterior a start_date %s',
                    $orcamento['scap'],
                    $turma['end_date'],
                    $turma['start_date'],
                );
            }
        }

        return $erros;
    }

    // ------------------------------------------------------------ documentos

    /**
     * @param  array<string, mixed>  $carga
     * @return list<string>
     */
    private static function erroDeDocumento(array $carga, string $pasta): array
    {
        $erros = [];

        foreach ($carga['redatores'] as $redator) {
            foreach ($redator['documentos'] as $documento) {
                $arquivo = $documento['arquivo'];

                if (str_starts_with($arquivo, '/') || in_array('..', explode('/', $arquivo), true)) {
                    $erros[] = sprintf('redator %s: o arquivo %s sai da pasta da carga', $redator['chave'], $arquivo);

                    continue;
                }

                if (! is_file($pasta.'/'.$arquivo)) {
                    $erros[] = sprintf('redator %s: o arquivo %s não existe em %s', $redator['chave'], $arquivo, $pasta);
                }
            }
        }

        return $erros;
    }
}
