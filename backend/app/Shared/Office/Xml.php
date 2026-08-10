<?php

namespace App\Shared\Office;

/**
 * Escape para dentro de um pacote OOXML.
 *
 * Existe porque o `{{ }}` do Blade escapa para HTML: cobre `& < > " '` e para
 * aí. Caractere de controle é ILEGAL em XML 1.0 (§2.2) e não vem de ataque —
 * vem de colar texto de planilha num nome de cliente. O estrago não é uma
 * célula errada: é o pacote inteiro recusado pelo leitor, sem aviso.
 */
final class Xml
{
    public static function text(?string $value): string
    {
        // Sequência UTF-8 inválida faz `preg_replace` com `/u` devolver null;
        // a normalização vem antes por isso, não por elegância.
        $utf8 = mb_convert_encoding((string) $value, 'UTF-8', 'UTF-8');

        $clean = preg_replace(
            '/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u',
            '',
            $utf8,
        );

        return htmlspecialchars((string) $clean, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    /**
     * Quebra de linha só existe em OOXML como `<w:br/>` — e `<w:br/>` é IRMÃO
     * de `<w:t>`, nunca filho: `CT_Text` é tipo simples e não aceita elemento
     * dentro. Por isso o separador fecha e reabre o `<w:t>`: a diretiva se usa
     * DENTRO de `<w:t xml:space="preserve">`, e o resultado continua válido
     * contra o schema, não só bem-formado.
     */
    public static function lines(?string $value): string
    {
        $lines = preg_split('/\R/u', (string) $value) ?: [];

        return implode(
            '</w:t><w:br/><w:t xml:space="preserve">',
            array_map(self::text(...), $lines),
        );
    }
}
