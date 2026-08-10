<?php

namespace App\Domains\Operation\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\QueryBuilders\TurmaQueryBuilder;
use App\Shared\Data\ContratanteData;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Validation\ValidationException;
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
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Quote::class)->withTrashed();
    }

    public function course(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Course::class)->withTrashed();
    }

    public function redatores(): BelongsToMany
    {
        return $this->belongsToMany(Redator::class, 'turma_redator')->withTimestamps();
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }

    /**
     * Os documentos que a RN-16 exige — `files()` restrita aos tipos do
     * `TurmaDocumentType`. Relação NOMEADA e não `whereIn` solto por dois
     * motivos: a pergunta tinha duas cópias (o service da habilitação e a
     * listagem de documentos), e `with()`/`LISTING` só aceitam nome de relação
     * — é o que deixa a documentação obrigatória entrar no eager-load da
     * listagem e matar o N+1. Soft-delete fica de fora pelo default do
     * `morphMany`: doc arquivada não conta (RN-16).
     */
    public function documentacaoObrigatoria(): MorphMany
    {
        return $this->files()->whereIn('type', array_column(TurmaDocumentType::cases(), 'value'));
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /** A travessia da cadeia comercial mora AQUI (e a catraca garante). */
    public function contratanteClient(): Client
    {
        return $this->quote->budget->client;
    }

    public function contratante(): ContratanteData
    {
        return $this->contratanteClient()->contratante();
    }

    /**
     * RN-15 — blindagem: turma concluída não aceita mais escrita acadêmica.
     * TODO caminho de escrita acadêmica chama isto: docs da turma (6d) e o
     * futuro endpoint de notas/presença (sprint do redator). Matrícula já é
     * bloqueada pelo gate "só em andamento" do 6c.
     */
    public function assertAcademicallyWritable(): void
    {
        if ($this->status === TurmaStatus::Concluida) {
            throw ValidationException::withMessages([
                'turma' => 'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            ]);
        }
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): TurmaQueryBuilder
    {
        return new TurmaQueryBuilder($query);
    }
}
