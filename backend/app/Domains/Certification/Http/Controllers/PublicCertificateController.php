<?php

namespace App\Domains\Certification\Http\Controllers;

use App\Domains\Certification\Data\PublicCertificateData;
use App\Domains\Certification\Models\Certificate;
use App\Http\Controllers\Controller;

class PublicCertificateController extends Controller
{
    public function show(string $uuid): PublicCertificateData
    {
        $certificate = Certificate::query()->firstWhere('uuid', $uuid);

        if ($certificate === null) {
            abort(404);
        }

        return PublicCertificateData::fromModel($certificate);
    }
}
