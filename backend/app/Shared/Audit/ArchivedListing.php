<?php

namespace App\Shared\Audit;

use Closure;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * A projeção da visão de Arquivados, uma vez em vez de oito.
 *
 * Oito controllers repetiam a MESMA sequência — `pluck('id')`,
 * `ArchiveTrailQuery::archivedBy`, `map`, `deleted_at->toIso8601String()`,
 * `$autores[$id] ?? null` — e só o DTO de saída variava.
 *
 * NÃO é Repository (lei §5.1, ADR-02): não constrói query, não conhece
 * agregado e não tem método por entidade. Recebe o resultado que o Eloquent já
 * materializou e o projeta. A query de cada agregado continua no controller,
 * porque elas divergem de verdade — `Turma` pagina e filtra por `visibleTo`,
 * `User` não tem builder, `Enrollment` ordena por nome do aluno.
 */
class ArchivedListing
{
    /**
     * Projeta a listagem de arquivados de um agregado.
     *
     * @param  Collection<int, Model>  $registros  já materializados pela query do agregado
     * @param  class-string<Model>  $model  tipo passado ao `ArchiveTrailQuery`
     * @param  Closure(Model, string, ?string): mixed  $montar  (registro, archived_at, archived_by)
     * @return list<mixed>
     */
    public static function lista(Collection $registros, string $model, Closure $montar): array
    {
        $autores = ArchiveTrailQuery::archivedBy($model, $registros->pluck('id')->all());

        return $registros
            ->map(fn (Model $registro) => $montar(
                $registro,
                $registro->deleted_at->toIso8601String(),
                $autores[$registro->id] ?? null,
            ))
            ->values()
            ->all();
    }
}
