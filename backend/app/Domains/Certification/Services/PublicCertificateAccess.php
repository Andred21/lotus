<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Exceptions\CertificadoRevogadoException;
use App\Domains\Certification\Models\Certificate;
use App\Shared\RateLimiting\RateLimits;
use App\Shared\Support\Rut;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\RateLimiter;
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
     * Antes de qualquer query, os limitadores de FALHA (por IP e por RUT, a hora)
     * recusam com 429. Só a falha conta; o acerto nunca toca contador nem zera
     * um que já subiu. Não há bloqueio por código: travá-lo deixaria qualquer um
     * derrubar a consulta de um certificado alheio.
     *
     * @throws NotFoundHttpException
     * @throws ThrottleRequestsException
     */
    public function porCodigoERut(string $codigo, Rut $rut, string $ip): Certificate
    {
        $chaveIp = RateLimits::chaveDeFalhaPorIp($ip);
        $chaveRut = RateLimits::chaveDeFalhaPorRut($rut);

        $this->recusarSeEstourou($chaveIp, RateLimits::FALHAS_CONSULTA_POR_IP, $chaveRut, RateLimits::FALHAS_CONSULTA_POR_RUT);

        $certificate = Certificate::query()->where('codigo', strtoupper($codigo))->first();

        $rutDoSnapshot = Rut::parse($certificate?->snapshot->aluno->rut ?? '');

        if ($certificate === null || ! $this->comparavel($rutDoSnapshot) || ! hash_equals($rutDoSnapshot->canonical(), $rut->canonical())) {
            $this->recusar($chaveIp, $chaveRut);
        }

        return $certificate;
    }

    /**
     * O lado guardado só entra na comparação se for um RUT de verdade: sem RUT,
     * DV errado ou número só de zeros não casa com nada. Sem isso, `"0"` no
     * snapshot teria o mesmo `canonical()` do pedido `0-0`, que passa no `ValidRut`.
     */
    private function comparavel(Rut $rutDoSnapshot): bool
    {
        return $rutDoSnapshot->isValid() && ltrim($rutDoSnapshot->number, '0') !== '';
    }

    /** @throws ThrottleRequestsException com `Retry-After` do mais longo dos baldes estourados */
    private function recusarSeEstourou(string $chaveIp, int $maxIp, string $chaveRut, int $maxRut): void
    {
        $esperas = [];
        foreach ([$chaveIp => $maxIp, $chaveRut => $maxRut] as $chave => $max) {
            if (RateLimiter::tooManyAttempts($chave, $max)) {
                $esperas[] = RateLimiter::availableIn($chave);
            }
        }

        if ($esperas !== []) {
            throw new ThrottleRequestsException(headers: ['Retry-After' => max($esperas)]);
        }
    }

    /** Ponto único da falha da consulta: é onde os limitadores contam. */
    private function recusar(string $chaveIp, string $chaveRut): never
    {
        RateLimiter::hit($chaveIp, RateLimits::JANELA_FALHAS_CONSULTA);
        RateLimiter::hit($chaveRut, RateLimits::JANELA_FALHAS_CONSULTA);

        throw new NotFoundHttpException;
    }
}
