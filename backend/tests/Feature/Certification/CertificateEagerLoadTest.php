<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Companheiro de runtime do `CertificateQueryBuilder`, no molde do
 * `ContratanteEagerLoadTest`.
 *
 * `CertificateData::fromModel` atravessa matrícula→aluno→user para a foto viva
 * (`aluno_photo_url`). A travessia nasceu escrita INLINE no `index`, e os três
 * caminhos que projetam o MESMO DTO (`show`/`store`/`revoke`) lazy-loadavam
 * três relações cada, em silêncio — é o B5 ("a lista do que carregar mora no
 * builder, não em cada caller"), e o que impede a reincidência é este teste,
 * não o comentário.
 *
 * `Model::preventLazyLoading()` só marca a instância vinda de um `hydrate()`
 * com MAIS de uma linha (`Builder::hydrate()`, condicional a `count > 1`) —
 * por isso a listagem materializa DUAS cadeias completas e distintas.
 */
class CertificateEagerLoadTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private int $seq = 0;

    protected function tearDown(): void
    {
        Model::preventLazyLoading(false);

        parent::tearDown();
    }

    public function test_listagem_de_certificados_nao_lazy_loada_o_user_do_aluno(): void
    {
        $this->actingAsAdmin();
        $this->createCertificate();
        $this->createCertificate();

        Model::preventLazyLoading();

        $this->getJson('/api/certificates')->assertOk()->assertJsonCount(2, 'data');
    }

    /**
     * A contraparte de INSTÂNCIA: `show` não é marcável por
     * `preventLazyLoading` (uma linha só), então o que se prova aqui é o
     * efeito — a foto viva chega assinada nos dois caminhos. Sem
     * `loadListingData()` o campo continuava chegando, mas por três consultas
     * sob demanda; sem a travessia carregada em NENHUM lugar, ele some.
     */
    public function test_foto_viva_do_aluno_chega_assinada_na_listagem_e_no_detalhe(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $certificate = $this->createCertificate(['photo_path' => 'user-photos/9/foto.jpg']);

        $lista = $this->getJson('/api/certificates')->assertOk();
        $this->assertStringStartsWith('http', $lista->json('data.0.aluno_photo_url'));

        $detalhe = $this->getJson("/api/certificates/{$certificate->id}")->assertOk();
        $this->assertStringStartsWith('http', $detalhe->json('aluno_photo_url'));
    }

    /**
     * Cadeia emitível completa e distinta das demais (RUT é `unique`).
     *
     * @param  array<string, mixed>  $alunoOverrides
     */
    private function createCertificate(array $alunoOverrides = []): Certificate
    {
        $n = ++$this->seq;

        $builder = IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa Legal {$n} SpA"], ['rut' => $this->nextRut()])
            ->course(['name' => "Curso {$n}"])
            ->student(['name' => "Alumno {$n}", 'rut' => $this->nextRut(), ...$alunoOverrides])
            ->redatorUser(['rut' => $this->nextRut()])
            ->create();

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => 'LOT-2026-'.str_pad((string) (1000 + $n), 4, '0', STR_PAD_LEFT),
            'snapshot' => [
                'aluno' => ['name' => "Alumno {$n}"],
                'curso' => ['name' => "Curso {$n}"],
            ],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }

    private function nextRut(): string
    {
        return '1.000.'.str_pad((string) ++$this->seq, 3, '0', STR_PAD_LEFT).'-0';
    }
}
