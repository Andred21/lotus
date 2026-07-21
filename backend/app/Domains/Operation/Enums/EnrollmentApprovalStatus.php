<?php

namespace App\Domains\Operation\Enums;

enum EnrollmentApprovalStatus: string
{
    case Pendiente = 'pendiente';
    case Aprobado = 'aprobado';
    case Reprobado = 'reprobado';
}
