<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\TestCase;
use Tests\Support\ScansPhpSource;

/**
 * P-59, spec D1 do item 29: data de calendário sai do `FusoDoNegocio`.
 *
 * O servidor roda em UTC, e `today()` ou `now()->toDateString()` devolvem o
 * dia de Londres — um dia adiantado das 21h à meia-noite de Santiago. O
 * certificado congelou esse dia no snapshot até o item 29.
 *
 * Limite conhecido, escrito para não ser descoberto de novo: a catraca lê
 * GRAFIA. `$now = now();` numa linha e `$now->year` noutra passam por ela — é
 * exatamente a forma do defeito da `IssueCertificateAction`, e quem o guarda
 * é o comportamento (`IssueCertificateTest`, os dois testes de Santiago).
 *
 * O avesso também reprova (review Q-2 do item 29): `FusoDoNegocio::agora()`
 * atribuído a coluna `*_at`. O Eloquent grava a hora de parede do Carbon sem
 * convertê-la, e o instante sairia 3 a 4 horas errado. Mesmo limite de
 * grafia: passar por variável escapa.
 */
class DataDeCalendarioTest extends TestCase
{
    use ScansPhpSource;

    /** Único arquivo de `app/` autorizado a ler o relógio para derivar data. */
    private const DONO = 'Shared/Support/FusoDoNegocio.php';

    /** @var array<string, string> grafia proibida => regex */
    private const GRAFIAS = [
        'today()' => '/(?<![\w$>:])today\s*\(/',
        'Carbon::today()' => '/\b(?:Carbon|CarbonImmutable)::today\s*\(/',
        'now() projetado em data' => '/(?:(?<![\w$>:])now|\b(?:Carbon|CarbonImmutable)::now)\s*\(\s*\)(?:\s*->\s*(?:copy|add\w*|sub\w*)\s*\([^()]*\))*\s*->\s*(?:toDateString|startOfDay|endOfDay)\s*\(/',
        'agora() gravado como instante' => '/_at[\'"]?\s*(?:=>|=)\s*FusoDoNegocio::agora\s*\(/',
    ];

    public function test_nenhum_arquivo_de_app_deriva_data_do_relogio_do_servidor(): void
    {
        $app = dirname(__DIR__, 3).'/app';
        $violacoes = [];

        foreach ($this->arquivosPhp($app) as $arquivo) {
            $relativo = substr($arquivo, strlen($app) + 1);

            if ($relativo === self::DONO) {
                continue;
            }

            $codigo = $this->codigoSemComentarios($arquivo);

            foreach (self::GRAFIAS as $grafia => $regex) {
                if (preg_match($regex, $codigo) === 1) {
                    $violacoes[] = "{$relativo}: {$grafia}";
                }
            }
        }

        $this->assertSame(
            [],
            $violacoes,
            'Data de calendário derivada do relógio UTC, ou FusoDoNegocio::agora() gravado como instante. Veja .claude/rules/backend-ddd.md, "Data de calendário sai do FusoDoNegocio".',
        );
    }

    /** O detector tem de reconhecer cada grafia — e só ela. Regex que apodrece aprova tudo. */
    public function test_o_detector_reconhece_as_grafias_e_poupa_os_instantes(): void
    {
        $proibidas = [
            '$d = today();',
            '$d = Carbon::today();',
            '$d = CarbonImmutable::today()->subDay();',
            '$d = now()->toDateString();',
            '$d = CarbonImmutable::now()->addDays(self::DIAS)->endOfDay();',
            '$d = Carbon::now()->startOfDay();',
            "\$c->forceFill(['revoked_at' => FusoDoNegocio::agora()]);",
            '$quote->approved_at = FusoDoNegocio::agora();',
            "['expires_at' => FusoDoNegocio::agora()->addDays(3)]",
        ];
        $permitidas = [
            '$d = now();',
            '$d = now()->addSeconds(2);',
            '$d = CarbonImmutable::now()->subMonths(self::MESES);',
            '$d = FusoDoNegocio::hoje();',
            '$d = $relogio->today();',
            '$d = CarbonImmutable::now(self::TIMEZONE);',
            "\$c->forceFill(['revoked_at' => now()]);",
            '$now = FusoDoNegocio::agora();',
            "['codigo' => 'LOT-'.FusoDoNegocio::agora()->year]",
        ];

        foreach ($proibidas as $codigo) {
            $this->assertTrue($this->casa($codigo), "Deveria reprovar: {$codigo}");
        }

        foreach ($permitidas as $codigo) {
            $this->assertFalse($this->casa($codigo), "Deveria passar: {$codigo}");
        }
    }

    public function test_o_dono_declarado_existe(): void
    {
        $this->assertFileExists(dirname(__DIR__, 3).'/app/'.self::DONO);
    }

    private function casa(string $codigo): bool
    {
        foreach (self::GRAFIAS as $regex) {
            if (preg_match($regex, $codigo) === 1) {
                return true;
            }
        }

        return false;
    }
}
