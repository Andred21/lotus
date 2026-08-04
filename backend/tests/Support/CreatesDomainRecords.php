<?php

namespace Tests\Support;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;

/**
 * Setup repetido em três ou mais cenários (H.4.9). Só entra aqui o que foi
 * MEDIDO como repetição: o cliente com usuário da RN-01 (43 arquivos) e o curso
 * descartável (34). Budget, Quote e Turma ficam de fora de propósito — têm pai
 * obrigatório e o valor criado costuma ser a própria regra sob teste, então
 * extraí-los esconderia a regra (spec D8).
 *
 * Todo método aceita override porque o dado às vezes É a asserção (spec D9).
 */
trait CreatesDomainRecords
{
    /**
     * Cliente com o User inativo que a RN-01 exige (cliente não loga).
     *
     * `$userOverrides` alcança o User, não só o Client. Sem ele, todo teste que
     * precisava fixar um `rut` remendava depois com `$client->user()->update()`
     * — mass update no query builder, que não dispara evento em model
     * `Auditable` (ADR-08, lição 5) e ainda fazia o User nascer com `rut` nulo.
     * Eram 11 sítios (review de 2026-08-04, Q-4).
     */
    protected function makeClientWithUser(array $overrides = [], array $userOverrides = []): Client
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false, ...$userOverrides])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client', ...$overrides]);
    }

    /** Curso sem significado próprio, quando o teste só precisa de um id de
     * curso válido. Carga horária que É a regra medida passa por override. */
    protected function makeCourse(array $overrides = []): Course
    {
        return Course::create(['name' => 'C', 'workload_hours' => 8, ...$overrides]);
    }
}
