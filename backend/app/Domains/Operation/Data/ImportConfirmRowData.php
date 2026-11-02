<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Uma linha da confirmação: SÓ o que o admin digitou e a escolha Mantener/
 * Actualizar (D13). Classificação, cliente atual e divergência não entram: o
 * servidor recalcula tudo, e qualquer chave extra do navegador é ignorada.
 *
 * `rut` e `name` chegam como `present`, e não `required`: o middleware troca
 * "" por null e o `required` derrubaria o lote inteiro com 422. Linha sem nome
 * ou sem RUT é erro DAQUELA linha (D13/D17), decidido pelo `StudentResolver`.
 */
#[TypeScript]
class ImportConfirmRowData extends Data
{
    public function __construct(
        public int $row,
        public string $rut,
        public string $name,
        public ?string $email = null,
        public ?string $phone = null,
        public bool $update_registration = false,
    ) {}

    public static function rules(): array
    {
        return [
            'row' => ['required', 'integer', 'min:2'],
            'rut' => ['present', 'nullable', 'string'],
            'name' => ['present', 'nullable', 'string'],
            'email' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'update_registration' => ['sometimes', 'boolean'],
        ];
    }

    /** @param  array<string,mixed>  $properties */
    public static function prepareForPipeline(array $properties): array
    {
        $properties['rut'] = (string) ($properties['rut'] ?? '');
        $properties['name'] = (string) ($properties['name'] ?? '');

        return $properties;
    }
}
