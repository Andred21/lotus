<?php

namespace App\Console\CargaInicial\Extracao;

use App\Console\CargaInicial\CargaInvalidaException;
use DateTimeImmutable;
use DateTimeInterface;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Cell\FormulaCell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Exception\IOException;
use OpenSpout\Reader\XLSX\Options;
use OpenSpout\Reader\XLSX\Reader;

/**
 * Lê a aba `REGISTROS` da planilha da v1 e devolve uma linha por certificado,
 * com as chaves que o `Normalizador` consome.
 *
 * Duas decisões de segurança moram aqui. A coluna Z (`CLAVE`) guarda senhas:
 * toda linha é cortada em `COLUNAS_LIDAS` células ANTES de qualquer outro uso,
 * e nada além do índice 24 volta a ser tocado, nem para a mensagem de erro.
 * E o cabeçalho é conferido contra a grafia esperada: a coluna por índice só é
 * confiável enquanto a planilha não ganhar nem perder coluna.
 */
final class LeitorDeRegistros
{
    public const ABA = 'REGISTROS';

    /** As colunas A–Y; a Z (índice 25) é a `CLAVE` e nunca é lida. */
    private const COLUNAS_LIDAS = 25;

    private const LINHA_DO_CABECALHO = 5;

    private const PRIMEIRA_LINHA_DE_DADOS = 6;

    /** Chave da linha lida => índice da coluna (B=1 … X=23). */
    private const COLUNAS = [
        'codigo' => 1,
        'curso_seletor' => 2,
        'realizado_en' => 3,
        'modalidad' => 4,
        'horas' => 5,
        'cliente_rut' => 6,
        'cliente_nome' => 7,
        'aluno_rut' => 8,
        'aluno_nome' => 9,
        'fecha_curso' => 10,
        'instrutor' => 11,
        'estado_eval' => 12,
        'evaluacion' => 13,
        'vigencia' => 15,
        'nom_curso' => 21,
        'servicio' => 22,
        'f_emision' => 23,
    ];

    /** Índice => grafia do cabeçalho. Só as colunas que o leitor usa. */
    private const CABECALHO = [
        1 => 'Cº Certificado',
        2 => 'Nombre del curso',
        3 => 'Realizado en:',
        4 => 'Modalidad',
        5 => 'HrCap',
        6 => 'RUT Cliente',
        7 => 'Nombre Cliente',
        8 => 'RUT Alumno',
        9 => 'Nombre Alumno',
        10 => 'Fecha Curso',
        11 => 'Instructor',
        12 => 'Estado Eval',
        13 => 'Evaluación',
        15 => 'Vigencia',
        21 => 'NomCURSO',
        22 => 'SERVICIO',
        23 => 'F.EMISION',
    ];

    private const DATAS = ['fecha_curso', 'vigencia', 'f_emision'];

    /**
     * @return list<array<string, mixed>>
     *
     * @throws CargaInvalidaException
     */
    public function ler(string $xlsx): array
    {
        if (! is_file($xlsx)) {
            throw $this->falha(sprintf('a planilha não existe em %s', $xlsx));
        }

        $reader = new Reader(new Options(SHOULD_PRESERVE_EMPTY_ROWS: true));

        try {
            $reader->open($xlsx);

            foreach ($reader->getSheetIterator() as $aba) {
                if ($aba->getName() === self::ABA) {
                    return $this->lerAba($aba->getRowIterator());
                }
            }
        } catch (IOException $e) {
            throw $this->falha(sprintf('a planilha %s não abriu: %s', $xlsx, $e->getMessage()));
        } finally {
            $reader->close();
        }

        throw $this->falha(sprintf('a planilha não tem a aba %s', self::ABA));
    }

    /**
     * @param  iterable<int, Row>  $linhas
     * @return list<array<string, mixed>>
     */
    private function lerAba(iterable $linhas): array
    {
        $conferiu = false;
        $registros = [];

        foreach ($linhas as $numero => $linha) {
            if ($numero < self::LINHA_DO_CABECALHO) {
                continue;
            }

            // O corte precede tudo: a partir daqui a coluna Z não existe.
            $celulas = array_replace(array_fill(0, self::COLUNAS_LIDAS, null), $this->valores($linha));

            if ($numero === self::LINHA_DO_CABECALHO) {
                $this->conferirCabecalho($celulas);
                $conferiu = true;

                continue;
            }

            $registro = $this->registro($celulas);

            if ($registro['codigo'] !== null) {
                $registros[] = $registro;
            }
        }

        if (! $conferiu) {
            throw $this->falha(sprintf('a aba %s não tem o cabeçalho na linha %d', self::ABA, self::LINHA_DO_CABECALHO));
        }

        return $registros;
    }

