<?php

namespace App\Shared\Audit;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use InvalidArgumentException;

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
     * **Contrato duro:** a coleção tem de vir de `onlyTrashed()`. Todo
     * registro precisa de `deleted_at`; um sem ele estoura
     * `InvalidArgumentException`, não `null` silencioso.
     *
     * @param  Collection<int, Model>  $registros  já materializados por uma query `onlyTrashed()`
     * @param  class-string<Model>  $model  tipo passado ao `ArchiveTrailQuery`
     * @param  Closure(Model, string, ?string): mixed  $montar  (registro, archived_at, archived_by)
     * @return list<mixed>
     *
     * @throws InvalidArgumentException se algum registro não estiver arquivado
     */
    public static function lista(Collection $registros, string $model, Closure $montar): array
    {
        $autores = ArchiveTrailQuery::archivedBy($model, $registros->pluck('id')->all());

        return $registros
            ->map(fn (Model $registro) => $montar(
                $registro,
                self::arquivadoEm($registro, $model),
                $autores[$registro->id] ?? null,
            ))
            ->values()
            ->all();
    }

    /**
     * O `deleted_at` do registro, ou um erro que diz o que fazer.
     *
     * `resolveArquivado()` aplica o `onlyTrashed()` ela mesma; `lista()`
     * recebe a coleção pronta e não pode. A assimetria deixava o chamador que
     * esquecesse o filtro levar `toIso8601String() on null` — erro que não
     * nomeia a causa (Q-5 do review de 2026-09-02).
     *
     * Filtrar em silêncio está fora: a visão de arquivados tem peso legal, e
     * sumir com um registro é pior que falhar alto.
     */
    private static function arquivadoEm(Model $registro, string $model): string
    {
        return $registro->deleted_at?->toIso8601String() ?? throw new InvalidArgumentException(
            "ArchivedListing::lista() recebeu {$model} #{$registro->getKey()} sem `deleted_at`: "
            .'a coleção precisa vir de uma query `onlyTrashed()`.'
        );
    }

    /**
     * O registro ARQUIVADO, ou 404.
     *
     * Resolvido à mão, não por route binding: o binding padrão aplica o global
     * scope de `SoftDeletes` e nunca acharia um arquivado. `onlyTrashed()`
     * também dá o 404 de graça sobre registro ATIVO, que é o comportamento da
     * spec D5. Este docblock existia copiado VERBATIM em 7 dos 8 controllers.
     *
     * A origem entra pronta, e por isso o parâmetro aceita `Relation`: o caso
     * aninhado passa `$turma->enrollments()`, e resolver sobre a MESMA relação
     * é o que mantém a posse declarada — matrícula de outra turma segue 404.
     *
     * @param  Builder<covariant Model>|Relation<Model, Model, mixed>  $origem
     */
    public static function resolveArquivado(Builder|Relation $origem, int $id): Model
    {
        return $origem->onlyTrashed()->whereKey($id)->firstOrFail();
    }
}
