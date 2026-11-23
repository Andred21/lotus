<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Bloco 60, D-P2. Todo telefone que chega pela API sai gravado em E.164 e todo
 * e-mail sai `trim` + minúsculas, por mutator Eloquent em `User` e
 * `ClientContact`: é o único ponto por tabela que as sete Actions de escrita
 * atravessam. O telefone inválido nem chega ao mutator, porque o `ValidPhone`
 * do DTO devolve 422 antes.
 */
class PhoneNormalizationTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function mensagemDeTelefoneInvalido(): string
    {
        return __('shared.rule.phone_invalid');
    }

    private function clientePayload(array $override = []): array
    {
        return array_merge([
            'name' => 'Switch Chile',
            'rut' => '12.345.678-5',
            'email' => 'info@switch.cl',
            'legal_name' => 'Switch Chile Ltda',
            'type' => 'client',
            'contacts' => [['name' => 'Parris Barrios', 'email' => 'p@switch.cl', 'is_primary' => true]],
        ], $override);
    }

    public function test_cliente_grava_o_telefone_em_e164(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/clients', $this->clientePayload())->json('id');

        $this->putJson("/api/clients/{$id}", $this->clientePayload([
            'phone' => '9 8765 4321',
            'contacts' => [['name' => 'Parris', 'phone' => '(2) 2123 4567', 'is_primary' => true]],
        ]))
            ->assertOk()
            ->assertJsonPath('phone', '+56987654321')
            ->assertJsonPath('contacts.0.phone', '+56221234567');

        $this->assertDatabaseHas('users', ['email' => 'info@switch.cl', 'phone' => '+56987654321']);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Parris', 'phone' => '+56221234567']);
    }

    public function test_cliente_com_telefone_invalido_da_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->clientePayload(['phone' => 'abc']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.phone.0', $this->mensagemDeTelefoneInvalido());
    }

    public function test_telefone_invalido_de_contato_da_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->clientePayload([
            'contacts' => [['name' => 'Parris', 'phone' => 'abc', 'is_primary' => true]],
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['contacts.0.phone' => $this->mensagemDeTelefoneInvalido()]);
    }

    public function test_redator_grava_o_telefone_em_e164(): void
    {
        $this->actingAsSuperadmin();
        $user = User::factory()->redator()->create(['rut' => '12.345.678-5', 'email' => 'red@lotus.cl']);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator', 'rut' => '12.345.678-5', 'email' => 'red@lotus.cl', 'phone' => '9 8765 4321',
        ])->assertOk()->assertJsonPath('phone', '+56987654321');

        $this->assertSame('+56987654321', $user->refresh()->phone);
    }

    public function test_redator_com_telefone_invalido_da_422(): void
    {
        $this->actingAsSuperadmin();
        $user = User::factory()->redator()->create(['rut' => '12.345.678-5', 'email' => 'red@lotus.cl']);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator', 'rut' => '12.345.678-5', 'email' => 'red@lotus.cl', 'phone' => 'abc',
        ])->assertUnprocessable()->assertJsonPath('errors.phone.0', $this->mensagemDeTelefoneInvalido());
    }

    public function test_staff_grava_o_telefone_em_e164(): void
    {
        $this->actingAsSuperadmin();
        $target = User::factory()->create(['email' => 'staff@lotus.cl']);
        $target->assignRole('admin');

        $this->putJson("/api/users/{$target->id}", [
            'name' => 'Staff', 'email' => 'staff@lotus.cl', 'role' => 'admin', 'is_active' => true,
            'phone' => '9 8765 4321',
        ])->assertOk()->assertJsonPath('phone', '+56987654321');

        $this->assertSame('+56987654321', $target->refresh()->phone);
    }

    public function test_staff_com_telefone_invalido_da_422(): void
    {
        $this->actingAsSuperadmin();
        $target = User::factory()->create(['email' => 'staff@lotus.cl']);
        $target->assignRole('admin');

        $this->putJson("/api/users/{$target->id}", [
            'name' => 'Staff', 'email' => 'staff@lotus.cl', 'role' => 'admin', 'is_active' => true,
            'phone' => 'abc',
        ])->assertUnprocessable()->assertJsonPath('errors.phone.0', $this->mensagemDeTelefoneInvalido());
    }

    public function test_aluno_grava_o_telefone_em_e164(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Maria Gonzales', 'rut' => '12.345.678-5', 'email' => 'mg@transelec.cl', 'client_id' => $client->id,
        ]));

        $this->putJson("/api/students/{$student->id}", [
            'name' => 'Maria Gonzales', 'rut' => '12.345.678-5', 'email' => 'mg@transelec.cl',
            'phone' => '9 8765 4321',
        ])->assertOk()->assertJsonPath('phone', '+56987654321');

        $this->assertSame('+56987654321', $student->user->refresh()->phone);
    }

    public function test_aluno_com_telefone_invalido_da_422(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();

        $this->postJson('/api/students', [
            'name' => 'Maria Gonzales', 'rut' => '12.345.678-5', 'email' => 'mg@transelec.cl',
            'client_id' => $client->id, 'phone' => 'abc',
        ])->assertUnprocessable()->assertJsonPath('errors.phone.0', $this->mensagemDeTelefoneInvalido());
    }

    public function test_perfil_grava_o_telefone_em_e164(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile', ['name' => 'Ana', 'phone' => '9 8765 4321'])
            ->assertOk()
            ->assertJsonPath('phone', '+56987654321');

        $this->assertSame('+56987654321', $user->refresh()->phone);
    }

    public function test_perfil_com_telefone_invalido_da_422(): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/profile', ['name' => 'Ana', 'phone' => 'abc'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.phone.0', $this->mensagemDeTelefoneInvalido());
    }

    public function test_email_e_gravado_sem_espacos_e_em_minusculas(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->clientePayload([
            'email' => '  Foo@Bar.CL ',
            'contacts' => [['name' => 'Parris', 'email' => ' Contato@Bar.CL', 'is_primary' => true]],
        ]))->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'foo@bar.cl']);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Parris', 'email' => 'contato@bar.cl']);
    }

    /** O mutator roda na ESCRITA do atributo; ler ou salvar outro campo não reescreve o legado. */
    public function test_email_legado_em_maiusculas_nao_e_reescrito_por_escrita_que_nao_o_toca(): void
    {
        $user = $this->actingAsAdmin();
        DB::table('users')->where('id', $user->id)->update(['email' => 'Legado@Lotus.CL']);

        $this->putJson('/api/profile', ['name' => 'Ana Nova'])->assertOk();

        $this->assertSame('Legado@Lotus.CL', DB::table('users')->where('id', $user->id)->value('email'));
    }

    public function test_mutator_do_contato_normaliza_telefone_e_email(): void
    {
        $contato = $this->makeClientWithUser()->contacts()->create([
            'name' => 'Parris', 'email' => ' P@Switch.CL ', 'phone' => '9 8765 4321',
        ]);

        $this->assertSame('p@switch.cl', $contato->refresh()->email);
        $this->assertSame('+56987654321', $contato->phone);
        $this->assertInstanceOf(ClientContact::class, $contato);
    }
}
