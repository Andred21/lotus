<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Data\ImportConfirmData;
use App\Domains\Operation\Data\ImportResultData;
use App\Domains\Operation\Data\ImportRowErrorData;
use App\Domains\Operation\Data\MovedStudentData;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\EnrollOutcome;
use App\Domains\Operation\Services\ImportRowClassifier;
use App\Domains\Operation\Services\ImportRowDecision;
use App\Shared\Validation\ValidationMessages;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Confirmação da importação (spec D2-D7): recebe as linhas que o admin triou e
 * REVALIDA todas no servidor, sem confiar em nada que o navegador classificou.
 * Quem decide é o `ImportRowClassifier`, o MESMO código da prévia.
 *
 * TUDO OU NADA na checagem: qualquer linha recusada (ou *Actualizar* recusado)
 * devolve 422 antes de qualquer escrita, com uma chave por recusa — `import.<row>`
 * para a linha e `import.<row>.update` só para o *Actualizar*, `<row>` sendo o
 * número da linha na planilha. Passada a checagem, a gravação é por linha, cada
 * uma na sua transação (D7): com `update_registration` em aluno cadastrado o
 * cadastro é atualizado e o aluno matriculado na MESMA transação. Só a corrida
 * entre checar e gravar (outro usuário tomando o e-mail no meio) ainda cai em
 * `errors` do resumo, e o lote segue.
 */
class ImportStudentsAction
{
    public function __construct(
        private readonly EnrollStudentAction $enroll,
        private readonly StudentResolver $resolver,
        private readonly ImportRowClassifier $classifier,
    ) {}

    public function execute(Turma $turma, ImportConfirmData $data, User $actor): ImportResultData
    {
        // O gate fica no topo mesmo com o EnrollStudentAction gateando por
        // linha: recusar o lote inteiro de uma vez é a resposta certa, e não é o
        // mesmo que recusar 40 linhas uma a uma.
        $turma->assertAcademicallyWritable();

        $decisions = $this->classifier->classify(
            $turma,
            array_values($data->rows),
            $actor->can('identity.user.update'),
        );

        $this->assertNothingRefused($decisions);

        $created = $relinked = $already = 0;
        $moved = [];
        $errors = [];

        foreach ($decisions as $decision) {
            try {
                $outcome = $this->processRow($turma, $decision);

                if ($outcome->alreadyEnrolled) {
                    $already++;

                    continue;
                }

                match ($outcome->resolution->outcome) {
                    StudentResolutionOutcome::Created => $created++,
                    StudentResolutionOutcome::AlreadyLinked => $relinked++,
                    StudentResolutionOutcome::Moved => $moved[] = new MovedStudentData(
                        rut: $outcome->resolution->student->user->rut,
                        name: $outcome->resolution->student->user->name,
                        previous_client: $outcome->resolution->previousClient?->legal_name,
                        client: $turma->contratante()->name,
                    ),
                };
            } catch (ValidationException $e) {
                // Só a corrida entre a checagem e a gravação chega aqui (D7).
                $errors[] = new ImportRowErrorData(
                    row: $decision->line->row,
                    message: ValidationMessages::squash($e),
                );
            }
        }

        return new ImportResultData(
            created: $created,
            relinked: $relinked,
            already_enrolled: $already,
            moved: $moved,
            errors: $errors,
            enrolled_total: $turma->enrollments()->count(),
            contracted_count: $turma->quote->student_count,
        );
    }

    /**
     * Uma só 422 com TODAS as recusas do lote: o admin corrige a planilha uma vez.
     *
     * @param  list<ImportRowDecision>  $decisions
     *
     * @throws ValidationException
     */
    private function assertNothingRefused(array $decisions): void
    {
        $messages = [];

        foreach ($decisions as $decision) {
            $row = $decision->line->row;

            if ($decision->rowRefused()) {
                $messages["import.{$row}"] = [$decision->refusal];
            } elseif ($decision->updateRefused()) {
                $messages["import.{$row}.update"] = [$decision->updateRefusal];
            }
        }

        if ($messages !== []) {
            throw ValidationException::withMessages($messages);
        }
    }

    /**
     * Uma linha já decidida: só grava. `updates()` atualiza o cadastro e
     * matricula na mesma transação (se uma falha, nada da linha fica); as demais
     * matriculam com a identidade que o classificador entregou — a linha validada
     * no aluno novo, o cadastro nos demais (os valores da planilha não são
     * gravados em Mantener). `already_enrolled` também traz o cadastro.
     *
     * @throws ValidationException
     */
    private function processRow(Turma $turma, ImportRowDecision $decision): EnrollOutcome
    {
        if ($decision->updates()) {
            return DB::transaction(function () use ($turma, $decision) {
                $this->resolver->updateRegistration($decision->lookup->student, $decision->updatedIdentity);

                return $this->enroll->execute($turma, $decision->updatedIdentity);
            });
        }

        return $this->enroll->execute($turma, $decision->identity);
    }
}
