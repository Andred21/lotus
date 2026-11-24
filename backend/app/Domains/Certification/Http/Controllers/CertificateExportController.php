<?php

namespace App\Domains\Certification\Http\Controllers;

use App\Domains\Certification\Data\CertificateExportQueryData;
use App\Domains\Certification\Data\CertificateExportSummaryData;
use App\Domains\Certification\Exceptions\CertificateExportException;
use App\Domains\Certification\Services\CertificateExportScope;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Domains\Certification\Services\CertificateSpreadsheet;
use App\Domains\Certification\Services\CertificateZip;
use App\Http\Controllers\Controller;
use App\Shared\Pdf\PdfRenderException;
use App\Shared\Pdf\PdfUnavailableException;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\ValidationException;
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

    /**
     * Os PDFs da cotação num ZIP (spec §5.5). Exige `quote_id` — a regra é do
     * servidor, o botão desabilitado é conveniência. Conjunto vazio e acima do
     * teto são 422 ANTES de gastar o conversor; tudo ou nada depois dele.
     *
     * A query é uma só (um `hoje` por pedido): a contagem do teto e os
     * certificados renderizados saem do MESMO builder.
     */
    public function zip(
        CertificateExportQueryData $filtros,
        CertificateExportScope $escopo,
        CertificatePdfService $pdfs,
        CertificateZip $zip,
    ): BinaryFileResponse {
        if ($filtros->quote_id === null) {
            throw ValidationException::withMessages([
                'quote_id' => __('certification.export.zip_quote_required'),
            ]);
        }

        $consulta = $escopo->query($filtros);
        $total = $consulta->count();

        if ($total === 0) {
            throw CertificateExportException::vazia();
        }

        if ($total > $zip->teto) {
            throw CertificateExportException::acimaDoTeto($total, $zip->teto);
        }

        $certificados = $consulta->get();

        $invalidos = $zip->naoApresentaveis($certificados);
        if ($invalidos !== []) {
            throw CertificateExportException::zipComSnapshotInvalido($invalidos);
        }

        try {
            $renderizados = $pdfs->renderMany($certificados);
        } catch (PdfRenderException $e) {
            if ($e->failedKeys === []) {
                throw $e;
            }

            // 503, não 422: o conversor caiu, os certificados estão certos. A
            // `HttpException` não é reportada pelo Laravel, então a causa (a
            // cadeia do conversor) é reportada aqui e vai também como `previous`.
            report($e);

            // A mensagem da exceção é diagnóstico; a recusa é de `lang/`, nomeando os códigos.
            throw new PdfUnavailableException(
                __('certification.export.zip_render_failed', ['codigos' => implode(', ', $e->failedKeys)]),
                $e,
            );
        }

        $caminho = tempnam(sys_get_temp_dir(), 'lotus-zip-');

        try {
            $zip->build($renderizados, $caminho);
        } catch (Throwable $e) {
            @unlink($caminho);

            throw $e;
        }

        return response()
            ->download($caminho, $escopo->nomeDoArquivo($filtros).'.zip', [
                'Content-Type' => 'application/zip',
            ])
            ->deleteFileAfterSend();
    }
}
