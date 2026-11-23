<?php

namespace Tests\Unit\Shared;

use App\Shared\Support\Phone;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Os casos de `corrigirLegado` saem da medição de produção (bloco 60, Task 1):
 * vazio, só dígitos e com `+`/separador, mais os que a spec manda limpar (prefixo
 * `0`, `56` duplicado, dois números no campo).
 */
class PhoneTest extends TestCase
{
    #[DataProvider('legados')]
    public function test_corrigir_legado(?string $raw, ?string $esperado): void
    {
        $this->assertSame($esperado, Phone::corrigirLegado($raw));
    }

    /** @return array<string, array{0: ?string, 1: ?string}> */
    public static function legados(): array
    {
        return [
            'movel com espaços' => ['+56 9 8765 4321', '+56987654321'],
            'movel só dígitos' => ['987654321', '+56987654321'],
            'movel só dígitos com 56' => ['56987654321', '+56987654321'],
            'fixo Santiago' => ['(2) 2123 4567', '+56221234567'],
            'prefixo 0' => ['0 9 8765 4321', '+56987654321'],
            '56 duplicado' => ['+56 56 9 8765 4321', '+56987654321'],
            '56 duplicado sem mais' => ['56 56 9 8765 4321', '+56987654321'],
            'dois números' => ['9 8765 4321 / 2 2123 4567', '+56987654321'],
            'primeiro inválido, segundo válido' => ['12345 / 9 8765 4321', '+56987654321'],
            'fixo antigo 7 díg.' => ['2123456', null],
            'lixo' => ['12345', null],
            'faixa 91 não alocada (a libphonenumber recusa)' => ['+56 9 1234 5678', null],
            'já E.164' => ['+56987654321', '+56987654321'],
            'estrangeiro' => ['+54 9 11 2345 6789', '+5491123456789'],
            'vazio' => ['', null],
            'nulo' => [null, null],
            'só espaços' => ['   ', null],
        ];
    }

    public function test_normalizar_mantem_invalido_intacto(): void
    {
        $this->assertSame('abc', Phone::normalizar('abc'));
    }

    public function test_normalizar_converte_o_valido_e_devolve_null_para_vazio(): void
    {
        $this->assertSame('+56987654321', Phone::normalizar('9 8765 4321'));
        $this->assertNull(Phone::normalizar(null));
        $this->assertNull(Phone::normalizar(''));
        $this->assertNull(Phone::normalizar('   '));
    }

    public function test_parse_devolve_e164(): void
    {
        $this->assertSame('+56987654321', Phone::parse('9 8765 4321')->e164());
        $this->assertSame('+5491123456789', Phone::parse('+54 9 11 2345 6789')->e164());
    }

    public function test_parse_de_numero_invalido_lanca(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Phone::parse('abc');
    }

    public function test_is_valid(): void
    {
        $this->assertTrue(Phone::isValid('9 8765 4321'));
        $this->assertFalse(Phone::isValid('12345'));
        $this->assertFalse(Phone::isValid('abc'));
        $this->assertFalse(Phone::isValid(null));
        $this->assertFalse(Phone::isValid(''));
    }

    /** Letra e ramal seriam descartados em silêncio na conversão para E.164: o dado mudaria sem trilha. */
    public function test_letra_ou_ramal_no_numero_nao_e_valido(): void
    {
        $this->assertFalse(Phone::isValid('9 8765 4321 ext. 12'));
        $this->assertFalse(Phone::isValid('9 8765 4321 ABC'));
        $this->assertFalse(Phone::isValid('1-800-FLOWERS'));
    }
}
