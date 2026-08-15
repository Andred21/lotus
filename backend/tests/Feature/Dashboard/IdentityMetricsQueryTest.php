<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Dashboard\Enums\DashboardAlertType;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Dashboard\Services\IdentityMetricsQuery;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IdentityMetricsQueryTest extends TestCase
{
    use RefreshDatabase;

    private Redator $redator;

    private int $fileSequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-08-14 12:00:00');

        $user = User::create([
            'name' => 'Redator Identity Dashboard',
            'rut' => '12.345.678-5',
            'email' => 'redator-identity-dashboard@example.test',
            'password' => 'secret',
            'type' => 'redator',
            'is_active' => true,
        ]);
        $this->redator = Redator::create(['user_id' => $user->id]);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_alerta_documentos_vencidos_ou_vencendo_na_janela(): void
    {
        $vencido = $this->createDocument(
            RedatorDocumentType::REUF->value,
            CarbonImmutable::today()->subDay(),
        );
        $vencendo = $this->createDocument(
            RedatorDocumentType::TITULO->value,
            CarbonImmutable::today()->addDays(10),
        );
        $foraDaJanela = $this->createDocument(
            RedatorDocumentType::CV->value,
            CarbonImmutable::today()->addDays(60),
        );
        $semValidade = $this->createDocument(RedatorDocumentType::POSTGRADO->value, null);

        $alertas = app(IdentityMetricsQuery::class)->alertasDocumentos();

        $this->assertSame([
            [
                'type' => DashboardAlertType::RedatorDocumentExpired,
                'severity' => DashboardSeverity::High,
                'entity_id' => $vencido->id,
                'date' => '2026-08-13',
                'navigation' => ['redator_id' => $this->redator->id],
            ],
            [
                'type' => DashboardAlertType::RedatorDocumentExpiringSoon,
                'severity' => DashboardSeverity::Medium,
                'entity_id' => $vencendo->id,
                'date' => '2026-08-24',
                'navigation' => ['redator_id' => $this->redator->id],
            ],
        ], array_map(fn ($alerta): array => [
            'type' => $alerta->type,
            'severity' => $alerta->severity,
            'entity_id' => $alerta->entity_id,
            'date' => $alerta->date,
            'navigation' => $alerta->navigation,
        ], $alertas));

        $ids = array_column($alertas, 'entity_id');
        $this->assertNotContains($foraDaJanela->id, $ids);
        $this->assertNotContains($semValidade->id, $ids);
    }

    /**
     * O `fileable_type` sai do morph map (ADR-10), não de um literal. Um arquivo
     * de OUTRA entidade com o mesmo id e um tipo de documento de redator não
     * pode virar alerta de relator.
     */
    public function test_arquivo_de_outra_entidade_nao_vira_alerta_de_relator(): void
    {
        $doRedator = $this->createDocument(
            RedatorDocumentType::REUF->value,
            CarbonImmutable::today()->subDay(),
        );
        $deOutraEntidade = File::create([
            'fileable_type' => 'turma',
            'fileable_id' => $this->redator->id,
            'type' => RedatorDocumentType::REUF->value,
            'path' => 'dashboard/turmas/impostor.pdf',
            'original_name' => 'impostor.pdf',
            'mime' => 'application/pdf',
            'size' => 100,
            'valid_until' => CarbonImmutable::today()->subDay()->toDateString(),
        ]);

        $ids = array_column(app(IdentityMetricsQuery::class)->alertasDocumentos(), 'entity_id');

        $this->assertSame([$doRedator->id], $ids);
        $this->assertNotContains($deOutraEntidade->id, $ids);
    }

    /** Arquivo do redator que não é documento de idoneidade não alerta. */
    public function test_arquivo_sem_tipo_regulatorio_nao_alerta(): void
    {
        $regulatorio = $this->createDocument(
            RedatorDocumentType::REUF->value,
            CarbonImmutable::today()->subDay(),
        );
        $qualquer = $this->createDocument('CONTRATO', CarbonImmutable::today()->subDay());

        $ids = array_column(app(IdentityMetricsQuery::class)->alertasDocumentos(), 'entity_id');

        $this->assertSame([$regulatorio->id], $ids);
        $this->assertNotContains($qualquer->id, $ids);
    }

    private function createDocument(string $type, ?CarbonImmutable $validUntil): File
    {
        $sequence = ++$this->fileSequence;

        return File::create([
            'fileable_type' => 'redator',
            'fileable_id' => $this->redator->id,
            'type' => $type,
            'path' => "dashboard/redatores/{$this->redator->id}/{$sequence}.pdf",
            'original_name' => "{$type}-{$sequence}.pdf",
            'mime' => 'application/pdf',
            'size' => 100,
            'valid_until' => $validUntil?->toDateString(),
        ]);
    }
}
