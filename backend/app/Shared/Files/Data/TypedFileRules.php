<?php

namespace App\Shared\Files\Data;

use App\Shared\Files\TipoDeArquivo;
use BackedEnum;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

/**
 * As regras de um anexo tipado (`type` + `file` + `valid_until`). A política de
 * conteúdo segue vindo do `ContentClass` do tipo; aqui só se decide QUANDO ela
 * entra: tipo inválido nunca manda bytes ao ClamAV.
 */
final class TypedFileRules
{
    /**
     * @param  array<string, mixed>  $payload
     * @param  class-string<BackedEnum&TipoDeArquivo>  $enum
     * @param  array<int, string>|null  $permitidos
     * @return array<string, list<mixed>>
     */
    public static function for(array $payload, string $enum, ?array $permitidos = null, bool $comValidade = false): array
    {
        $valor = $payload['type'] ?? null;
        $tipo = is_string($valor) || is_int($valor) ? $enum::tryFrom($valor) : null;
        $permitido = $tipo !== null && ($permitidos === null || in_array($tipo->value, $permitidos, true));

        $regras = [
            'type' => $permitidos === null ? ['required', new Enum($enum)] : ['required', Rule::in($permitidos)],
            'file' => $permitido ? $tipo->conteudo()->regras() : ['required'],
        ];

        if ($comValidade) {
            $regras['valid_until'] = $permitido && $tipo->aceitaValidade() ? ['nullable', 'date'] : ['prohibited'];
        }

        return $regras;
    }
}
