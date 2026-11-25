<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Exceptions\CorruptedSnapshotException;
use App\Domains\Certification\Models\Certificate;
use RuntimeException;
use ZipArchive;

/**
 * O arquivo ZIP dos certificados de uma cotação (spec §5.5): um PDF por
 * certificado, `certificado-<codigo>.pdf` — o nome do download público.
 *
 * Monta em ARQUIVO (`ZipArchive`), nunca num ZIP em memória: o lote já guarda
 * HTMLs e PDFs de todos os certificados (~1,4 MiB cada) e o limite do FPM é
 * 256 MiB. O arquivo é de quem pede o ZIP (o `CertificateExport` o entrega ao controller, que o apaga depois do envio).
 */
class CertificateZip
{
    /**
     * Certificados por ZIP. É o teto registrado em `medicao-gotenberg.md`
     * (`## Lote`): o maior lote cujo tempo no PIOR ritmo medido (0,81 s por
     * certificado) cabe em metade dos 120 s do `fastcgi_read_timeout`. Se o
     * `mem_limit` do Gotenberg ou o host mudarem, a medição se refaz.
     */
    public const TETO = 70;

    /** `teto` entra pelo construtor para o teste não precisar de setenta matrículas. */
    public function __construct(public readonly int $teto = self::TETO) {}

    /**
     * Os códigos cujo documento congelado não se apresenta (nome do aluno ou
     * do curso em branco). Checado ANTES de qualquer conversão: não se gasta
     * Chromium num lote que já não fecha, e quem corrige vê todos os códigos
     * de uma vez, não um por tentativa.
     *
     * @param  iterable<Certificate>  $certificates
     * @return list<string>
     */
    public function naoApresentaveis(iterable $certificates): array
    {
        $codigos = [];

        foreach ($certificates as $certificate) {
            try {
                $certificate->snapshot->assertPresentable($certificate->codigo);
            } catch (CorruptedSnapshotException) {
                $codigos[] = $certificate->codigo;
            }
        }

        return $codigos;
    }

    /**
     * Grava o ZIP em `$path`.
     *
     * @param  array<string, string>  $pdfs  `codigo` → bytes do PDF
     */
    public function build(array $pdfs, string $path): void
    {
        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException(__('certification.export.zip_failed'));
        }

        foreach ($pdfs as $codigo => $bytes) {
            $nome = "certificado-{$codigo}.pdf";

            if (! $zip->addFromString($nome, $bytes)) {
                $zip->close();

                throw new RuntimeException(__('certification.export.zip_failed'));
            }

            // PDF já vem comprimido: deflate gastaria CPU para quase nada.
            $zip->setCompressionName($nome, ZipArchive::CM_STORE);
        }

        if (! $zip->close()) {
            throw new RuntimeException(__('certification.export.zip_failed'));
        }
    }
}
