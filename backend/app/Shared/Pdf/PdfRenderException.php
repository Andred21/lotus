<?php

namespace App\Shared\Pdf;

use RuntimeException;

/**
 * Falha do conversor; sem tratamento sobe como 500 e ninguém inventa PDF vazio (§5.4).
 * No lote, `batchFailed` nomeia os códigos (`failedKeys`); o ZIP a converte em 503, pois o
 * conversor é que caiu.
 */
class PdfRenderException extends RuntimeException
{
    public static function converterFailed(int $status): self
    {
        return new self("O conversor de PDF falhou ao converter o documento (HTTP {$status}).");
    }

    /** O conversor nem respondeu (conexão recusada, caiu ou estourou o tempo). */
    public static function converterUnreachable(?\Throwable $cause = null): self
    {
        return new self(
            'O conversor de PDF não respondeu ao converter o documento: '.($cause?->getMessage() ?? 'sem resposta'),
            previous: $cause,
        );
    }

    /**
     * Lote que não fechou: nomeia os documentos que falharam mesmo depois da
     * nova tentativa. Quem pede o lote precisa saber QUAIS, não só que falhou.
     *
     * @param  list<string>  $keys
     */
    public static function batchFailed(array $keys): self
    {
        return new self(
            'O conversor de PDF falhou, mesmo depois de uma nova tentativa, em: '.implode(', ', $keys).'.',
            failedKeys: $keys,
        );
    }

    /**
     * Quem falhou num lote, para o caller montar a recusa na língua do
     * usuário: a mensagem desta exceção é diagnóstico, não texto de tela.
     *
     * @param  list<string>  $failedKeys
     */
    public function __construct(
        string $message = '',
        public readonly array $failedKeys = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}
