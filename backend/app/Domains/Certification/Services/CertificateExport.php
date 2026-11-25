<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Data\CertificateExportQueryData;
use App\Domains\Certification\Exceptions\CertificateExportException;
use App\Domains\Certification\Models\Certificate;
use App\Shared\Pdf\PdfRenderException;
use App\Shared\Pdf\PdfUnavailableException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * As regras da exportação do Historial (spec §5.3 a §5.5), fora do controller:
 * quem exporta — a rota, um comando, um job — passa pelas mesmas recusas.
 *
 * Conjunto vazio e conjunto acima do teto são 422, nunca um arquivo vazio nem
 * truncado, e valem ANTES de gastar o conversor. As duas saídas devolvem o
 * caminho de um temporário que NÃO sobra se a geração falha; quem recebe o
 * caminho que o apague depois de usar (o controller, com `deleteFileAfterSend`).
 *
 * A query é uma só (um `hoje` por pedido): a contagem do teto e os certificados
 * exportados saem do MESMO builder.
 */
class CertificateExport
{
    /** Vaga única de ZIP em geração, entre todos os usuários. */
    private const ZIP_LOCK = 'certificate-zip';

    /** Segundos até o lock soltar sozinho: os 120 s do nginx mais folga. */
    private const ZIP_LOCK_TTL = 150;

    public function __construct(
        private readonly CertificateExportScope $escopo,
        private readonly CertificateSpreadsheet $planilha,
        private readonly CertificateZip $zip,
        private readonly CertificatePdfService $pdfs,
    ) {}

    /**
     * A planilha xlsx do conjunto filtrado, num temporário.
     *
     * @return string o caminho do temporário
     */
    public function planilha(CertificateExportQueryData $filtros): string
    {
        $consulta = $this->escopo->query($filtros);
        $this->assertDentroDoTeto($consulta->count(), $this->planilha->teto);

        $caminho = $this->temporario('lotus-planilha-', __('certification.export.spreadsheet_failed'));

        try {
            $this->planilha->write($consulta->cursor(), $caminho);
        } catch (Throwable $e) {
            @unlink($caminho);

            throw $e;
        }

        return $caminho;
    }

    /**
     * Os PDFs da cotação num ZIP (spec §5.5), tudo ou nada. Exige `quote_id` —
     * a regra é do servidor, o botão desabilitado do front é conveniência.
     *
     * @return string o caminho do temporário
     */
    public function zip(CertificateExportQueryData $filtros): string
    {
        if ($filtros->quote_id === null) {
            throw ValidationException::withMessages([
                'quote_id' => __('certification.export.zip_quote_required'),
            ]);
        }

        $consulta = $this->escopo->query($filtros);
        $this->assertDentroDoTeto($consulta->count(), $this->zip->teto);

        $certificados = $consulta->get();

        $invalidos = $this->zip->naoApresentaveis($certificados);
        if ($invalidos !== []) {
            throw CertificateExportException::zipComSnapshotInvalido($invalidos);
        }

        // O Gotenberg é um Chromium único: o limitador por usuário não impede
        // dois usuários de gerar ZIPs ao mesmo tempo, e com vários em voo ele
        // fica sem folga de memória. O lock é global; sem vaga, 503 com
        // `Retry-After` — sem gastar o conversor. O TTL cobre o pior caso do
        // orçamento do lote e solta sozinho se o processo morrer.
        $lock = Cache::lock(self::ZIP_LOCK, self::ZIP_LOCK_TTL);

        if (! $lock->get()) {
            throw new PdfUnavailableException(__('certification.export.zip_busy'));
        }

        try {
            return $this->gerarZip($certificados);
        } finally {
            $lock->release();
        }
    }

    /** A recusa de vazio e de teto, uma só para a planilha e para o ZIP. */
    private function assertDentroDoTeto(int $total, int $teto): void
    {
        if ($total === 0) {
            throw CertificateExportException::vazia();
        }

        if ($total > $teto) {
            throw CertificateExportException::acimaDoTeto($total, $teto);
        }
    }

    /**
     * Renderiza e monta o ZIP num temporário. Roda dentro do lock global, que
     * quem chama solta em `finally`.
     *
     * @param  iterable<Certificate>  $certificados
     */
    private function gerarZip(iterable $certificados): string
    {
        try {
            $renderizados = $this->pdfs->renderMany($certificados);
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

        $caminho = $this->temporario('lotus-zip-', __('certification.export.zip_failed'));

        try {
            $this->zip->build($renderizados, $caminho);
        } catch (Throwable $e) {
            @unlink($caminho);

            throw $e;
        }

        return $caminho;
    }

    /** `tempnam()` devolve `false` quando não consegue criar o arquivo (disco cheio, sem permissão). */
    private function temporario(string $prefixo, string $mensagem): string
    {
        $caminho = tempnam(sys_get_temp_dir(), $prefixo);

        if ($caminho === false) {
            throw new RuntimeException($mensagem);
        }

        return $caminho;
    }
}
