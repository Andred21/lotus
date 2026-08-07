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
