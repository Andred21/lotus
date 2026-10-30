<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Models\CertificateSettings;
use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Models\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Assinaturas do certificado, lidas NA HORA de imprimir (spec D5): quem assina
 * hoje é quem assina no PDF, mesmo para um certificado emitido há meses. Só o
 * TEXTO do instrutor vem do snapshot (D14) — o nome é o que a emissão congelou;
 * a imagem é a firma vigente do redator, inclusive arquivado (D19).
 *
 * A falta de uma imagem nunca derruba o PDF (spec §4.3): ausente no bucket ou
 * erro de leitura viram imagem `null` e a exceção vai para `report()`.
 */
class CertificateSignatures
{
    public function para(Certificate $certificate): AssinaturasDoCertificado
    {
        $settings = CertificateSettings::atual();

        return new AssinaturasDoCertificado(
            gerente: new AssinaturaImpressa(
                nome: $settings->manager_name,
                cargo: $settings->manager_title,
                pngBase64: $this->base64DoArquivo($settings->signature),
            ),
            instrutor: new AssinaturaImpressa(
                nome: $certificate->snapshot->redator->name,
                cargo: 'Instructor',
                pngBase64: $this->base64DoArquivo($this->firmaDoInstrutor($certificate)),
            ),
        );
    }

    /** `redator_id` nulo (amostra do preview) → sem firma. `withTrashed`: o redator arquivado ainda assina (D19). */
    private function firmaDoInstrutor(Certificate $certificate): ?File
    {
        if ($certificate->redator_id === null) {
            return null;
        }

        return Redator::withTrashed()->find($certificate->redator_id)?->firma;
    }

    /**
     * O binário sai do disco em que o upload o gravou: `files` não guarda o
     * disco, e `UploadFileAction` grava sempre em `filesystems.default`.
     */
    private function base64DoArquivo(?File $file): ?string
    {
        if ($file === null) {
            return null;
        }

        try {
            $bytes = Storage::disk(config('filesystems.default'))->get($file->path);

            // Disco sem `throw` devolve `null` para objeto ausente.
            if (! is_string($bytes) || $bytes === '') {
                throw new RuntimeException(__('certification.signature.missing_binary', ['id' => $file->id, 'path' => $file->path]));
            }

            return base64_encode($bytes);
        } catch (Throwable $e) {
            report($e);

            return null;
        }
    }
}
