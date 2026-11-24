<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Exceptions\CertificadoRevogadoException;
use App\Domains\Certification\Models\Certificate;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Quem pode obter o certificado pelas rotas públicas do QR (bloco 61).
 *
 * Uma porta só por rota: cada acesso público declara aqui o que o certificado
 * precisa ser para sair.
 */
class PublicCertificateAccess
{
    /**
     * O PDF baixa para o vigente e para o vencido (a validade é informação do
     * documento, não bloqueio); o revogado é recusado.
     *
     * @throws NotFoundHttpException uuid inexistente
     * @throws CertificadoRevogadoException
     */
    public function paraDownload(string $uuid): Certificate
    {
        $certificate = Certificate::query()->firstWhere('uuid', $uuid)
            ?? throw new NotFoundHttpException;

        if ($certificate->status === CertificateStatus::Revocado) {
            throw new CertificadoRevogadoException;
        }

        return $certificate;
    }
}
