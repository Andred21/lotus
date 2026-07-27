<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\StudentClientLog;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Uma linha do histórico de vínculo aluno↔cliente (RN-10). Só saída: o log é
 * append-only e escrito exclusivamente pelo StudentClientLinkService.
 * `ended_on` nulo = vínculo vigente.
 */
#[TypeScript]
class StudentClientLogData extends Data
{
    public function __construct(
        public int $id,
        public int $client_id,
        public string $client_name,
        public string $started_on,
        public ?string $ended_on,
    ) {}

    public static function fromModel(StudentClientLog $log): self
    {
        return new self(
            id: $log->id,
            client_id: $log->client_id,
            client_name: $log->client->legal_name,
            started_on: $log->started_on->toDateString(),
            ended_on: $log->ended_on?->toDateString(),
        );
    }
}
