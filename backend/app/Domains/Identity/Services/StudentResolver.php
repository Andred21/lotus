<?php

namespace App\Domains\Identity\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Data\StudentIdentityData;
use App\Domains\Identity\Enums\LinkOutcome;
use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
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
    ) {}

    /**
     * A identidade de uma linha, com a FORMA já julgada (RUT, nome, e-mail,
     * telefone e os tetos de `TetosImpressos`/`TetosDeColuna`): as regras são as
     * de `StudentIdentity::rules()`, as mesmas do cadastro e da matrícula
     * individual. Lança a `ValidationException` da linha, com uma chave por campo.
     *
     * @throws ValidationException
     */
    public function identity(string $rut, string $name, ?string $email, ?string $phone): StudentIdentity
    {
        return StudentIdentityData::validateAndCreate([
            'rut' => $rut,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
        ])->toIdentity();
    }

    public function resolveByRut(StudentIdentity $identity, Client $client): StudentResolution
    {
        $parsed = Rut::parse($identity->rut);

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
        return DB::transaction(function () use ($user, $identity, $client) {
            // Aluno novo: provisiona o User (inativo, sem role) e cria o Student.
            if ($user === null) {
                // Aluno novo: e-mail e colisão de identidade saem de assertCanCreate
                // — a mesma validação serve à triagem, sem escrita (D10).
                $this->assertCanCreate($identity);

                $created = $this->provisioner->provision(
                    'aluno',
                    $identity->name,
                    $identity->rut,
                    $identity->email,
                    $identity->phone,
                );
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
     * entre a criação e a triagem da importação. A forma da identidade já foi
     * julgada em `identity()`; aqui ficam as duas regras que dependem do ramo.
     *
     * Aluno novo exige e-mail (D9): users.email é NOT NULL — sem isso não há como
     * provisionar o User. Colisão de RUT ou e-mail, inclusive contra
     * soft-deletados, vira ValidationException por linha — nunca 500 que aborta
     * a planilha.
     *
     * @throws ValidationException
     */
    public function assertCanCreate(StudentIdentity $identity): void
    {
        $this->provisioner->ensureIdentityAvailable($identity->rut, $this->requireEmail($identity));
    }

    /**
     * A identidade que o *Actualizar* gravaria no cadastro de um aluno existente
     * (D13/D17): campo em branco mantém o valor do cadastro e o RUT é sempre o
     * do cadastro. A forma do resultado é julgada como a de qualquer linha.
     *
     * @throws ValidationException
     */
    public function updatedIdentity(Student $student, string $name, ?string $email, ?string $phone): StudentIdentity
    {
        $user = $student->user;

        return $this->identity(
            $user->rut,
            $name,
            $email === null || $email === '' ? $user->email : $email,
            $phone === null || $phone === '' ? $user->phone : $phone,
        );
    }

    /**
     * O que o *Actualizar* recusa sem escrever: RUT ou e-mail que já são de
     * OUTRO user (o próprio é ignorado). Contraparte de `assertCanCreate`.
     *
     * @throws ValidationException
     */
    public function assertCanUpdate(Student $student, StudentIdentity $identity): void
    {
        $this->provisioner->ensureIdentityAvailable(
            $identity->rut,
            $this->requireEmail($identity),
            $student->user_id,
        );
    }

    /**
     * Atualiza o cadastro de um aluno EXISTENTE com a identidade de uma linha da
     * importação (D13), pela mesma porta da edição de aluno
     * (`UserProvisioner::update`: checagem de identidade e tradução de colisão).
     * O vínculo com a empresa não é tocado. Domínios vizinhos só enxergam
     * `Services`, por isso a porta mora aqui.
     *
     * @throws ValidationException
     */
    public function updateRegistration(Student $student, StudentIdentity $identity): void
    {
        $this->provisioner->update($student->user, [
            'name' => $identity->name,
            'rut' => $identity->rut,
            'email' => $this->requireEmail($identity),
            'phone' => $identity->phone,
        ]);
    }

    /** @throws ValidationException */
    private function requireEmail(StudentIdentity $identity): string
    {
        if ($identity->email === null || $identity->email === '') {
            throw ValidationException::withMessages([
                'email' => __('identity.errors.student_email_required'),
            ]);
        }

        return $identity->email;
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
