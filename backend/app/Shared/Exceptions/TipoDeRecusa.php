<?php

namespace App\Shared\Exceptions;

/**
 * O tipo da recusa que um domínio pode emitir, e o único lugar que traduz
 * recusa em HTTP.
 *
 * Antes deste enum a tradução estava em quatro exceções de domínio (cada uma
 * fixando `new self(422|403, ...)`) mais o `isForbidden()` do
 * `ProblemDetails`, que precisava farejar o status de volta para escolher o
 * título. O domínio decidia o transporte e o envelope adivinhava.
 *
 * `tituloChave()` e `tipoUri()` moram aqui, e não no `ProblemDetails`, porque
 * é o que mantém o par status/título indivisível: os valores abaixo são
 * exatamente os que os braços antigos produziam, e mudá-los muda contrato
 * afirmado por teste de endpoint.
 */
enum TipoDeRecusa
{
    /** Regra de negócio recusou a operação. */
    case RegraDeNegocio;

    /** A ação é proibida para quem a pediu. */
    case AcaoProibida;

    public function status(): int
    {
        return match ($this) {
            self::RegraDeNegocio => 422,
            self::AcaoProibida => 403,
        };
    }

    public function tituloChave(): string
    {
        return match ($this) {
            self::RegraDeNegocio => 'problem.title.http',
            self::AcaoProibida => 'problem.title.forbidden',
        };
    }

    public function tipoUri(): string
    {
        return match ($this) {
            self::RegraDeNegocio => 'https://lotus.cl/errors/http',
            self::AcaoProibida => 'https://lotus.cl/errors/forbidden',
        };
    }
}
