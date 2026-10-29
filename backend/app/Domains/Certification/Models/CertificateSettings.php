<?php

namespace App\Domains\Certification\Models;

use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Configuração de certificados (spec D3/D5 do bloco 40): a gerente que assina
 * todo certificado, com nome, cargo e imagem de assinatura. Singleton — uma
 * linha só, criada pela migration; não há criação nem exclusão pela aplicação.
 *
 * Sem `SoftDeletes` de propósito: a linha nunca sai. A imagem é um `File`
 * (polimórfico) do tipo {@see self::TIPO_FIRMA}; trocar ou remover soft-deleta
 * o `File` anterior, e o binário fica no bucket.
 */
class CertificateSettings extends Model implements Auditable
{
    use AuditableTrait;

    /** `files.type` da assinatura da gerente. */
    public const TIPO_FIRMA = 'FIRMA_GERENTE';

    protected $table = 'certificate_settings';

    protected $fillable = ['manager_name', 'manager_title'];

    protected $auditInclude = ['manager_name', 'manager_title'];

    /** A linha única. `firstOrFail`: sem ela a migration não rodou, e é erro, não "vazio". */
    public static function atual(): self
    {
        return static::query()->firstOrFail();
    }

    /**
     * Todos os arquivos de assinatura ainda não apagados — o que as Actions
     * soft-deletam ao trocar ou remover.
     */
    public function firmas(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable')
            ->where('type', self::TIPO_FIRMA);
    }

    /**
     * A assinatura vigente: o `File` `FIRMA_GERENTE` não apagado de maior `id`.
     *
     * O filtro tem de entrar na SUBQUERY do MAX (closure do `ofMany`), não só na
     * query externa: sem isso o MAX(id) sai de TODOS os `files` da configuração
     * e um arquivo posterior (de outro tipo, ou apagado) faz a assinatura sumir.
     */
    public function signature(): MorphOne
    {
        return $this->morphOne(File::class, 'fileable')
            ->ofMany(['id' => 'max'], fn ($q) => $q
                ->where('type', self::TIPO_FIRMA)
                ->whereNull('deleted_at'));
    }
}
