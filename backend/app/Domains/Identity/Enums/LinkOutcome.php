<?php

namespace App\Domains\Identity\Enums;

/** Resultado de StudentClientLinkService::link(). */
enum LinkOutcome
{
    case AlreadyLinked;  // já vinculado ao mesmo cliente — no-op
    case Linked;         // primeiro vínculo do aluno
    case Moved;          // fechou o vínculo anterior e abriu outro
}
