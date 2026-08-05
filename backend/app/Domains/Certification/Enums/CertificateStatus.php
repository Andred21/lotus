<?php

namespace App\Domains\Certification\Enums;

enum CertificateStatus: string
{
    case Emitido = 'emitido';
    case Revocado = 'revocado';
}
