<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Models\CertificateSettings;
use App\Shared\Files\Models\File;
use Illuminate\Support\Facades\DB;

/** Remove a assinatura da gerente: soft-delete do metadado, o binário fica no bucket (rastreável). */
class RemoveManagerSignatureAction
{
    public function execute(): void
    {
        DB::transaction(function () {
            $settings = CertificateSettings::query()->lockForUpdate()->firstOrFail();

            $settings->firmas()->get()->each(fn (File $firma) => $firma->delete());
        });
    }
}
