<?php

namespace App\Domains\Certification\Services;

use App\Domains\Operation\Models\Turma;

/**
 * Cidade de emissão do documento — fonte única da regra (bloco 39 D2). A turma
 * presencial manda pelo `local_aplicacao`; a online cai para a cidade do
 * emissor (`app.certificate_issuer.city`) — **nunca** para o endereço do
 * cliente (D12) e, desde o bloco 39, nunca para o template do curso.
 *
 * A emissão recusa por aqui (porta 4) e o painel de emissão reporta
 * `sin_ciudad` por aqui, senão a tela promete um certificado que o POST recusa
 * com 422.
 */
class EmissionCityResolver
{
    /** A cidade configurada, aparada, ou `null` quando vazia ou só com espaços. */
    public function issuerCity(): ?string
    {
        $city = config('app.certificate_issuer.city');

        if (! is_string($city)) {
            return null;
        }

        $city = trim($city);

        return $city === '' ? null : $city;
    }

    public function emissionCityFor(Turma $turma): ?string
    {
        if ($turma->local_aplicacao !== null) {
            return $turma->local_aplicacao;
        }

        return $this->issuerCity();
    }
}
