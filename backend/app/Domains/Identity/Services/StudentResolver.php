<?php

namespace App\Domains\Identity\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Actions\UpdateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Enums\LinkOutcome;
use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
use App\Shared\Support\TetosImpressos;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Resolve uma linha de importação de aluno pelo RUT (chave natural, RF-ALU-07):
 * existe? associa : cria (via UserProvisioner). Aplica o vínculo ao cliente da
 * cotação (RN-10) via StudentClientLinkService. Lança por linha; a importação
 * (6c) captura e reporta, sem abortar a planilha inteira.
 */
class StudentResolver
{
    public function __construct(
        private readonly UserProvisioner $provisioner,
        private readonly StudentClientLinkService $linkService,
        private readonly UpdateStudentAction $updateStudent,
    ) {}

    public function resolveByRut(
        string $rut,
        string $name,
        ?string $email,
        ?string $phone,
        Client $client,
    ): StudentResolution {
        $parsed = Rut::parse($rut);

        if (! $parsed->isValid()) {
            throw ValidationException::withMessages(['rut' => __('identity.errors.rut_invalid')]);
        }

        $user = User::withTrashed()->where('rut', $parsed->format())->first();

        if ($user !== null && $user->type !== 'aluno') {
            throw ValidationException::withMessages([
                'rut' => __('identity.errors.rut_wrong_type'),
            ]);
        }

        // Atômico por linha: falha no meio faz rollback, sem User/Student órfão.
        // A transação de link (interna) aninha via savepoint — ok no Laravel.
        return DB::transaction(function () use ($user, $name, $rut, $email, $phone, $client) {
            // Aluno novo: provisiona o User (inativo, sem role) e cria o Student.
            if ($user === null) {
                // Aluno novo: e-mail, teto do nome e colisão de identidade saem de
                // assertCanCreate — a mesma validação serve à triagem, sem escrita (D10).
                $this->assertCanCreate($rut, $name, $email);

                $created = $this->provisioner->provision('aluno', $name, $rut, $email, $phone);
                $student = Student::create(['user_id' => $created->id]);
                $this->linkService->link($student, $client);

                return new StudentResolution($student, StudentResolutionOutcome::Created);
            }

            // Aluno existente (possivelmente soft-deletado): restaura e revincula.
            if ($user->trashed()) {
                $user->restore();
            }

            $student = Student::withTrashed()->where('user_id', $user->id)->firstOrFail();

            if ($student->trashed()) {
                $student->restore();
            }

            $previousClient = $student->currentClient; // capturado ANTES do link

            $linkOutcome = $this->linkService->link($student, $client);

            $outcome = $linkOutcome === LinkOutcome::AlreadyLinked
                ? StudentResolutionOutcome::AlreadyLinked
                : StudentResolutionOutcome::Moved;

            return new StudentResolution(
                $student,
                $outcome,
                $outcome === StudentResolutionOutcome::Moved ? $previousClient : null,
            );
        });
    }

    /**
     * O nome é obrigatório em toda linha da importação, nova ou de aluno já
     * cadastrado (D17): é o que o certificado imprime. Fonte única da regra, que
     * a prévia e a confirmação chamam antes de separar aluno novo de existente.
     *
     * @throws ValidationException
     */
    public function assertNameProvided(string $name): void
    {
        if (trim($name) === '') {
            throw ValidationException::withMessages([
                'name' => __('validation.required', [
                    'attribute' => __('validation.attributes.name'),
                ]),
            ]);
        }
    }

    /**
     * Valida, sem escrever, o que o ramo do aluno novo recusa (D10): fonte única
     * entre a criação e a triagem da importação.
     *
     * Aluno novo exige e-mail (D9): users.email é NOT NULL — sem isso não há como
     * provisionar o User. O nome é o que o certificado imprime (D15): acima do
     * teto a linha é recusada, como a tela recusa no cadastro. Colisão de RUT ou
     * e-mail, inclusive contra soft-deletados, vira ValidationException por linha
     * — nunca 500 que aborta a planilha.
     *
     * @throws ValidationException
     */
    public function assertCanCreate(string $rut, string $name, ?string $email): void
    {
        $this->assertNameProvided($name);

        if ($email === null || $email === '') {
            throw ValidationException::withMessages([
                'email' => __('identity.errors.student_email_required'),
            ]);
        }

        if (mb_strlen($name) > TetosImpressos::NOME_ALUNO) {
            throw ValidationException::withMessages([
                'name' => __('validation.max.string', [
                    'attribute' => __('validation.attributes.name'),
                    'max' => TetosImpressos::NOME_ALUNO,
                ]),
            ]);
        }

        $this->provisioner->ensureIdentityAvailable($rut, $email);
    }

    /**
     * Atualiza o cadastro de um aluno EXISTENTE com os dados de uma linha da
     * importação (D13). Campo em branco mantém o valor do cadastro (D17), e a
     * validação é a do contrato do aluno (`StudentData`), a mesma da tela de
     * cadastro. Quem escreve, e audita, é o `UpdateStudentAction`; o vínculo com
     * a empresa não é tocado. Domínios vizinhos só enxergam `Services`, por isso
     * a porta mora aqui.
     *
     * @throws ValidationException
     */
    public function updateRegistration(Student $student, string $name, ?string $email, ?string $phone): void
    {
        $user = $student->user;

        $this->updateStudent->execute($student, StudentData::validateAndCreate([
            'name' => $name,
            'rut' => $user->rut,
            'email' => $email ?? $user->email,
            'phone' => $phone ?? $user->phone,
        ]));
    }

    /**
     * Leitura read-only para o preview de matrícula (RF-ALU-04): resolve o RUT
     * sem criar nem mover. Lança por RUT inválido ou tipo não-aluno (mesmo
     * critério do resolveByRut); ausência de aluno é resultado válido (exists=false).
     */
    public function previewByRut(string $rut): StudentLookup
    {
        $parsed = Rut::parse($rut);

        if (! $parsed->isValid()) {
            throw ValidationException::withMessages(['rut' => __('identity.errors.rut_invalid')]);
        }

        $formatted = $parsed->format();
        $user = User::withTrashed()->where('rut', $formatted)->first();

        if ($user === null) {
            return new StudentLookup(false, null, $formatted);
        }

        if ($user->type !== 'aluno') {
            throw ValidationException::withMessages([
                'rut' => __('identity.errors.rut_wrong_type'),
            ]);
        }

        $student = Student::withTrashed()->where('user_id', $user->id)->firstOrFail();
        $student->loadMissing('currentClient', 'user');

        return new StudentLookup(true, $student, $formatted);
    }
}
