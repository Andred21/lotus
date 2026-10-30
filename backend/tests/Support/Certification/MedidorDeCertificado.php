<?php

namespace Tests\Support\Certification;

use App\Domains\Certification\Data\Snapshot\CertificateSnapshotData;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Models\CertificateSettings;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Shared\Pdf\GotenbergHtmlToPdf;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Mede o certificado no Gotenberg REAL (spec D11): renderiza pelo
 * `CertificatePdfService` de produção, com o conversor de produção, e lê o PDF
 * com o Poppler. Quem usa precisa de `skipUnlessGotenberg()` antes e do banco
 * migrado (`RefreshDatabase`): a assinatura da gerente é lida da linha de
 * `certificate_settings`, e `$gerente` a reescreve dentro da transação do teste.
 */
final class MedidorDeCertificado
{
    public const CODIGO = 'LOT-2026-1001';

    /**
     * @param  array<string, mixed>  $snapshot  o JSON congelado, como a emissão o grava
     * @param  array{nome: string, cargo: string}|null  $gerente  substitui nome e cargo da gerente
     */
    public function medir(array $snapshot, ?string $validoAte, ?array $gerente = null): MedicaoDePdf
    {
        config([
            'app.certificate_validation_url' => 'https://valida.lotus.test',
            'app.certificate_issuer.city' => 'Santiago',
        ]);

        if ($gerente !== null) {
            CertificateSettings::atual()->update([
                'manager_name' => $gerente['nome'],
                'manager_title' => $gerente['cargo'],
            ]);
        }

        $servico = app()->make(CertificatePdfService::class, ['pdf' => new GotenbergHtmlToPdf]);

        $certificate = new Certificate([
            'codigo' => self::CODIGO,
            'snapshot' => CertificateSnapshotData::fromArray($snapshot),
            'valido_ate' => $validoAte,
        ]);

        $arquivo = tempnam(sys_get_temp_dir(), 'matriz-cert-');

        try {
            file_put_contents($arquivo, $servico->render($certificate));

            return $this->ler($arquivo);
        } finally {
            @unlink($arquivo);
        }
    }

    private function ler(string $pdf): MedicaoDePdf
    {
        $info = $this->poppler(['pdfinfo', $pdf]);

        if (preg_match('/^Pages:\s+(\d+)/m', $info, $m) !== 1) {
            throw new RuntimeException("pdfinfo não devolveu o número de páginas:\n{$info}");
        }

        $paginas = (int) $m[1];

        return new MedicaoDePdf(
            paginas: $paginas,
            textoPorPagina: $this->paginasDe($this->poppler(['pdftotext', '-layout', $pdf, '-'])),
            textoBrutoPorPagina: $this->paginasDe($this->poppler(['pdftotext', '-raw', $pdf, '-'])),
            imagensPorPagina: $this->imagens($this->poppler(['pdfimages', '-list', $pdf]), $paginas),
            linhasPorPagina: $this->linhas($this->poppler(['pdftotext', '-bbox-layout', $pdf, '-'])),
        );
    }

    /** @param list<string> $comando */
    private function poppler(array $comando): string
    {
        $processo = new Process($comando);
        $processo->mustRun();

        return $processo->getOutput();
    }

    /** O `pdftotext` separa as páginas com form feed e fecha a última com um. */
    private function paginasDe(string $saida): array
    {
        $paginas = explode("\f", $saida);
        array_pop($paginas);

        return $paginas;
    }

    /** @return list<list<array{type: string, width: int, height: int}>> */
    private function imagens(string $saida, int $paginas): array
    {
        $porPagina = array_fill(0, $paginas, []);

        foreach (preg_split('/\R/', $saida) as $linha) {
            if (preg_match('/^\s*(\d+)\s+\d+\s+(\w+)\s+(\d+)\s+(\d+)\s/', $linha, $m) === 1) {
                $porPagina[(int) $m[1] - 1][] = ['type' => $m[2], 'width' => (int) $m[3], 'height' => (int) $m[4]];
            }
        }

        return $porPagina;
    }

    /** @return list<list<array{id: int, texto: string}>> */
    private function linhas(string $saida): array
    {
        $porPagina = [];
        $id = 0;

        foreach (array_slice(explode('<page ', $saida), 1) as $pagina) {
            $linhas = [];

            preg_match_all('#<line [^>]*>(.*?)</line>#s', $pagina, $blocos);

            foreach ($blocos[1] as $bloco) {
                preg_match_all('#<word [^>]*>(.*?)</word>#s', $bloco, $palavras);

                $linhas[] = [
                    'id' => $id++,
                    'texto' => html_entity_decode(implode(' ', $palavras[1]), ENT_QUOTES | ENT_XML1, 'UTF-8'),
                ];
            }

            $porPagina[] = $linhas;
        }

        return $porPagina;
    }
}
