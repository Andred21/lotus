<?php

namespace App\Domains\Certification\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Casts\CertificateSnapshotCast;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\QueryBuilders\CertificateQueryBuilder;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Query\Builder as QueryBuilder;
use OwenIt\Auditing\Auditable;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;

class Certificate extends Model implements AuditableContract
{
    use Auditable;

    protected $fillable = [
        'uuid',
        'enrollment_id',
        'course_id',
        'redator_id',
        'codigo',
        'snapshot',
        'valido_ate',
        'status',
        'revoked_at',
        'revocation_reason',
    ];

    protected $auditInclude = [
        'uuid',
        'enrollment_id',
        'course_id',
        'redator_id',
        'codigo',
        'snapshot',
        'valido_ate',
        'status',
        'revoked_at',
        'revocation_reason',
    ];

    protected $casts = [
        'snapshot' => CertificateSnapshotCast::class,
        'valido_ate' => 'date',
        'revoked_at' => 'datetime',
        'status' => CertificateStatus::class,
    ];

    /**
     * "Certificado emitido", uma definição só. Revogado deixou de ser um
     * certificado emitido — quem conta emissão (série, ranking, histórico do
     * redator) pergunta por aqui, e não escreve o `where` de novo. Antes do
     * review de 2026-08-14 o mesmo rótulo saía com dois números no mesmo
     * payload (Q-5).
     *
     * @param  Builder<self>  $query
     */
    public function scopeEmitidos(Builder $query): void
    {
        $query->where('status', CertificateStatus::Emitido);
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class)->withTrashed();
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class)->withTrashed();
    }

    public function redator(): BelongsTo
    {
        return $this->belongsTo(Redator::class)->withTrashed();
    }

    /** Contraparte de instância do `withListingData()` — mesmo molde do Turma. */
    public function loadListingData(): static
    {
        return $this->load(CertificateQueryBuilder::LISTING);
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): CertificateQueryBuilder
    {
        return new CertificateQueryBuilder($query);
    }
}
