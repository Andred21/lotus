<?php

namespace App\Domains\Catalog\Http\Controllers;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Data\CourseRedatorData;
use App\Domains\Catalog\Models\Course;
use App\Http\Controllers\Controller;

/**
 * Habilitação (idoneidade) redator↔curso pelo lado do curso: define quais
 * redatores estão aptos a ministrar este curso. `sync` = substituição total.
 */
class CourseRedatorController extends Controller
{
    public function update(CourseRedatorData $data, Course $course): CourseData
    {
        $course->redatores()->sync($data->redator_ids);

        return CourseData::fromModel($course->load(['certificateTemplates', 'redatores']));
    }
}
