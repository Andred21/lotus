<?php

namespace App\Domains\Commercial\Models;

use App\Shared\Support\Phone;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class ClientContact extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'client_id',
        'name',
        'email',
        'phone',
        'job_title',
        'is_primary',
    ];

    protected $auditInclude = [
        'client_id',
        'name',
        'email',
        'phone',
        'job_title',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'archived_with_parent' => 'boolean',
    ];

    /**
     * D-P2 (bloco 60): único ponto por tabela de verdade para o telefone e o
     * e-mail, porque várias Actions gravam estes campos sem passar pelo
     * provisioner. Telefone válido sai em E.164 e o inválido passa intacto (a
     * recusa é do `ValidPhone`, na borda); e-mail sai `trim` + minúsculas. O
     * mutator age só na ESCRITA do atributo, então o legado em caixa mista não
     * é reescrito por uma gravação que não o toca.
     *
     * @return Attribute<string|null, string|null>
     */
    protected function phone(): Attribute
    {
        return Attribute::make(set: fn (?string $value) => Phone::normalizar($value));
    }

    /** @return Attribute<string|null, string|null> D-P2: ver `phone()`. */
    protected function email(): Attribute
    {
        return Attribute::make(set: fn (?string $value) => $value === null ? null : mb_strtolower(trim($value)));
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
