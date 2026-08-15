<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Entrada do `PUT /api/profile`. É a superfície self-service INTEIRA de campos
 * de texto: nome e telefone (Drive §3). Foto tem rota própria; senha também.
 */
#[TypeScript]
class ProfileUpdateData extends Data
{
    public function __construct(
        public string $name,
        /**
         * `Optional`, não `?string = null`: campo de escrita com default
         * não-`Optional` rebaixa dado em silêncio no PUT parcial
         * (`.claude/rules/generated-types.md`). Ausente = não mexe;
         * `null` explícito = apaga.
         */
        public string|Optional|null $phone = new Optional,
    ) {}

    /**
     * Os seis campos vetados pelo Drive §3 mais `photo_url`, que tem rota
     * própria. `prohibited` faz o payload forjado devolver 422 nomeando o
     * campo (spec D8) em vez de ser ignorado em silêncio.
     *
     * Chave sem propriedade correspondente FUNCIONA e não é acidente:
     * `DataValidationRulesResolver::applyOverwrittenRules` itera as chaves
     * devolvidas por `rules()` e as adiciona ao ruleset sem checar se existe
     * propriedade com esse nome.
     */
    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['prohibited'],
            'rut' => ['prohibited'],
            'type' => ['prohibited'],
            'is_active' => ['prohibited'],
            'roles' => ['prohibited'],
            'permissions' => ['prohibited'],
            'photo_url' => ['prohibited'],
        ];
    }
}
