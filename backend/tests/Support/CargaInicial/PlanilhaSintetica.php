<?php

namespace Tests\Support\CargaInicial;

use DateTimeImmutable;
use DateTimeInterface;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Cell\FormulaCell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\Common\Helper\CellHelper;
use OpenSpout\Writer\XLSX\Helper\DateHelper;
use OpenSpout\Writer\XLSX\Writer;
use RuntimeException;
use ZipArchive;

/**
 * Uma planilha `REGISTROS` inventada: RUTs fictícios com DV válido (gerados em
 * `CargaSintetica::rut`), nomes de brinquedo. Dado pessoal de verdade nunca
 * entra no repo (spec §4). A coluna Z (`CLAVE`) leva um marcador em toda
 * linha: o leitor tem de descartá-la, e o teste procura o marcador na saída.
 */
final class PlanilhaSintetica
{
    public const SEGREDO = 'SEGREDO-NAO-LER';

    private const PRIMEIRA_LINHA_DE_DADOS = 6;

    /** Chave da linha lida => índice da coluna (B=1 … X=23). */
    public const COLUNAS = [
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

    /** O cabeçalho real, índice => texto, como a planilha o grafa (linha 5). */
    public const CABECALHO = [
        0 => 'N°',
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
        14 => 'Otra columna',
        15 => 'Vigencia',
        16 => 'Otra columna',
        17 => 'Otra columna',
        18 => 'Otra columna',
        19 => 'Otra columna',
        20 => 'Otra columna',
        21 => 'NomCURSO',
        22 => 'SERVICIO',
        23 => 'F.EMISION',
        24 => 'Otra columna',
        25 => 'CLAVE',
    ];

    /**
     * Marca o valor de uma coluna como FÓRMULA com resultado em cache, como a
     * planilha real traz HrCap, Instructor, Vigencia e F.EMISION (VLOOKUP e
     * afins). `gravar` escreve `<f>` e `<v>`: o leitor tem de ler o `<v>`.
     */
    public static function formula(int|float|string|DateTimeImmutable $valor): FormulaCell
    {
        return new FormulaCell('=VLOOKUP(A1,Config!A:B,2,0)', $valor);
    }

    /**
     * Uma linha válida, no formato que o `LeitorDeRegistros` devolve (datas em
     * ISO, `horas` inteiro). Combina com `ComplementoSintetico::dados()`.
     *
     * @param  array<string, mixed>  $sobrescreve
     * @return array<string, mixed>
     */
    public static function linha(array $sobrescreve = []): array
    {
        return array_replace([
            'codigo' => 'LOT-2026-001',
            'curso_seletor' => '200# Curso Prueba A',
            'realizado_en' => 'Talca',
            'modalidad' => 'Presencial',
            'horas' => 16,
            'cliente_rut' => CargaSintetica::rut(76111111),
            'cliente_nome' => 'EMPRESA PRUEBA LTDA.',
            'aluno_rut' => CargaSintetica::rut(16111111),
            'aluno_nome' => 'Alumno Uno',
            'fecha_curso' => '2026-07-10',
            'instrutor' => 'Relator P.',
            'estado_eval' => 'Aprobado',
            'evaluacion' => 7,
            'vigencia' => '2028-07-09',
            'nom_curso' => 'Nombre Técnico A',
            'servicio' => 'SCAP-176',
            'f_emision' => '2026-07-15',
        ], $sobrescreve);
    }

    /**
     * Grava o xlsx: uma aba `Config` antes da `REGISTROS`, quatro linhas de
     * enfeite, o cabeçalho na linha 5 e os dados da linha 6 em diante.
     *
     * @param  list<array<string, mixed>>  $linhas
     * @param  array{cabecalho?: array<int, string>}  $opcoes
     */
    public static function gravar(string $caminho, array $linhas, array $opcoes = []): void
    {
        $writer = new Writer;
        $writer->openToFile($caminho);

        $writer->getCurrentSheet()->setName('Config');
        $writer->addRow(Row::fromValues(['parametro', 'valor']));

        $writer->addNewSheetAndMakeItCurrent()->setName('REGISTROS');

        // Linhas 1–4 de enfeite; as três últimas em branco, como numa planilha
        // de verdade: o leitor tem de contar a linha 5 mesmo com linhas vazias.
        $writer->addRow(Row::fromValues(['REGISTRO DE CERTIFICADOS']));
        foreach (range(1, 3) as $_) {
            $writer->addRow(new Row([]));
        }

        $writer->addRow(Row::fromValues(array_replace(self::CABECALHO, $opcoes['cabecalho'] ?? [])));

        // Uma data do Excel de verdade tem formato de data; sem ele o OpenSpout
        // devolveria o número serial.
        $data = (new Style)->withFormat('dd/mm/yyyy');

        // referência da célula => resultado em cache; o writer do OpenSpout grava
        // `<f>` sem `<v>`, então o `<v>` entra depois, no XML da aba.
        $emCache = [];
        $numeroDaLinha = self::PRIMEIRA_LINHA_DE_DADOS;

        foreach ($linhas as $linha) {
            $celulas = array_fill(0, 26, null);

            foreach (self::COLUNAS as $chave => $indice) {
                $celulas[$indice] = $linha[$chave] ?? null;
            }

            $celulas[25] = self::SEGREDO;

            $cells = [];

            foreach ($celulas as $indice => $valor) {
                if ($valor instanceof FormulaCell) {
                    $resultado = $valor->getComputedValue();
                    $emCache[CellHelper::getColumnLettersFromColumnIndex($indice).$numeroDaLinha] = $resultado;
                    // O OpenSpout só grava `<f>`; o resultado entra depois, em `injetarResultados`.
                    $cells[] = $resultado instanceof DateTimeInterface ? $valor->withStyle($data) : $valor;
                } else {
                    $cells[] = $valor instanceof DateTimeInterface ? Cell::fromValue($valor, $data) : Cell::fromValue($valor);
                }
            }

            $writer->addRow(new Row($cells));
            $numeroDaLinha++;
        }

        $writer->close();

        if ($emCache !== []) {
            self::injetarResultados($caminho, $emCache);
        }
    }

    /**
     * Acrescenta o `<v>` (e `t="str"` para texto) a cada célula de fórmula da
     * aba `REGISTROS`, a segunda do arquivo.
     *
     * @param  array<string, int|float|string|DateTimeInterface>  $emCache
     */
    private static function injetarResultados(string $caminho, array $emCache): void
    {
        $zip = new ZipArchive;
        $zip->open($caminho);
        $aba = 'xl/worksheets/sheet2.xml';
        $xml = $zip->getFromName($aba);

        foreach ($emCache as $referencia => $valor) {
            $texto = is_string($valor);
            $v = $valor instanceof DateTimeInterface ? (string) DateHelper::toExcel($valor) : (string) $valor;

            $xml = preg_replace(
                '/<c r="'.$referencia.'"( s="\d+")?><f>(.*?)<\/f><\/c>/',
                '<c r="'.$referencia.'"$1'.($texto ? ' t="str"' : '').'><f>$2</f><v>'.htmlspecialchars($v, ENT_XML1).'</v></c>',
                $xml,
                1,
                $trocas,
            );

            if ($trocas !== 1) {
                throw new RuntimeException('célula de fórmula '.$referencia.' não achada no XML da aba');
            }
        }

        $zip->addFromString($aba, $xml);
        $zip->close();
    }
}
