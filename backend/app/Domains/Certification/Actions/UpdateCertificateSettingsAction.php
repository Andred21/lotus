<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Data\CertificateSettingsData;
use App\Domains\Certification\Models\CertificateSettings;
use Illuminate\Support\Facades\DB;

/** Grava nome e cargo da gerente. A auditoria sai do `Auditable` do model. */
class UpdateCertificateSettingsAction
{
    public function execute(CertificateSettings $settings, CertificateSettingsData $data): CertificateSettings
    {
        return DB::transaction(function () use ($settings, $data) {
            $settings->update([
                'manager_name' => $data->manager_name,
                'manager_title' => $data->manager_title,
            ]);

            return $settings;
        });
    }
}
