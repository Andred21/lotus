<?php

use App\Shared\Files\Models\File;
use Illuminate\Database\Migrations\Migration;

/**
 * O tipo de documento de turma `PRUEBAS` deixou de existir: as provas que a
 * Lotus anexava passam a ser a `EVALUACION_ALUNO` (bloco 60). Só `fileable_type
 * = 'turma'` — o arquivo de REDATOR com `type = 'PRUEBAS'` é de outro
 * vocabulário (`RedatorDocumentType`) e não se toca.
 *
 * Por MODEL e instância a instância, nunca `DB::table()->update()`: `files.type`
 * é dado com peso legal e só o Eloquent o audita (ADR-08, auditoria na
 * aplicação). `withTrashed()` porque o arquivo arquivado continua sendo rastro
 * — deixá-lo como `PRUEBAS` o faria um tipo que o enum não reconhece mais.
 * Idempotente: depois da primeira passada nenhuma linha casa com o filtro, então
 * rodar de novo não gera `UPDATE` nem audit.
 *
 * `down()` é no-op: as linhas convertidas se misturariam às que já nasceram
 * `EVALUACION_ALUNO`, e não há como separá-las sem adivinhar.
 */
return new class extends Migration
{
    public function up(): void
    {
        File::withTrashed()
            ->where('fileable_type', 'turma')
            ->where('type', 'PRUEBAS')
            ->each(function (File $file): void {
                $file->type = 'EVALUACION_ALUNO';
                $file->save();
            });
    }

    public function down(): void
    {
        // no-op: ver o docblock.
    }
};
