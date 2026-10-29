<?php

namespace App\Shared\Files\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

/**
 * Largura mínima, em pixels, de uma imagem enviada. Lê só o cabeçalho por
 * `getimagesize()` (não depende da extensão GD): a assinatura do certificado é
 * impressa e uma imagem estreita sai pixelada (spec D1 do bloco 40).
 *
 * Roda DEPOIS das regras de tipo e tamanho (o `bail` do `ContentClass`), então
 * só chega aqui um arquivo que o conteúdo já provou ser imagem aceita.
 */
final class LarguraMinimaDeImagem implements ValidationRule
{
    public function __construct(private readonly int $minimoPx) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            return;
        }

        $medidas = @getimagesize((string) $value->getRealPath());

        if ($medidas === false) {
            $fail(__('shared.file.image_unreadable'));

            return;
        }

        if ($medidas[0] < $this->minimoPx) {
            $fail(__('shared.file.image_too_narrow', ['min' => $this->minimoPx, 'width' => $medidas[0]]));
        }
    }
}
