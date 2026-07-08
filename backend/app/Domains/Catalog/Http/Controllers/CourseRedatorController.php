<?php

namespace App\Domains\Catalog\Http\Controllers;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Habilitação (idoneidade) redator↔curso pelo lado do curso: define quais
 * redatores estão aptos a ministrar este curso. `sync` = substituição total.
 */
class CourseRedatorController extends Controller
{
    public function update(Request $request, Course $course): CourseData
    {
        $validated = $request->validate([
            'redator_ids' => ['present', 'array'],
            'redator_ids.*' => ['integer', 'exists:redatores,id'],
        ]);

        $course->redatores()->sync($validated['redator_ids']);

        return CourseData::fromModel($course->load(['certificateTemplates', 'redatores']));
    }
}
