<?php

namespace App\Domains\Certification\Casts;

use App\Domains\Certification\Data\Snapshot\CertificateSnapshotData;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * `snapshot` entra e sai como `CertificateSnapshotData`. A coluna segue JSON —
 * o que muda é que ninguém mais lê o documento congelado por chave de array.
 *
 * A escrita aceita array crua de propósito: é assim que o teste simula
 * snapshot da versão 1, gravado antes de o tipo existir.
 *
 * @implements CastsAttributes<CertificateSnapshotData, CertificateSnapshotData|array<string, mixed>>
 */
class CertificateSnapshotCast implements CastsAttributes
{
    /**
     * O Eloquent guarda o objeto devolvido pelo `get()` no cache de casts do
     * model, e `save()` chama `mergeAttributesFromCachedCasts()` ANTES de
     * gravar: o DTO em cache volta pela `set()` e reescreve a coluna. Bastava
     * ler o snapshot e salvar qualquer outro campo — revogar, por exemplo —
     * para o documento congelado ser reserializado na forma de HOJE: um
     * snapshot da versão 1 perdia o `layout_config`, recebia o `emissor` da
     * config atual e saía carimbado com `schema_version` errado.
     *
     * Sem cache, cada leitura reconstrói o DTO a partir da coluna e nenhum
     * `save()` reescreve o que ninguém atribuiu. O custo é decodificar o JSON
     * por acesso; o documento é histórico e não se conserta depois de emitido.
     */
    public bool $withoutObjectCaching = true;

    public function get(Model $model, string $key, mixed $value, array $attributes): CertificateSnapshotData
    {
        $decoded = is_string($value) ? json_decode($value, true) : $value;

        return CertificateSnapshotData::fromArray(is_array($decoded) ? $decoded : null);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): array
    {
        $snapshot = $value instanceof CertificateSnapshotData
            ? $value->toArray()
            : $value;

        return [$key => json_encode($snapshot, JSON_UNESCAPED_UNICODE)];
    }
}
