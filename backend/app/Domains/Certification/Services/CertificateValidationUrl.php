<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Exceptions\ValidacaoDeCertificadoNaoConfigurada;
use App\Domains\Certification\Models\Certificate;

/**
 * Dono único do endereço que vai no QR do certificado (P-79, spec D3 do item 29).
 *
 * O QR era `FRONTEND_URL + /validar/{uuid}`. `FRONTEND_URL` é infra — muda com
 * o host, o DNS e o TLS —, e a cópia distribuída do PDF é imutável: um
 * certificado baixado na fase sem DNS carregaria o EIP cru para sempre. A regra
 * que proibia isso era de procedimento (runbook §7), e dependia de quem opera
 * lembrar.
 *
 * - Fora de produção, a chave vazia cai no `frontend_url`: dev e teste não
 *   precisam dela.
 * - Em produção ela é obrigatória e https, e NÃO herda o `frontend_url`.
 *   Ausente ou `http://`, `base()` lança — no PDF e antes da emissão.
 */
class CertificateValidationUrl
{
    public function base(): string
    {
        $chave = trim((string) config('app.certificate_validation_url'));

        if (app()->isProduction()) {
            if (! str_starts_with($chave, 'https://')) {
                throw ValidacaoDeCertificadoNaoConfigurada::emProducao();
            }

            return rtrim($chave, '/');
        }

        return rtrim($chave !== '' ? $chave : (string) config('app.frontend_url'), '/');
    }

    public function para(Certificate $certificate): string
    {
        return $this->base()."/validar/{$certificate->uuid}";
    }
}
