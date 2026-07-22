<?php

namespace App\Domains\Operation\Data;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Services\StudentLookup;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Preview de matrícula (não-mutante): o front pergunta pelo RUT antes de matricular
 * e, se o aluno já pertence a OUTRO cliente, confirma a troca (RN-10; 6c move em
 * silêncio, o front "deve avisar"). will_move e previous_client são derivados aqui
 * contra o cliente da turma — o StudentLookup (Identity) não conhece a turma.
 */
#[TypeScript]
class EnrollPreviewData extends Data
{
    public function __construct(
        public bool $exists,
        public ?string $name,
        public string $rut,
        public ?string $current_client,
        public bool $will_move,
        public ?string $previous_client,
    ) {}

    public static function fromLookup(StudentLookup $lookup, Client $turmaClient): self
    {
        if (! $lookup->exists) {
            return new self(false, null, $lookup->formattedRut, null, false, null);
        }

        $student = $lookup->student;
        $current = $student->currentClient;
        $currentName = $current?->legal_name;
        $willMove = $current !== null && $current->id !== $turmaClient->id;

        return new self(
            exists: true,
            name: $student->user->name,
            rut: $lookup->formattedRut,
            current_client: $currentName,
            will_move: $willMove,
            previous_client: $willMove ? $currentName : null,
        );
    }
}
