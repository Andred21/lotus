<?php

namespace App\Domains\Identity\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\QueryBuilders\RedatorQueryBuilder;
use App\Domains\Operation\Models\Turma;
use App\Shared\Concerns\ArchivesChildren;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Validation\ValidationException;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Redator = professor. Extensão 1:1 do User via user_id. Documentos de
 * idoneidade (CV, REUF, título, pós) via relação polimórfica (files, ADR-10).
 */
class Redator extends Model implements Auditable
{
    use ArchivesChildren, AuditableTrait, SoftDeletes;

    protected $table = 'redatores';

    protected $fillable = ['user_id'];

    protected $auditInclude = ['user_id'];

    protected static function booted(): void
    {
        static::deleting(function (Redator $redator) {
            if (! $redator->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                //
                // ENUMERA-E-APAGA, logo check-then-act: a transação da
                // `ArchiveRedatorAction` é que dá atomicidade a esta cascata.
                // Não arquive redator por fora dela. O `lockRow` que ela toma
                // serializa arquivar contra arquivar, mas os escritores de
                // filho ainda não tomam o mesmo lock — a janela contra eles
                // segue aberta (pendência P-47).
                //
                // `markAndDelete` ignora filho já arquivado — `user()` é
                // `withTrashed()` e traria um User arquivado ANTES do redator
                // para dentro desta cascata (mesma armadilha do `Client`).
                $redator->documents()->get()->each(fn (File $f) => self::markAndDelete($f));

                if ($redator->user !== null) {
                    self::markAndDelete($redator->user);
                }
            }
        });

        static::restored(function (Redator $redator) {
            // `restored`, não `restoring`: os filhos saem ANTES do pai e voltam
            // DEPOIS dele. `onlyTrashed()` + a marca fazem voltar só quem ESTA
            // cascata arquivou.
            $redator->documents()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (File $f) => self::restoreAndUnmark($f));

            $user = $redator->user()->first();
            if ($user !== null && $user->trashed() && $user->archived_with_parent) {
                self::restoreAndUnmark($user);
            }
        });
    }

    public function user(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }

    /** Cursos que este redator está habilitado a ministrar (idoneidade). */
    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_redator')->withTimestamps();
    }

    /**
     * Turmas em que este redator está designado — inversa de `Turma::redatores()`.
     *
     * Identity aponta para Operation aqui pela mesma razão que `Student` já
     * aponta (`Student::enrollments()`): a pergunta "este redator tem trabalho
     * pendente?" é do arquivamento do redator, e um service em Operation só
     * empurraria a mesma travessia para outro lugar.
     *
     * SEM `withTrashed()`, ao contrário do lado de lá: turma arquivada não é
     * trabalho pendente e não pode bloquear o arquivamento do redator.
     */
    public function turmas(): BelongsToMany
    {
        return $this->belongsToMany(Turma::class, 'turma_redator')->withTimestamps();
    }

    /**
     * Trava a linha SEM julgar estado. `withTrashed()` porque o lock tem de ser
     * tomado mesmo sobre redator arquivado — é o estado de quem vai ser
     * restaurado, e pular a linha faria a operação seguir SEM mutex nenhum.
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     * Molde: `Client::lockRow()`.
     */
    public static function lockRow(int $redatorId): static
    {
        /** @var static $redator */
        $redator = static::withTrashed()->whereKey($redatorId)->lockForUpdate()->firstOrFail();

        return $redator;
    }

    /**
     * Trava a linha E RECUSA redator arquivado. Ver `Turma::lockForWrite()` e
     * o molde `Client::lockForWrite()` — a diferença para o `lockRow()` cru é a
     * recusa, e é ela que fecha a P-49.
     */
    public static function lockForWrite(int $redatorId): static
    {
        $redator = static::lockRow($redatorId);

        if ($redator->trashed()) {
            throw ValidationException::withMessages([
                'redator' => __('identity.errors.redator_archived'),
            ]);
        }

        return $redator;
    }

    /**
     * Contraparte de instância do `withListingData()` — mesmo molde de `Client`,
     * `Course` e `Turma`. É daqui que o controller e a `RestoreRedatorAction`
     * carregam, e por isso a carga da projeção tem um dono só.
     */
    public function loadListingData(): static
    {
        return $this->load(RedatorQueryBuilder::LISTING);
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): RedatorQueryBuilder
    {
        return new RedatorQueryBuilder($query);
    }
}
