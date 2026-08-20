<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Models\Course;
use Illuminate\Support\Facades\DB;

/**
 * Arquiva o curso (soft-delete) cascateando para módulos e templates, que é o
 * que o hook `deleting` do model faz.
 *
 * Existe pela mesma razão da `DeleteClientAction`: o hook ENUMERA-E-APAGA, um
 * `delete()` por instância, e sem transação cada statement autocommita — uma
 * falha no meio deixa curso ATIVO com módulos arquivados. O caminho era
 * inalcançável pela interface até este bloco lhe dar o primeiro botão (spec
 * D9), e foi isso que tornou a janela real (Q-5 do review de 2026-08-18).
 *
 * SEM lock, ao contrário de `Client`: a spec D3 mediu que `Course` não tem
 * gate nem escrita concorrente de filhos por Action própria. A simetria que
 * importa aqui é com a `RestoreCourseAction`, que também é transacional e
 * também dispensa mutex.
 */
class ArchiveCourseAction
{
    public function execute(Course $course): void
    {
        DB::transaction(function () use ($course) {
            $course->delete();
        });
    }
}
