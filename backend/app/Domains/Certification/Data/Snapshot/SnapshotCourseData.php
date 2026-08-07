<?php

namespace App\Domains\Certification\Data\Snapshot;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O curso como ele era no dia da emissão. Narrativa e temário congelam junto
 * (D-P9): o certificado reimpresso em 2028 descreve a atividade de 2026, não o
 * curso que o catálogo virou depois.
 */
#[TypeScript]
class SnapshotCourseData extends Data
{
    public function __construct(
        public string $name,
        public ?string $technical_name,
        public int $workload_hours,
        public ?string $description,
        /** @var list<SnapshotModuleData> */
        public array $modules,
    ) {}

    /** @param array<string, mixed>|null $raw */
    public static function fromArray(?array $raw): self
    {
        // Snapshot anterior ao D-P9 não tem `description` nem `modules`, e
        // snapshot com a chave em `null` é caso diferente de chave ausente —
        // foi um `modules: null` que derrubou o PDF em 500 (R-1). Escalar cai
        // no mesmo balde: `array_values` de um `string` é TypeError, e aqui
        // nenhum caminho pode estourar.
        $modules = data_get($raw, 'modules');
        $modules = is_array($modules) ? $modules : [];

        return new self(
            name: (string) data_get($raw, 'name', ''),
            technical_name: self::nullableString(data_get($raw, 'technical_name')),
            workload_hours: (int) data_get($raw, 'workload_hours', 0),
            description: self::nullableString(data_get($raw, 'description')),
            modules: array_map(
                fn (mixed $module) => SnapshotModuleData::fromArray(
                    is_array($module) ? $module : null,
                ),
                array_values($modules),
            ),
        );
    }

    private static function nullableString(mixed $value): ?string
    {
        return $value === null ? null : (string) $value;
    }
}
