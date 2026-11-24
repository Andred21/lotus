<?php

namespace App\Domains\Certification\Http\Controllers;

use App\Domains\Certification\Data\CertificateExportQueryData;
use App\Domains\Certification\Data\CertificateExportSummaryData;
use App\Domains\Certification\Exceptions\CertificateExportException;
use App\Domains\Certification\Services\CertificateExportScope;
use App\Domains\Certification\Services\CertificateSpreadsheet;
use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

/**
 * Exportação do Historial (spec §5.3): o número do aviso e o arquivo saem do
 * MESMO `CertificateExportScope`, com os mesmos filtros da listagem. Quem
 * exporta só precisa ver certificados — é leitura do que a listagem já mostra.
 */
class CertificateExportController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:certification.certificate.view'),
        ];
    }

    /** O N do aviso "Se exportarán N certificados…" e os revogados que ficam de fora. */
    public function summary(CertificateExportQueryData $filtros, CertificateExportScope $escopo): CertificateExportSummaryData
    {
        return $escopo->summary($filtros);
    }

    /**
     * Conjunto vazio e conjunto acima do teto são 422, nunca um arquivo vazio
     * nem um arquivo truncado. O temporário é apagado depois do envio.
     */
    public function planilha(
        CertificateExportQueryData $filtros,
        CertificateExportScope $escopo,
        CertificateSpreadsheet $planilha,
    ): BinaryFileResponse {
        $resumo = $escopo->summary($filtros);

        if ($resumo->total === 0) {
            throw CertificateExportException::vazia();
        }

        if ($resumo->total > $planilha->teto) {
            throw CertificateExportException::acimaDoTeto($resumo->total, $planilha->teto);
        }

        $caminho = tempnam(sys_get_temp_dir(), 'lotus-planilha-');

        try {
            $planilha->write($escopo->query($filtros)->cursor(), $caminho);
        } catch (Throwable $e) {
            @unlink($caminho);

            throw $e;
        }

        return response()
            ->download($caminho, $escopo->nomeDoArquivo($filtros).'.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend();
    }
}