    /**
     * Célula de fórmula devolve o valor calculado, que o Excel guarda em cache:
     * `getValue()` seria o texto da fórmula. Os índices de coluna se preservam.
     * Só as `COLUNAS_LIDAS` primeiras entram: o corte vem ANTES do mapa, para que
     * nenhuma célula além delas (a CLAVE, por exemplo) seja sequer avaliada.
     *
     * @return array<int, mixed>
     */
    private function valores(Row $linha): array
    {
        return array_map(
            fn (Cell $celula) => $celula instanceof FormulaCell ? $celula->getComputedValue() : $celula->getValue(),
            array_slice($linha->cells, 0, self::COLUNAS_LIDAS, true),
        );
    }

    /** @param  array<int, mixed>  $celulas */
    private function conferirCabecalho(array $celulas): void
    {
        $erros = [];

        foreach (self::CABECALHO as $indice => $esperado) {
            $veio = $celulas[$indice] ?? null;

            if (! is_string($veio) || $this->chave($veio) !== $this->chave($esperado)) {
                $erros[] = sprintf(
                    'cabeçalho da aba %s, coluna %d: esperava "%s" e veio %s',
                    self::ABA,
                    $indice,
                    $esperado,
                    json_encode($veio, JSON_UNESCAPED_UNICODE),
                );
            }
        }

        if ($erros !== []) {
            throw new CargaInvalidaException($erros);
        }
    }

    /** Sem espaço (inclusive o não separável, que o Excel deixa passar) nas pontas. */
    private function aparar(string $texto): string
    {
        return (string) preg_replace('/^[\s\x{00A0}]+|[\s\x{00A0}]+$/u', '', $texto);
    }

    private function colapsar(string $texto): string
    {
        return $this->aparar((string) preg_replace('/[\s\x{00A0}]+/u', ' ', $texto));
    }

    /** O cabeçalho compara sem caixa e com os espaços colapsados. */
    private function chave(string $texto): string
    {
        return mb_strtolower($this->colapsar($texto));
    }

    /**
     * @param  array<int, mixed>  $celulas
     * @return array<string, mixed>
     */
    private function registro(array $celulas): array
    {
        $registro = [];

        foreach (self::COLUNAS as $campo => $indice) {
            $registro[$campo] = $celulas[$indice] ?? null;
        }

        foreach (self::DATAS as $campo) {
            $registro[$campo] = $this->data($registro[$campo]);
        }

        $registro['horas'] = $this->numero($registro['horas']);
        $registro['evaluacion'] = $this->numero($registro['evaluacion']);

        foreach (array_diff(array_keys(self::COLUNAS), [...self::DATAS, 'horas', 'evaluacion']) as $campo) {
            $registro[$campo] = $this->texto($registro[$campo]);
        }

        return $registro;
    }

    private function texto(mixed $valor): ?string
    {
        if ($valor instanceof DateTimeInterface) {
            return $valor->format('Y-m-d');
        }

        if (is_float($valor) && floor($valor) === $valor) {
            $valor = (int) $valor;
        }

        if (! is_scalar($valor)) {
            return null;
        }

        $texto = $this->aparar((string) $valor);

        return $texto === '' ? null : $texto;
    }

    /** Inteiro ou decimal quando a célula é número; o texto original quando não é; nulo quando vazia. */
    private function numero(mixed $valor): int|float|string|null
    {
        if (is_string($valor)) {
            $texto = $this->aparar($valor);
            $numerico = str_replace(',', '.', $texto);

            if ($texto === '') {
                return null;
            }

            $valor = is_numeric($numerico) ? $numerico + 0 : $texto;
        }

        if (is_int($valor)) {
            return $valor;
        }

        if (is_float($valor)) {
            return floor($valor) === $valor ? (int) $valor : $valor;
        }

        return is_scalar($valor) ? (string) $valor : null;
    }

    /**
     * Três formas de data viram a mesma ISO: a data do Excel, o número serial
     * (base 1899-12-30) e o texto `d/m/Y` ou `d-m-Y`. Texto já ISO fica como
     * está; o que não dá para ler volta como texto, e quem consome acusa.
     */
    private function data(mixed $valor): ?string
    {
        if ($valor instanceof DateTimeInterface) {
            return $valor->format('Y-m-d');
        }

        if (is_int($valor) || is_float($valor)) {
            return $valor >= 1
                ? (new DateTimeImmutable('1899-12-30'))->modify(sprintf('+%d days', (int) floor($valor)))->format('Y-m-d')
                : (string) $valor;
        }

        $texto = $this->texto($valor);

        if ($texto === null || preg_match('/^\d{4}-\d{2}-\d{2}$/', $texto) === 1) {
            return $texto;
        }

        if (preg_match('/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/', $texto, $p) === 1 && checkdate((int) $p[2], (int) $p[1], (int) $p[3])) {
            return sprintf('%04d-%02d-%02d', $p[3], $p[2], $p[1]);
        }

        return $texto;
    }

    /** A mensagem nasce fora da chamada: a catraca `MensagemLiteralTest` não admite texto literal em `new ...Exception(`. */
    private function falha(string $mensagem): CargaInvalidaException
    {
        return new CargaInvalidaException([$mensagem]);
    }
}
