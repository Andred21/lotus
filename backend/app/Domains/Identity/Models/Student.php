<?php

namespace App\Domains\Identity\Models;

use App\Domains\Commercial\Models\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
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
        return $this->belongsTo(User::class);
    }

    public function currentClient(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'current_client_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(StudentClientLog::class);
    }

    /** O vínculo vigente (ended_on IS NULL). No máximo 1 — garantido no banco. */
    public function openLog(): HasOne
    {
        return $this->hasOne(StudentClientLog::class)->whereNull('ended_on');
    }
}
