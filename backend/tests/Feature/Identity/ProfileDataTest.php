<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Data\ProfileData;
use App\Domains\Identity\Enums\DocumentValidityStatus;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ProfileDataTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeRedator(): Redator
    {
        $user = User::factory()->create([
            'type' => 'redator',
            'is_active' => true,
            'rut' => '12.345.678-5',
            'phone' => '+56 9 1111 1111',
        ]);

        return Redator::create(['user_id' => $user->id]);
    }

    public function test_admin_nao_tem_bloco_de_redator(): void
    {
        $user = User::factory()->create(['type' => 'admin']);

        $data = ProfileData::fromUser($user);

        $this->assertNull($data->redator);
        $this->assertSame($user->email, $data->email);
    }

    public function test_redator_tem_sempre_quatro_slots_na_ordem_do_enum(): void
    {
        $redator = $this->makeRedator();

        $data = ProfileData::fromUser($redator->user);

        $this->assertNotNull($data->redator);
        $this->assertCount(4, $data->redator->documentos);
        $this->assertSame(
            array_map(fn (RedatorDocumentType $t) => $t->value, RedatorDocumentType::cases()),
            array_map(fn ($d) => $d->type->value, $data->redator->documentos),
        );
    }

    public function test_slot_sem_documento_sai_ausente_e_com_campos_nulos(): void
    {
        $redator = $this->makeRedator();

        $slot = ProfileData::fromUser($redator->user)->redator->documentos[0];

        $this->assertSame(DocumentValidityStatus::Ausente, $slot->status);
        $this->assertNull($slot->original_name);
        $this->assertNull($slot->download_url);
        $this->assertNull($slot->valid_until);
    }

    public function test_slot_com_documento_traz_status_calculado_e_metadados(): void
    {
        $redator = $this->makeRedator();
        $redator->documents()->create([
            'type' => RedatorDocumentType::CV->value,
            'path' => 'redator/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
            'valid_until' => CarbonImmutable::today()->addDays(5),
        ]);

        $slot = collect(ProfileData::fromUser($redator->user->refresh())->redator->documentos)
            ->firstWhere(fn ($d) => $d->type === RedatorDocumentType::CV);

        $this->assertSame(DocumentValidityStatus::VenceEmBreve, $slot->status);
        $this->assertSame('cv.pdf', $slot->original_name);
        $this->assertSame(1024, $slot->size);
        $this->assertSame('redator/1/cv.pdf', $slot->download_url);
    }

    /** A D5 chega ao front como DADO, não como regra reescrita lá. */
    public function test_slot_do_reuf_vem_marcado_como_nao_self_service(): void
    {
        $redator = $this->makeRedator();

        $slots = collect(ProfileData::fromUser($redator->user)->redator->documentos)->keyBy(fn ($d) => $d->type->value);

        $this->assertFalse($slots['REUF']->self_service);
        $this->assertTrue($slots['CV']->self_service);
    }

    public function test_cursos_habilitados_conta_e_nomeia(): void
    {
        $redator = $this->makeRedator();
        $redator->courses()->attach([
            $this->makeCourse(['name' => 'Alta Tensão'])->id,
            $this->makeCourse(['name' => 'Rescate'])->id,
        ]);

        $data = ProfileData::fromUser($redator->user->refresh());

        $this->assertSame(2, $data->redator->cursos_habilitados);
        $this->assertEqualsCanonicalizing(['Alta Tensão', 'Rescate'], $data->redator->cursos);
    }

    /** Documento substituído é soft-deletado; o slot mostra o vigente, não o morto. */
    public function test_documento_soft_deletado_nao_ocupa_o_slot(): void
    {
        $redator = $this->makeRedator();
        $morto = $redator->documents()->create([
            'type' => RedatorDocumentType::CV->value,
            'path' => 'redator/1/velho.pdf',
            'original_name' => 'velho.pdf',
            'mime' => 'application/pdf',
            'size' => 10,
        ]);
        $morto->delete();

        $slot = collect(ProfileData::fromUser($redator->user->refresh())->redator->documentos)
            ->firstWhere(fn ($d) => $d->type === RedatorDocumentType::CV);

        $this->assertSame(DocumentValidityStatus::Ausente, $slot->status);
    }
}
