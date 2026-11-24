<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Exceptions\CertificadoRevogadoException;
use App\Domains\Certification\Models\Certificate;
use App\Shared\Support\Rut;
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

    /**
     * Quem confere o certificado no site prova que o conhece: código e RUT do
     * aluno. Toda falha é a MESMA `NotFoundHttpException`, sem mensagem — código
     * inexistente, snapshot sem RUT e RUT diferente não se distinguem de fora.
     *
     * O RUT só é comparado em memória, contra o snapshot congelado: nunca vai
     * ao SQL. A busca é pelo código, que sai do banco por binding.
     *
     * `$ip` espera os limitadores de falha (bloco 61, Task 4).
     *
     * @throws NotFoundHttpException
     */
    public function porCodigoERut(string $codigo, Rut $rut, string $ip): Certificate
    {
        $certificate = Certificate::query()->where('codigo', strtoupper($codigo))->first();

        $rutDoSnapshot = Rut::parse($certificate?->snapshot->aluno->rut ?? '')->canonical();

        // `canonical()` de vazio é '': sem RUT no snapshot nada pode bater.
        if ($certificate === null || $rutDoSnapshot === '' || ! hash_equals($rutDoSnapshot, $rut->canonical())) {
            return $this->recusar();
        }

        return $certificate;
    }

    /** Ponto único da falha da consulta: é onde os limitadores contam. */
    private function recusar(): never
    {
        throw new NotFoundHttpException;
    }
}
