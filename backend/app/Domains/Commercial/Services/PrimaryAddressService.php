<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Models\Client;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * "No máximo 1 endereço principal por cliente". A regra inteira vive na
 * `PrimaryCollectionService`; aqui fica só qual coleção é a coleção.
 *
 * O parâmetro `winner` da base nasceu por causa desta entidade: a rota nested de
 * endereço já existia (`ClientAddressController`, `5bc1d87`, anterior ao
 * serviço) e, sem ele, um PUT que marca um endereço menos recente como principal
 * seria sobrescrito pelo "último por id" — o usuário veria o endereço errado
 * como principal, em silêncio.
 */
class PrimaryAddressService extends PrimaryCollectionService
{
    protected function collection(Client $client): HasMany
    {
        return $client->addresses();
    }
}
