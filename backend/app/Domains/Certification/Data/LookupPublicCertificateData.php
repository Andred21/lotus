<?php

namespace App\Domains\Certification\Data;

use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Data;

/**
 * Entrada da consulta pública por código + RUT (bloco 61). Só entrada: não vai
 * ao TypeScript e não tem default literal (o RUT que não veio não é "vazio").
 *
 * Mora aqui a prova de formato: pedido fora do formato é 422 e nunca chega à
 * tabela de certificados.
 */
class LookupPublicCertificateData extends Data
{
    public function __construct(
        public string $codigo,
        public string $rut,
    ) {}

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'codigo' => ['required', 'string', 'max:20', 'regex:/^LOT-\d{4}-\d{1,9}$/i'],
            'rut' => ['required', 'string', 'max:20', new ValidRut],
        ];
    }
}
