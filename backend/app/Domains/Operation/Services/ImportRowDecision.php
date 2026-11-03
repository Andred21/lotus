<?php

namespace App\Domains\Operation\Services;

use App\Domains\Identity\Services\StudentIdentity;
use App\Domains\Identity\Services\StudentLookup;
use App\Domains\Operation\Data\ImportConfirmRowData;
use App\Domains\Operation\Enums\ImportField;
use App\Domains\Operation\Enums\ImportRowStatus;

/**
 * O veredito do `ImportRowClassifier` para UMA linha: o que a prévia mostra e o
 * que a confirmação executa leem daqui, nunca recalculam.
 *
 * `refusal` recusa a linha inteira (status `Error`); `updateRefusal` recusa só o
 * *Actualizar* de uma linha de aluno cadastrado, que segue matriculável com o
 * cadastro como está. `identity` é o que a execução usa: a linha validada no
 * aluno novo, o cadastro no `Registered`/`Moves`/`AlreadyEnrolled` (neste último
 * nada é reservado, D4). `updatedIdentity` é o que o *Actualizar* gravaria, e só
 * existe quando ele não foi recusado.
 */
final readonly class ImportRowDecision
{
    /** @param  list<ImportField>  $divergent */
    public function __construct(
        public ImportConfirmRowData $line,
        public ImportRowStatus $status,
        public ?string $refusal = null,
        public ?string $updateRefusal = null,
        public ?StudentLookup $lookup = null,
        public ?StudentIdentity $identity = null,
        public ?StudentIdentity $updatedIdentity = null,
        public array $divergent = [],
    ) {}

    public function rowRefused(): bool
    {
        return $this->status === ImportRowStatus::Error;
    }

    public function updateRefused(): bool
    {
        return $this->wantsUpdate() && $this->updateRefusal !== null;
    }

    public function updates(): bool
    {
        return $this->wantsUpdate() && $this->updateRefusal === null;
    }

    /** Aluno cadastrado que ainda não está matriculado nesta turma: `Registered` ou `Moves` (D4). */
    public function isRegistered(): bool
    {
        return $this->status === ImportRowStatus::Registered || $this->status === ImportRowStatus::Moves;
    }

    /** Flag ligada e linha de aluno cadastrado que ainda não está matriculado (D4). */
    private function wantsUpdate(): bool
    {
        return $this->line->update_registration && $this->isRegistered();
    }
}
