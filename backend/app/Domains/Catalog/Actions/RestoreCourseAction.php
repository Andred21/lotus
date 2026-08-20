<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Models\Course;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o curso e, pelo hook `restored` do model, os filhos que a cascata
 * marcou.
 *
 * SEM lock, e isto é simétrico e deliberado: `Course` não tem mutex no lado do
 * delete tampouco. Dar um só ao restore criaria a ilusão de proteção sobre uma
 * janela que continua aberta no arquivamento. A assimetria com `Client` é do
 * código que já existe, não deste bloco.
 */
class RestoreCourseAction
{
    public function execute(Course $course): Course
    {
        return DB::transaction(function () use ($course) {
            if (! $course->trashed()) {
                return $course->loadListingData();
            }

            $course->restore();

            return $course->loadListingData();
        });
    }
}
