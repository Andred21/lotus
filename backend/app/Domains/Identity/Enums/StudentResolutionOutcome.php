<?php

namespace App\Domains\Identity\Enums;

/** Resultado de StudentResolver::resolveByRut() — o que a importação (6c) reporta. */
enum StudentResolutionOutcome
{
    case Created;        // aluno novo criado e matriculado
    case AlreadyLinked;  // aluno já existente, mesmo cliente
    case Moved;          // aluno movido de outro cliente (ver previousClient)
}
