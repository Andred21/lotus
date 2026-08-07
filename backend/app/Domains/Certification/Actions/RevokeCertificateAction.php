<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RevokeCertificateAction
{
    public function execute(Certificate $certificate, string $reason): Certificate
    {
        return DB::transaction(function () use ($certificate, $reason) {
            $locked = Certificate::query()->lockForUpdate()->findOrFail($certificate->id);

            if ($locked->status === CertificateStatus::Revocado) {
                throw ValidationException::withMessages([
                    'certificate' => 'El certificado ya fue revocado.',
                ]);
            }

            $locked->update([
                'status' => CertificateStatus::Revocado,
                'revoked_at' => now(),
                'revocation_reason' => $reason,
            ]);

            return $locked;
        });
    }
}
