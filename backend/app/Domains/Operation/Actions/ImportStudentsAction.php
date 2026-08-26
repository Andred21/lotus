<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Operation\Data\ImportResultData;
use App\Domains\Operation\Data\ImportRowErrorData;
use App\Domains\Operation\Data\MovedStudentData;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\SpreadsheetRowReader;
use App\Shared\Validation\ValidationMessages;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Orquestra o import: transação POR LINHA (a do EnrollStudentAction), nunca
 * global — linha com erro é reportada no resumo e a planilha segue (tela-turmas).
 */
class ImportStudentsAction
{
    /**
     * Teto de linhas por planilha. Revisado de 500 para 100 no DoD da Task 12
     * (2026-08-25), medido contra a API real, não suposto: cada aluno NOVO
     * cria um `User`, e `password` é um cast `hashed` — todo import de linha
     * nova paga um `Hash::make()` de bcrypt, ~185ms cada neste container. Um
     * lote de 500 linhas todas novas estourou o `max_execution_time` de 30s do
     * PHP em produção de teste (fatal 500 aos ~30s, só 179 de 500 linhas
     * processadas); 120 linhas mediu 29.86s, ainda perto demais da margem. 100
     * linhas mediu 18.54s e 18.58s em duas corridas — folga real sob os 30s
     * (metade do `fastcgi_read_timeout` de dev) e larga sob os 60s/120s do
     * timeout de verdade. Turma real tem 8 a 15 alunos (`OperationDemoSeeder`),
     * então 100 ainda é ~7× a maior.
     *
     * Quem aplica o teto é o LEITOR, contando linha iterada (achado Q-4 do
     * review de 2026-08-25): contado aqui, do outro lado do `yield`, ele nunca
     * mordia num arquivo cheio de linhas em branco, que o leitor pula sem
     * entregar.
     */
    public const MAX_LINHAS = 100;

    public function __construct(
        private readonly SpreadsheetRowReader $reader,
        private readonly EnrollStudentAction $enroll,
    ) {}

    public function execute(Turma $turma, UploadedFile $file): ImportResultData
    {
        // O gate fica no topo mesmo com o EnrollStudentAction gateando por
        // linha: recusar a planilha inteira de uma vez é a resposta certa, e
        // não é o mesmo que recusar 40 linhas uma a uma.
        $turma->assertAcademicallyWritable();

        // Materializa ANTES de matricular: o leitor é um gerador e o laço
        // abaixo escreve por linha, então a recusa por teto durante o laço
        // chegaria DEPOIS de já ter matriculado parte da planilha — o que não é
        // recusa, é meia importação. O teto vai junto e mora no leitor, que é
        // quem enxerga a linha em branco.
        // Memória: no máximo `MAX_LINHAS` linhas de quatro campos curtos,
        // contra os 256M do pool.
        $linhas = iterator_to_array($this->reader->rows($file, self::MAX_LINHAS), false);

        $created = $relinked = $already = 0;
        $moved = [];
        $errors = [];

        foreach ($linhas as $line) {
            try {
                $outcome = $this->enroll->execute(
                    $turma, $line['rut'], $line['name'], $line['email'], $line['phone'],
                );

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
                $errors[] = new ImportRowErrorData(
                    row: $line['row'],
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
}
