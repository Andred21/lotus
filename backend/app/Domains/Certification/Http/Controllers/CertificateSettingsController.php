<?php

namespace App\Domains\Certification\Http\Controllers;

use App\Domains\Certification\Actions\RemoveManagerSignatureAction;
use App\Domains\Certification\Actions\StoreManagerSignatureAction;
use App\Domains\Certification\Actions\UpdateCertificateSettingsAction;
use App\Domains\Certification\Data\CertificateSettingsData;
use App\Domains\Certification\Models\CertificateSettings;
use App\Http\Controllers\Controller;
use App\Shared\Files\ContentClass;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/** Configuración › Certificados (spec D3). Só o superadmin, por `certification.settings.manage`. */
class CertificateSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:certification.settings.manage'),
        ];
    }

    public function show(): CertificateSettingsData
    {
        return CertificateSettingsData::fromModel(CertificateSettings::atual());
    }

    public function update(CertificateSettingsData $data, UpdateCertificateSettingsAction $action): CertificateSettingsData
    {
        return CertificateSettingsData::fromModel($action->execute(CertificateSettings::atual(), $data));
    }

    public function storeSignature(Request $request, StoreManagerSignatureAction $action): CertificateSettingsData
    {
        $request->validate(['file' => ContentClass::Assinatura->regras()]);

        $action->execute($request->file('file'));

        return CertificateSettingsData::fromModel(CertificateSettings::atual());
    }

    public function destroySignature(RemoveManagerSignatureAction $action): CertificateSettingsData
    {
        $action->execute();

        return CertificateSettingsData::fromModel(CertificateSettings::atual());
    }
}
