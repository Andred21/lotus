<?php

namespace Tests\Unit\Shared;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Dashboard\Services\DashboardWindows;
use App\Domains\Identity\Enums\DocumentValidityStatus;
use App\Shared\Support\JanelaDeAviso;
use ReflectionClass;
use Tests\TestCase;

/**
 * D-15: eram TRÊS trintas, não dois — Identity, Dashboard e Certification cada
 * um com o seu. Um só dono, em Shared, porque Shared é o único lugar que não
 * abre aresta na matriz do `DomainDependencyTest` (spec D13).
 */
class JanelaDeAvisoTest extends TestCase
{
    /** @var array<class-string, string> classe => nome da constante que ela tinha */
    private const SITIOS_ANTIGOS = [
        DocumentValidityStatus::class => 'DIAS_AVISO',
        DashboardWindows::class => 'EXPIRY_WINDOW_DAYS',
        CertificateDisplayStatus::class => 'POR_VENCER_DIAS',
    ];

    public function test_a_janela_e_de_trinta_dias(): void
    {
        $this->assertSame(30, JanelaDeAviso::DIAS);
    }

    public function test_nenhum_dos_tres_sitios_antigos_tem_constante_propria(): void
    {
        foreach (self::SITIOS_ANTIGOS as $classe => $constante) {
            $reflexao = new ReflectionClass($classe);

            $this->assertFalse(
                $reflexao->hasConstant($constante),
                "{$classe}::{$constante} ainda existe — o dono dos 30 dias é JanelaDeAviso::DIAS.",
            );
            $this->assertStringContainsString(
                'JanelaDeAviso::DIAS',
                (string) file_get_contents((string) $reflexao->getFileName()),
                "{$classe} não lê JanelaDeAviso::DIAS.",
            );
        }
    }
}
