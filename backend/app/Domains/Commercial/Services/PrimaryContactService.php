<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Models\Client;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * "No máximo 1 contato principal por cliente". A regra inteira vive na
 * `PrimaryCollectionService`; aqui fica só qual coleção é a coleção.
 *
 * Continua sendo uma classe própria (e não a base injetada com um parâmetro)
 * porque é assim que as Actions a recebem pelo container, uma por entidade.
 */
class PrimaryContactService extends PrimaryCollectionService
{
    protected function collection(Client $client): HasMany
    {
        return $client->contacts();
    }
}
