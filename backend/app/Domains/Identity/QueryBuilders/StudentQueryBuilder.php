<?php

namespace App\Domains\Identity\QueryBuilders;

use App\Shared\Pagination\Paginates;
use Illuminate\Database\Eloquent\Builder;

/**
 * O primeiro builder de `Student` — o único dos três agregados que paginam
 * sem builder. Nasce aqui porque a ordenação por nome saía de um `sortBy` em
 * PHP sobre a coleção inteira (`StudentController::index`, medido em
 * 2026-08-28), o que não sobrevive a uma página.
 *
 * O join em `users` é o que dá `ORDER BY users.name` e a busca por nome/RUT.
 * Sem condição sobre `users.deleted_at` de propósito: `Student::user()` é
 * `withTrashed()` (arquivamento não apaga, lição 16), e o escopo de
 * `SoftDeletes` do próprio Student qualifica `students.deleted_at` sozinho.
 *
 * ORDEM IMPORTA em `withListingData()`: `select('students.*')` vem ANTES de
 * `withCount` — `withAggregate` só põe `students.*` quando ainda não há
 * coluna, e um `select` depois dele apagaria o sub-select da contagem.
 */
class StudentQueryBuilder extends Builder
{
    use Paginates;

    public const LISTING = ['user', 'currentClient'];

    public const SORTABLE = [
        'name' => 'users.name',
        'rut' => 'users.rut',
    ];

    public const DEFAULT_SORT = 'name';

    public function withListingData(): static
    {
        return $this
            ->join('users', 'users.id', '=', 'students.user_id')
            ->select('students.*')
            ->with(self::LISTING)
            ->withCount('enrollments');
    }

    /**
     * Nome casa pelo termo como veio. O RUT casa pela forma sem pontuação nos
     * dois lados: gravado é `12.345.678-5`, mas quem busca digita `12345678`,
     * `12.345.678` ou `123456785`. `REPLACE` encadeado roda igual em MySQL e
     * em sqlite; só entra quando o termo, limpo de `.`, `-` e espaço, é dígito
     * (mais um `k`/`K` final) — texto qualquer cai na comparação de antes.
     */
    public function searchable(string $q): static
    {
        $like = '%'.addcslashes($q, '%_\\').'%';
        $clean = preg_replace('/[.\-\s]/', '', $q) ?? '';
        $rutLike = '%'.$clean.'%';

        return $this->where(function (Builder $w) use ($like, $clean, $rutLike) {
            $w->where('users.name', 'like', $like);

            if (preg_match('/^\d+[kK]?$/', $clean) === 1) {
                $w->orWhereRaw("REPLACE(REPLACE(users.rut, '.', ''), '-', '') LIKE ?", [$rutLike]);
            } else {
                $w->orWhere('users.rut', 'like', $like);
            }
        });
    }
}
