<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Entrada de `POST /api/password/forgot`. */
#[TypeScript]
class ForgotPasswordData extends Data
{
    public function __construct(public string $email) {}

    /** @return array<string,array<int,string>> */
    public static function rules(): array
    {
        return ['email' => ['required', 'email']];
    }
}
