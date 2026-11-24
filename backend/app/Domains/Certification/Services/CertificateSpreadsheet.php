<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Models\Certificate;
use Illuminate\Support\Carbon;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Cell\EmptyCell;
use OpenSpout\Common\Entity\Cell\FormulaCell;
use OpenSpout\Common\Entity\Cell\StringCell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Options;
use OpenSpout\Writer\XLSX\Writer;
use RuntimeException;
use Throwable;
use ZipArchive;

/**
 * A planilha do Historial (spec §5.4): uma linha por certificado exportado,
 * com o que o documento congelou — nunca o cadastro vivo.
 *
 * É lista, não documento: snapshot sem nome ou sem RUT (estrangeiro) sai com a
 * célula vazia e não derruba a planilha, a mesma fronteira da listagem, que
 * marca a linha em vez de recusar.
 *
 * O link é a fórmula `HYPERLINK`: o openspout 5 não tem célula de hiperlink, e
 * xlsx é o formato que carrega texto clicável (CSV não carrega). O writer
 * grava a fórmula sem o valor em cache, então `gravarValorDoLink()` o
 * acrescenta depois de fechar o arquivo: leitor que não recalcula (Modo
 * Protegido, prévia de e-mail, Quick Look) mostra `ABRIR`, não célula vazia.
 *
 * Texto do snapshot vai SEMPRE como `StringCell`: o `Cell::fromValue` do
 * openspout promove a fórmula qualquer string que comece com `=`, e nome ou
 * curso digitado ou importado não pode executar nada no Excel de quem exporta.
 */
class CertificateSpreadsheet
{
    /** Linhas de dados por pedido; acima disso a exportação pede filtro mais estreito. */
    public const TETO_LINHAS = 1000;

    public const HEADER = ['Código', 'Fecha Curso', 'RUT', 'Nombre Completo', 'Curso', 'Link Descarga'];

    private const LINK_TEXTO = 'ABRIR';

    /** A aba única que o writer cria. */
    private const ABA = 'xl/worksheets/sheet1.xml';

    /** Verde-azulado do cabeçalho, como no modelo da Lotus. */
    private const COR_CABECALHO = '0F766E';

    /** Larguras das colunas, na ordem de `HEADER`. */
    private const LARGURAS = [18, 14, 16, 36, 40, 16];

    /** `teto` entra pelo construtor para o teste não precisar de mil matrículas. */
    public function __construct(public readonly int $teto = self::TETO_LINHAS) {}

    /**
     * Grava o xlsx em `$path`. `$certificates` é percorrido uma vez (cursor ou
     * lazy): o `cursor()` não hidrata todos os models de uma vez, embora o
     * MySQL bufferize o resultado do lado do cliente.
     *
     * @param  iterable<Certificate>  $certificates
     */
    public function write(iterable $certificates, string $path): void
    {
        $options = new Options;
        foreach (self::LARGURAS as $indice => $largura) {
            $options->setColumnWidth($largura, $indice + 1);
        }

        $writer = new Writer($options);
        $writer->openToFile($path);

        try {
            $writer->addRow(Row::fromValuesWithStyle(
                self::HEADER,
                (new Style)->withFontBold(true)->withFontColor(Color::WHITE)->withBackgroundColor(self::COR_CABECALHO),
            ));

            foreach ($certificates as $certificate) {
                $writer->addRow($this->linha($certificate));
            }
        } finally {
            $writer->close();
        }

        $this->gravarValorDoLink($path);
    }

    /**
     * Reescreve `<c r="F2" s="N"><f>…</f></c>` como
     * `<c r="F2" s="N" t="str"><f>…</f><v>ABRIR</v></c>`: `t="str"` é o que
     * marca o resultado textual. Só toca célula com fórmula (as de dados da
     * coluna do link); o cabeçalho e o resto seguem como o writer os gravou.
     */
    private function gravarValorDoLink(string $path): void
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw new RuntimeException(__('certification.export.spreadsheet_failed'));
        }

        try {
            $xml = $zip->getFromName(self::ABA);
            if ($xml === false) {
                throw new RuntimeException(__('certification.export.spreadsheet_failed'));
            }

            $xml = preg_replace(
                '#<c r="(F\d+)" s="(\d+)"><f>(.*?)</f></c>#',
                '<c r="$1" s="$2" t="str"><f>$3</f><v>'.self::LINK_TEXTO.'</v></c>',
                $xml,
            );

            if (! $zip->addFromString(self::ABA, $xml)) {
                throw new RuntimeException(__('certification.export.spreadsheet_failed'));
            }
        } finally {
            // `close()` é quem grava de fato o que o `addFromString` enfileirou.
            $fechou = $zip->close();
        }

        if (! $fechou) {
            throw new RuntimeException(__('certification.export.spreadsheet_failed'));
        }
    }

    private function linha(Certificate $certificate): Row
    {
        // Lido UMA vez: o cast do snapshot não guarda objeto (cada acesso
        // decodifica o JSON), e a planilha lê quatro campos dele.
        $snapshot = $certificate->snapshot;

        return new Row([
            $this->texto($certificate->codigo),
            $this->texto($this->data($snapshot->turma->end_date)),
            $this->texto($snapshot->aluno->rut),
            $this->texto($snapshot->aluno->name),
            $this->texto($snapshot->curso->name),
            $this->link($certificate->uuid),
        ]);
    }

    /** Sempre texto literal; vazio ou nulo é célula vazia. */
    private function texto(?string $valor): Cell
    {
        return $valor === null || $valor === '' ? new EmptyCell(null) : new StringCell($valor);
    }

    /** `dd/mm/yy`; sem data, vazio — a linha não sai por isso. */
    private function data(?string $iso): string
    {
        if ($iso === null || $iso === '') {
            return '';
        }

        try {
            return Carbon::parse($iso)->format('d/m/y');
        } catch (Throwable) {
            return $iso;
        }
    }

    /** O PDF público do bloco 61, na base da API (`app.url`), não na página de validação. */
    private function link(string $uuid): FormulaCell
    {
        $url = rtrim((string) config('app.url'), '/')."/api/publico/certificados/{$uuid}/pdf";

        // Aspas dobradas é o escape de string do Excel; o uuid e `app.url` não
        // as trazem, mas a fórmula não confia nisso.
        return new FormulaCell(
            '=HYPERLINK("'.str_replace('"', '""', $url).'","'.self::LINK_TEXTO.'")',
            self::LINK_TEXTO,
        );
    }
}
