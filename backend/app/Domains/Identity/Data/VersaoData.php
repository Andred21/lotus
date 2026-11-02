<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Versão da plataforma em execução (X.Y.Z), lida de `config('app.version')`.
 * Só SAÍDA — exposta apenas a usuário autenticado (`GET /api/versao`).
 */
#[TypeScript]
class VersaoData extends Data
{
    public function __construct(
        public string $versao,
    ) {}

    public static function fromConfig(): self
    {
        return new self(versao: (string) config('app.version'));
    }
}
