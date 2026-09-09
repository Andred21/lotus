<?php

namespace App\Domains\Identity\Data;

use App\Domains\Commercial\Models\Client;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Empresa reduzida ao que o dropdown do create de aluno precisa: id e razón
 * social.
 *
 * Identity ler `Commercial\Models\Client` não é acoplamento novo — `Student`,
 * `User`, `CreateStudentAction`, `StudentResolver`, `StudentResolution`,
 * `StudentClientLinkService` e `StudentClientLog` já leem. O que é novo é o
 * gate: o lookup responde a `identity.user.create`, e não a
 * `commercial.client.view` (D-11).
 */
#[TypeScript]
class StudentClientOptionData extends Data
{
    public function __construct(
        public int $id,
        public string $legal_name,
    ) {}

    public static function fromModel(Client $client): self
    {
        return new self(id: $client->id, legal_name: $client->legal_name);
    }
}
