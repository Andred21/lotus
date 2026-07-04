<?php

namespace App\Data;

use Illuminate\Http\Request;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class SessionUserData extends Data
{
    public function __construct(
        public int $id,
        public string $uuid,
        public string $name,
        public string $email,
        public string $type,
        public bool $is_active,
    ) {}

    /**
     * O default de spatie/laravel-data responde 201 a POST (semântica de
     * "recurso criado"). Login/me não criam recurso, então força 200.
     */
    protected function calculateResponseStatus(Request $request): int
    {
        return 200;
    }
}
