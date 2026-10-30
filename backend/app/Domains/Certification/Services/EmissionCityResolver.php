<?php

namespace App\Domains\Certification\Services;

use App\Domains\Operation\Models\Turma;

/**
 * Cidade de emissão — fonte única da regra.
 *
 * Duas perguntas, duas respostas (bloco 40, D9/D12):
 * - `issuerCity()` é a cidade que o certificado IMPRIME ("En Santiago, a…") e a
 *   única que a porta 4 e o `SinCiudad` do painel consultam. É lida na hora de
 *   renderizar, nunca do snapshot.
 * - `emissionCityFor()` é o que o SNAPSHOT grava em `ciudad_emision`: o
 *   `local_aplicacao` da turma presencial, ou a do emissor. O snapshot é
 *   imutável e não mudou, mas o PDF já não lê esse campo.
 *
 * **Nunca** o endereço do cliente (D12 do bloco 39) nem o template do curso.
 *
 * A emissão recusa por `issuerCity()` (porta 4) e o painel de emissão reporta
 * `sin_ciudad` pelo mesmo método, senão a tela promete um certificado que o POST
 * recusa com 422.
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
