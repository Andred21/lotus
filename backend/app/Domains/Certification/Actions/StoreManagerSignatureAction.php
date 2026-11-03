<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Models\CertificateSettings;
use App\Shared\Files\Models\File;
use App\Shared\Files\Services\FileUploader;
use App\Shared\Files\Services\StoredFiles;
use Illuminate\Http\UploadedFile;

/**
 * Sobe ou troca a assinatura da gerente. O binário vai ao disco ANTES da
 * transação e a linha única é travada para duas trocas simultâneas não
 * deixarem duas assinaturas vigentes; o `FileUploader` descarta o binário se
 * a escrita falhar, e `replace` soft-deleta a anterior por instância.
 */
class StoreManagerSignatureAction
{
    public function __construct(private FileUploader $uploader) {}

    public function execute(UploadedFile $file): File
    {
        $settings = CertificateSettings::atual();

        return $this->uploader->store(
            ['file' => $file],
            $settings,
            function (StoredFiles $stored) use ($settings): File {
                CertificateSettings::query()->lockForUpdate()->findOrFail($settings->id);

                return $stored->replace($settings, 'file', CertificateSettings::TIPO_FIRMA);
            },
        );
    }
}
