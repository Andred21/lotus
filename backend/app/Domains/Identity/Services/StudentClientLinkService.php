<?php

namespace App\Domains\Identity\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Enums\LinkOutcome;
use App\Domains\Identity\Models\Student;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Fonte única do invariante RN-10 (1 cliente por aluno por vez, com histórico).
 * Nenhum outro caminho escreve student_client_logs nem students.current_client_id.
 */
class StudentClientLinkService
{
    public function link(Student $student, Client $client): LinkOutcome
    {
        return DB::transaction(function () use ($student, $client) {
            $open = $student->openLog()->first();

            if ($open !== null && (int) $open->client_id === $client->id) {
                return LinkOutcome::AlreadyLinked;
            }

            $today = Carbon::today();

            if ($open !== null) {
                $open->ended_on = $today;
                $open->save();
            }

            $student->logs()->create([
                'client_id' => $client->id,
                'started_on' => $today,
                'ended_on' => null,
            ]);

            $student->current_client_id = $client->id;
            $student->save();

            return $open !== null ? LinkOutcome::Moved : LinkOutcome::Linked;
        });
    }
}
