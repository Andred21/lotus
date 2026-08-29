<?php

namespace App\Domains\Identity\Models;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\QueryBuilders\StudentQueryBuilder;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Aluno = extensão 1:1 do User via user_id (type=aluno, is_active=false — não
 * autentica, RN-01). current_client_id é o ponteiro do vínculo aberto (mantido
 * pelo StudentClientLinkService); o histórico vive em student_client_logs.
 */
class Student extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = ['user_id', 'current_client_id'];

    protected $auditInclude = ['user_id', 'current_client_id'];

    protected static function booted(): void
    {
        static::deleting(function (Student $student) {
            if (! $student->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                $student->user?->delete();
            }
        });
    }

    public function user(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function currentClient(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Client::class, 'current_client_id')->withTrashed();
    }

    public function logs(): HasMany
    {
        return $this->hasMany(StudentClientLog::class);
    }

    /**
     * Matrículas do aluno. Identity aponta para Operation aqui pela mesma razão
     * que Catalog\Course aponta para Identity\Redator: a projeção de leitura do
     * aluno precisa do histórico, e um endpoint separado só empurraria a
     * composição para a tela.
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /** O vínculo vigente (ended_on IS NULL). No máximo 1 — garantido no banco. */
    public function openLog(): HasOne
    {
        return $this->hasOne(StudentClientLog::class)->whereNull('ended_on');
    }

    /**
     * Contraparte de instância do `withListingData()` — o mesmo molde de
     * `Turma`, `Certificate` e `Quote`. `store`/`update` projetam por aqui;
     * sem o `loadCount`, `StudentData::fromModel` recusa o `null` (D-B3).
     */
    public function loadListingData(): static
    {
        return $this->load(StudentQueryBuilder::LISTING)->loadCount('enrollments');
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): StudentQueryBuilder
    {
        return new StudentQueryBuilder($query);
    }
}
