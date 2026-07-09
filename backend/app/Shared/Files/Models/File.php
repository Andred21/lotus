<?php

namespace App\Shared\Files\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Arquivo polimórfico (S3). Um único registro central; o dono é resolvido
 * via morph map (ADR-10). Foto de perfil NÃO usa esta tabela (coluna
 * users.photo_path).
 */
class File extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $auditInclude = [
        'fileable_type', 'fileable_id', 'type', 'path', 'valid_until',
    ];

    protected $fillable = [
        'fileable_type',
        'fileable_id',
        'type',
        'path',
        'original_name',
        'mime',
        'size',
        'valid_until',
    ];

    protected $casts = [
        'valid_until' => 'date',
        'size'        => 'integer',
    ];

    public function fileable(): MorphTo
    {
        return $this->morphTo();
    }
}
