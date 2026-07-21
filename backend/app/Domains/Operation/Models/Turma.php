<?php

namespace App\Domains\Operation\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Turma = instância operacional de um curso, nascida de uma cotação aprovada
 * (1:1). Um ou mais redatores via pivot `turma_redator` (N:N). `files()` para o
 * manual futuro (morph key `turma`, já registrada no morph map).
 */
class Turma extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'quote_id', 'course_id', 'modalidade', 'local_aplicacao',
        'start_date', 'end_date', 'status',
    ];

    protected $auditInclude = [
        'quote_id', 'course_id', 'modalidade', 'local_aplicacao',
        'start_date', 'end_date', 'status', 'concluded_at',
    ];

    protected $casts = [
        'modalidade' => TurmaModalidade::class,
        'status' => TurmaStatus::class,
        'start_date' => 'date',
        'end_date' => 'date',
        'concluded_at' => 'datetime',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function redatores(): BelongsToMany
    {
        return $this->belongsToMany(Redator::class, 'turma_redator')->withTimestamps();
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }
}
