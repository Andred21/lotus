<?php

namespace App\Shared\Support;

use InvalidArgumentException;
use libphonenumber\NumberParseException;
use libphonenumber\PhoneNumberFormat;
use libphonenumber\PhoneNumberUtil;

/**
 * Telefone. Value object no molde do `Rut`: a entrada é normalizada e validada
 * pela `libphonenumber`, e a forma de gravação é a E.164 (`+56912345678`), a
 * mesma que o `PhoneInput` do front entrega (bloco 60, D-P2). Chile é a região
 * padrão, então o número sem `+` é lido como chileno; o de outro país só vale
 * com o código do país.
 */
final class Phone
{
    private function __construct(private readonly string $e164) {}

    /**
     * @throws InvalidArgumentException quando o número não é um telefone válido
     */
    public static function parse(string $raw, string $regiao = 'CL'): self
    {
        $e164 = self::tentar($raw, $regiao);

        if ($e164 === null) {
            throw new InvalidArgumentException(__('shared.rule.phone_invalid'));
        }

        return new self($e164);
    }

    public static function isValid(?string $raw): bool
    {
        return $raw !== null && self::tentar($raw, 'CL') !== null;
    }

    public function e164(): string
    {
        return $this->e164;
    }

    /**
     * O que o mutator grava: vazio vira `null`, válido vira E.164 e o inválido
     * passa INTACTO. O mutator não é a porta da validação (essa é o
     * `ValidPhone`); recusar aqui lançaria exceção em escrita que não veio da
     * API, e apagar o inválido destruiria dado sem trilha.
     */
    public static function normalizar(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        return self::tentar($raw, 'CL') ?? $raw;
    }

    /**
     * Conversão do legado (migration `converte_telefones_para_e164`). Limpa o
     * que a spec manda limpar e lê com Chile como região: o separador, o
     * prefixo `0` de discagem e o `56` repetido; quando o campo traz dois
     * números, vale o primeiro válido. O que não valida vira `null` — o valor
     * antigo fica no `old_values` do audit da escrita, não aqui.
     */
    public static function corrigirLegado(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        foreach (preg_split('/[\/;,|\r\n]+/', $raw) ?: [] as $candidato) {
            foreach (self::variantes($candidato) as $variante) {
                $e164 = self::tentar($variante, 'CL');
                if ($e164 !== null) {
                    return $e164;
                }
            }
        }

        return null;
    }

    /**
     * Do mais fiel ao mais limpo: o número como está (só dígitos e `+` inicial),
     * sem o `0` de discagem e sem o `56` repetido.
     *
     * @return list<string>
     */
    private static function variantes(string $candidato): array
    {
        $comMais = str_starts_with(trim($candidato), '+');
        $digitos = (string) preg_replace('/\D/', '', $candidato);

        if ($digitos === '') {
            return [];
        }

        $variantes = [$digitos];

        if (! $comMais && str_starts_with($digitos, '0')) {
            $variantes[] = substr($digitos, 1);
        }

        $semZero = $variantes[count($variantes) - 1];
        if (str_starts_with($semZero, '5656')) {
            $variantes[] = substr($semZero, 2);
        }

        return array_map(fn (string $d) => ($comMais ? '+' : '').$d, $variantes);
    }

    private static function tentar(string $raw, string $regiao): ?string
    {
        // A lib aceita letra (vanity) e ramal e os descarta no E.164: o número gravado
        // não seria o digitado. Só dígito, `+` e separador de telefone valem.
        if (preg_match('/^[0-9+\s().\-]+$/', $raw) !== 1) {
            return null;
        }

        $util = PhoneNumberUtil::getInstance();

        try {
            $numero = $util->parse($raw, $regiao);
        } catch (NumberParseException) {
            return null;
        }

        return $util->isValidNumber($numero)
            ? $util->format($numero, PhoneNumberFormat::E164)
            : null;
    }
}
