<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Models\CertificateSettings;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Sobe ou troca a assinatura da gerente. Mesmo molde do
 * `StoreRedatorDocumentAction`: o binário vai ao disco ANTES da transação (um
 * rollback dentro dela deixaria objeto sem linha), a linha única é travada
 * para duas trocas simultâneas não deixarem duas assinaturas vigentes, e a
 * anterior é soft-deletada por instância (o builder não dispara a auditoria).
 */
class StoreManagerSignatureAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(UploadedFile $file): File
    {
        $settings = CertificateSettings::atual();
        $meta = $this->uploads->metadataOf($file);
        $path = $this->uploads->put($settings, $file);

        try {
            return DB::transaction(function () use ($settings, $path, $meta) {
                CertificateSettings::query()->lockForUpdate()->findOrFail($settings->id);

                $settings->firmas()->get()->each(fn (File $antiga) => $antiga->delete());

                return $this->uploads->register($settings, $path, $meta, CertificateSettings::TIPO_FIRMA);
            });
        } catch (Throwable $e) {
            $this->uploads->discard($path);

            throw $e;
        }
    }
}
