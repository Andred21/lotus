<?php

namespace App\Domains\Identity\Data;

use App\Shared\Data\ComputedFields;
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
     * própria. `missing`, não `prohibited`: `validateProhibited` é
     * `! validateRequired` (vendor `ValidatesAttributes.php`), então o campo
     * presente mas vazio (`null`, `''`, `[]`) passava com 200 silencioso.
     * `missing` reprova a mera presença da chave — 422 nomeando o campo
     * (spec D8) para qualquer payload forjado.
     *
     * Chave sem propriedade correspondente FUNCIONA e não é acidente:
     * `DataValidationRulesResolver::applyOverwrittenRules` itera as chaves
     * devolvidas por `rules()` e as adiciona ao ruleset sem checar se existe
     * propriedade com esse nome.
     */
    public static function rules(): array
    {
        return [
            ...ComputedFields::rejected('photo_url'),
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['missing'],
            'rut' => ['missing'],
            'type' => ['missing'],
            'is_active' => ['missing'],
            'roles' => ['missing'],
            'permissions' => ['missing'],
        ];
    }
}
