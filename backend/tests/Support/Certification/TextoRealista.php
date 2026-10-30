<?php

namespace Tests\Support\Certification;

/**
 * Texto determinístico para medir o certificado (spec D15). Sem aleatoriedade: a
 * mesma entrada produz sempre o mesmo texto, então o teto medido hoje é o que
 * a matriz reproduz amanhã.
 *
 * - `nome()` — nome de pessoa, curso ou empresa em MAIÚSCULAS espanholas, a pior
 *   realista para a largura (maiúscula é mais larga que caixa mista);
 * - `prosa()` — a descrição do curso, espanhol corrido;
 * - `adversario()` — sem espaço e com um glifo largo: fora do cálculo dos
 *   tetos, só prova que o PDF nunca perde texto. O glifo é parâmetro para cada
 *   campo ter o seu: com o mesmo glifo em todos, o run de um campo curto é
 *   substring do run de um longo, e cortar o curto passaria despercebido.
 */
final class TextoRealista
{
    private const PALAVRAS = [
        'MARÍA', 'JOSÉ', 'CRISTINA', 'ALEJANDRO', 'DE', 'LOS', 'ÁNGELES', 'FERNÁNDEZ', 'VILLALOBOS',
        'SEBASTIÁN', 'ANDRÉS', 'MUÑOZ', 'ALBURQUERQUE', 'ELECTROMECÁNICA', 'INGENIERÍA', 'Y',
        'CONSTRUCCIONES', 'DEL', 'CARMEN', 'RODRÍGUEZ', 'ESPINOZA', 'LA', 'TRANSMISIÓN', 'ENERGÍA',
        'GONZÁLEZ', 'PIZARRO', 'NÚÑEZ', 'SOCIEDAD', 'SERVICIOS', 'MANTENIMIENTO', 'SUBESTACIONES',
        'ALTA', 'TENSIÓN', 'SEGURIDAD', 'OPERACIÓN', 'CAMPOS', 'RIVEROS', 'ILLANES', 'AGUILERA',
    ];

    private const ORACIONES = [
        'El curso entrega las competencias necesarias para ejecutar trabajos en instalaciones eléctricas de alta tensión con criterios de seguridad.',
        'Los participantes revisan la normativa vigente, los procedimientos de bloqueo y señalización, y las distancias mínimas de aproximación.',
        'Se desarrollan ejercicios prácticos supervisados sobre equipos reales, con análisis de riesgos antes de cada maniobra.',
        'La evaluación considera una prueba teórica y una demostración práctica individual de los procedimientos aprendidos.',
        'Al finalizar, el trabajador reconoce los peligros asociados a la energía eléctrica y aplica las medidas de control correspondientes.',
        'Además se abordan la selección y el mantenimiento de los elementos de protección personal y de las herramientas aislantes.',
    ];

    /**
     * Nome em MAIÚSCULAS com exatamente `$chars` caracteres, sem espaço nas pontas.
     *
     * `$passo` é de quantas em quantas palavras do corpus o nome anda (coprimo de 39,
     * o tamanho do corpus, para passar por todas). Passos diferentes dão sequências
     * diferentes de palavras: nenhum nome é substring de outro, mesmo com o mais
     * curto sendo um prefixo do mais longo.
     */
    public static function nome(int $chars, int $passo = 1): string
    {
        $palavras = [];

        for ($i = 0; $i < count(self::PALAVRAS); $i++) {
            $palavras[] = self::PALAVRAS[($i * $passo) % count(self::PALAVRAS)];
        }

        return self::ciclar($palavras, $chars, 'A');
    }

    /** Espanhol corrido com exatamente `$chars` caracteres. */
    public static function prosa(int $chars): string
    {
        return self::ciclar(self::ORACIONES, $chars, '.');
    }

    /** Uma "palavra" só, de glifo largo: nenhum ponto de quebra natural. */
    public static function adversario(int $chars, string $glifo = 'W'): string
    {
        return str_repeat($glifo, $chars);
    }

    /**
     * @param  list<string>  $unidades
     * @param  string  $fecho  o que entra no lugar de um espaço que cairia na última posição
     */
    private static function ciclar(array $unidades, int $chars, string $fecho): string
    {
        $texto = '';

        for ($i = 0; mb_strlen($texto) < $chars; $i++) {
            $texto .= $unidades[$i % count($unidades)].' ';
        }

        $texto = mb_substr($texto, 0, $chars);

        return mb_substr($texto, -1) === ' '
            ? mb_substr($texto, 0, $chars - 1).$fecho
            : $texto;
    }
}
