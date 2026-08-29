<?php

namespace Tests\Feature\Operation;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/** DoD 3 da spec sobre `GET /api/turmas` e `/api/turmas/archived`. */
class TurmaPaginationTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    public function test_status_habilitada_devolve_so_turmas_com_os_tres_documentos(): void
    {
        $this->actingAsAdmin();
        $habilitada = $this->turma(docs: TurmaDocumentType::cases());
        $this->turma(docs: [TurmaDocumentType::MANUAL]);

        $response = $this->getJson('/api/turmas?status=habilitada')->assertOk();

        $this->assertSame([$habilitada->id], array_column($response->json('data'), 'id'));
        $response->assertJsonPath('data.0.habilitada', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.total_unfiltered', 2);
    }

    public function test_redator_ve_so_as_dele_e_o_total_unfiltered_e_das_dele(): void
    {
        $this->turma(docs: TurmaDocumentType::cases());
        $minha = $this->turma(docs: TurmaDocumentType::cases());
        $this->turma(docs: []);

        $redator = $this->actingAsRedator();
        $minha->redatores()->attach($redator);

        $response = $this->getJson('/api/turmas?status=habilitada')->assertOk();

        $this->assertSame([$minha->id], array_column($response->json('data'), 'id'));
        $response->assertJsonPath('meta.total_unfiltered', 1);
    }

    public function test_q_varre_curso_contratante_e_codigo_do_orcamento(): void
    {
        $this->actingAsAdmin();
        $t1 = $this->turma(docs: [], course: 'Líneas 220kV', cliente: 'Transelec');
        $t2 = $this->turma(docs: [], course: 'Subestaciones', cliente: 'Enel');
        $t1->quote->budget->update(['code' => 'Scap 41']);
        $t2->quote->budget->update(['code' => 'Scap 42']);

        $this->assertSame([$t1->id], array_column($this->getJson('/api/turmas?q=220kV')->json('data'), 'id'));
        $this->assertSame([$t2->id], array_column($this->getJson('/api/turmas?q=enel')->json('data'), 'id'));
        $this->assertSame([$t2->id], array_column($this->getJson('/api/turmas?q=Scap 42')->json('data'), 'id'));
    }

    public function test_sort_start_date_e_a_recusa_fora_da_allowlist(): void
    {
        $this->actingAsAdmin();
        $tarde = $this->turma(docs: [], start: '2026-09-01');
        $cedo = $this->turma(docs: [], start: '2026-07-01');

        $this->assertSame([$cedo->id, $tarde->id], array_column($this->getJson('/api/turmas?sort=start_date')->json('data'), 'id'));
        $this->assertSame([$tarde->id, $cedo->id], array_column($this->getJson('/api/turmas?sort=-start_date')->json('data'), 'id'));

        $this->getJson('/api/turmas?sort=course_name')->assertStatus(422)->assertHeader('Content-Type', 'application/problem+json');
        $this->getJson('/api/turmas?status=foo')->assertStatus(422);
    }

    public function test_archived_pagina_com_o_mesmo_envelope_e_o_arquivado_por(): void
    {
        $this->actingAsAdmin();
        $arquivada = $this->turma(docs: TurmaDocumentType::cases());
        $this->turma(docs: []);
        $arquivada->delete();

        $response = $this->getJson('/api/turmas/archived?status=habilitada')->assertOk();

        $this->assertSame([$arquivada->id], array_column(array_column($response->json('data'), 'turma'), 'id'));
        $response->assertJsonPath('meta.total', 1)->assertJsonPath('meta.total_unfiltered', 1);
        $this->assertNotNull($response->json('data.0.archived_at'));
        $this->assertArrayHasKey('archived_by', $response->json('data.0'));
    }

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true, 'rut' => '9.999.999-K']);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return Redator::create(['user_id' => $user->id]);
    }

    /** @param  array<TurmaDocumentType>  $docs */
    private function turma(array $docs, string $course = 'Curso', string $cliente = 'Cliente', string $start = '2026-07-20'): Turma
    {
        $n = ++$this->seq;
        $pad = str_pad((string) $n, 3, '0', STR_PAD_LEFT);
        $turma = IssuableEnrollmentBuilder::make()
            ->turmaNaoConcluida()
            ->client(['legal_name' => "{$cliente} {$n} SpA"], ['name' => $cliente, 'rut' => "1.000.{$pad}-0"])
            ->course(['name' => "{$course} {$n}"])
            ->student(['rut' => "2.000.{$pad}-0"])
            ->redatorUser(['rut' => "3.000.{$pad}-0"])
            ->turma(['modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago', 'start_date' => $start, 'end_date' => '2026-12-31'])
            ->create()
            ->turmaModel();

        foreach ($docs as $type) {
            $turma->files()->create(['type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf', 'mime' => 'application/pdf', 'size' => 10]);
        }

        return $turma;
    }
}
