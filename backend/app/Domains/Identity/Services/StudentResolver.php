<?php

namespace App\Domains\Identity\Services;

use App\Domains\Commercial\Models\Client;
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

    public function resolveByRut(
        string $rut,
        string $name,
        string $email,
        ?string $phone,
        Client $client,
    ): StudentResolution {
        $parsed = Rut::parse($rut);

        if (! $parsed->isValid()) {
            throw ValidationException::withMessages(['rut' => 'RUT inválido.']);
        }

        $user = User::withTrashed()->where('rut', $parsed->format())->first();

        if ($user !== null && $user->type !== 'aluno') {
            throw ValidationException::withMessages([
                'rut' => 'Este RUT pertence a um usuário de outro tipo.',
            ]);
        }

        // Atômico por linha: falha no meio faz rollback, sem User/Student órfão.
        // A transação de link (interna) aninha via savepoint — ok no Laravel.
        return DB::transaction(function () use ($user, $name, $rut, $email, $phone, $client) {
            // Aluno novo: provisiona o User (inativo, sem role) e cria o Student.
            if ($user === null) {
                // Colisão de e-mail vira ValidationException por linha (chave email),
                // inclusive contra soft-deletados — nunca 500 que aborta a planilha.
                $this->provisioner->ensureEmailAvailable($email);
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
}
